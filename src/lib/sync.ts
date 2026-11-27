// Keeps shared trees in step between this device and the database.
//
// - Every tree keeps its local copy (in `trees`, saved in localStorage), so the app opens
//   instantly and works offline.
// - Local edits are diffed person-by-person against what the server last confirmed (`shadow`),
//   queued (queue survives reloads), and sent in small batches.
// - Changes from other members arrive live (Supabase Realtime) and are applied without
//   touching your undo history, so Undo only undoes your own edits.
// - Last write wins per person; edits to different people never clash.
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useStore, type TreeDoc } from '../store';
import type { Person } from '../types';
import { fullName } from './graph';
import * as cloud from './cloud';

const QKEY = 'oft-sync-queue';
type Queue = Record<string, { up: Record<string, Person>; del: string[] }>;
let queue: Queue = (() => { try { return JSON.parse(localStorage.getItem(QKEY) || '{}'); } catch { return {}; } })();
const saveQueue = () => { try { localStorage.setItem(QKEY, JSON.stringify(queue)); } catch { /* storage full: the queue still lives in memory */ } };
const pendingCount = (cid: string) => (queue[cid] ? Object.keys(queue[cid].up).length + queue[cid].del.length : 0);

let active: { localId: string; cloudId: string; channel: RealtimeChannel | null; names: Map<string, string>; ready: boolean } | null = null;
let shadow = new Map<string, string>();
let applyingRemote = false;
let flushTimer: ReturnType<typeof setTimeout> | undefined;
let retryTimer: ReturnType<typeof setTimeout> | undefined;

const st = () => useStore.getState();
const setSync = (p: Partial<ReturnType<typeof st>['sync']>) => useStore.setState({ sync: { ...st().sync, ...p } });
const activeTree = () => st().trees.find((t) => t.id === st().activeTreeId);
const json = (p: Person) => JSON.stringify(p);

/** Apply a change that came from the server, without recording it as an undoable local edit. */
function applyRemote(mut: (people: Person[]) => Person[]) {
  applyingRemote = true;
  try {
    const s = st();
    useStore.setState({ people: mut(s.people), past: s.past.map(mut) });
  } finally { applyingRemote = false; }
}

/** Server copy + anything still waiting to be sent from this device. */
function merged(server: Person[], cid: string): Person[] {
  const q = queue[cid];
  if (!q) return server;
  const dels = new Set(q.del);
  const byId = new Map(server.filter((p) => !dels.has(p.id)).map((p) => [p.id, p]));
  for (const p of Object.values(q.up)) byId.set(p.id, p);
  return [...byId.values()];
}

async function attach(t: TreeDoc | undefined) {
  detach();
  if (!t?.cloud || !st().user) { setSync({ status: 'local', pending: 0, error: undefined }); return; }
  const cid = t.cloud.id;
  active = { localId: t.id, cloudId: cid, channel: null, names: new Map(), ready: false };
  setSync({ status: 'loading', pending: pendingCount(cid), error: undefined });
  await refresh();
  if (!active || active.cloudId !== cid) return;
  active.channel = cloud.sb()
    .channel(`tree-${cid}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'people', filter: `tree_id=eq.${cid}` }, (msg) => onRemote(msg.new as { id: string; data: Person; deleted: boolean; updated_by: string | null }))
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'trees', filter: `id=eq.${cid}` }, (msg) => {
      const name = (msg.new as { name: string }).name;
      applyingRemote = true;
      try { useStore.setState({ trees: st().trees.map((x) => (x.cloud?.id === cid ? { ...x, name } : x)) }); } finally { applyingRemote = false; }
    })
    .subscribe((status) => { if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setSync({ status: navigator.onLine ? 'error' : 'offline' }); });
}

function detach() {
  if (active?.channel) cloud.sb().removeChannel(active.channel);
  active = null;
  shadow = new Map();
}

/** Re-read the whole tree from the server (on open, on reconnect, when the app comes back to the foreground). */
async function refresh() {
  if (!active) return;
  const { cloudId } = active;
  try {
    const [server, members] = await Promise.all([cloud.fetchPeople(cloudId), cloud.listMembers(cloudId)]);
    if (!active || active.cloudId !== cloudId) return;
    active.names = new Map(members.map((m) => [m.user_id, m.display_name || m.email?.split('@')[0] || 'Someone']));
    shadow = new Map(server.map((p) => [p.id, json(p)]));
    active.ready = true;
    const people = merged(server, cloudId);
    applyingRemote = true;
    try {
      const s = st();
      const focusId = people.some((p) => p.id === s.focusId) ? s.focusId : people[0]?.id ?? '';
      useStore.setState({ people, focusId, selectedId: s.selectedId && people.some((p) => p.id === s.selectedId) ? s.selectedId : null });
    } finally { applyingRemote = false; }
    setSync({ status: pendingCount(cloudId) ? 'saving' : 'synced', pending: pendingCount(cloudId), error: undefined });
    if (pendingCount(cloudId)) flush();
  } catch (e) {
    setSync({ status: navigator.onLine ? 'error' : 'offline', error: (e as Error).message });
  }
}

function onRemote(row: { id: string; data: Person; deleted: boolean; updated_by: string | null }) {
  if (!active?.ready || !row?.id) return;
  const q = queue[active.cloudId];
  if (q && (q.up[row.id] || q.del.includes(row.id))) return; // our newer edit is on its way
  const had = st().people.find((p) => p.id === row.id);
  if (row.deleted) {
    shadow.delete(row.id);
    if (!had) return;
    applyRemote((ps) => ps.filter((p) => p.id !== row.id));
  } else {
    const s = json(row.data);
    if (shadow.get(row.id) === s && had && json(had) === s) return; // our own change echoing back
    shadow.set(row.id, s);
    applyRemote((ps) => (ps.some((p) => p.id === row.id) ? ps.map((p) => (p.id === row.id ? row.data : p)) : [...ps, row.data]));
  }
  if (row.updated_by && row.updated_by !== st().user?.id) {
    const who = active.names.get(row.updated_by) ?? 'Someone';
    const name = fullName(row.deleted ? had! : row.data);
    st().notify(row.deleted ? `${who} removed ${name}` : had ? `${who} updated ${name}` : `${who} added ${name}`);
  }
}

/** Compare the working copy with what the server has and queue the differences. */
function queueLocalChanges(people: Person[]) {
  if (!active?.ready) return; // still loading: the server copy is about to replace the working copy
  const cid = active.cloudId;
  const q = (queue[cid] ??= { up: {}, del: [] });
  const ids = new Set<string>();
  for (const p of people) {
    ids.add(p.id);
    const s = json(p);
    if (shadow.get(p.id) !== s) { q.up[p.id] = p; q.del = q.del.filter((d) => d !== p.id); shadow.set(p.id, s); }
  }
  for (const id of [...shadow.keys()]) if (!ids.has(id)) { shadow.delete(id); delete q.up[id]; if (!q.del.includes(id)) q.del.push(id); }
  saveQueue();
  if (pendingCount(cid)) { setSync({ status: 'saving', pending: pendingCount(cid) }); clearTimeout(flushTimer); flushTimer = setTimeout(flush, 500); }
}

let flushing = false;
async function flush() {
  if (!active || flushing) return;
  const cid = active.cloudId;
  const q = queue[cid];
  if (!q || !pendingCount(cid)) { setSync({ status: 'synced', pending: 0 }); return; }
  if (!navigator.onLine) { setSync({ status: 'offline', pending: pendingCount(cid) }); return; }
  flushing = true;
  const up = Object.values(q.up), del = [...q.del];
  try {
    await cloud.upsertPeople(cid, up);
    await cloud.deletePeople(cid, del);
    // drop what was sent, unless it changed again meanwhile
    for (const p of up) if (q.up[p.id] === p) delete q.up[p.id];
    q.del = q.del.filter((d) => !del.includes(d));
    if (!pendingCount(cid)) delete queue[cid];
    saveQueue();
    setSync({ status: pendingCount(cid) ? 'saving' : 'synced', pending: pendingCount(cid), error: undefined });
  } catch (e) {
    setSync({ status: navigator.onLine ? 'error' : 'offline', pending: pendingCount(cid), error: (e as Error).message });
    clearTimeout(retryTimer); retryTimer = setTimeout(flush, 15_000);
  } finally {
    flushing = false;
  }
  if (active?.cloudId === cid && pendingCount(cid) && st().sync.status === 'saving') flush();
}

/** Bring the list of shared trees on this device up to date with the account's memberships. */
export async function refreshTreeList() {
  const user = st().user;
  if (!user) return;
  const mine = await cloud.listMyTrees(user.id);
  const byCloud = new Map(mine.map((c) => [c.id, c]));
  const trees: TreeDoc[] = [];
  const lost: string[] = [];
  for (const t of st().trees) {
    if (!t.cloud) { trees.push(t); continue; }
    const c = byCloud.get(t.cloud.id);
    if (c) { trees.push({ ...t, name: c.name, cloud: { id: c.id, role: c.role } }); byCloud.delete(c.id); }
    else { trees.push({ ...t, cloud: undefined, name: `${t.name} (offline copy)` }); lost.push(t.name); }
  }
  for (const c of byCloud.values()) {
    const people = await cloud.fetchPeople(c.id).catch(() => [] as Person[]);
    trees.push({ id: 'c_' + c.id, name: c.name, people, focusId: c.focus_id && people.some((p) => p.id === c.focus_id) ? c.focus_id : people[0]?.id ?? '', asked: {}, capsules: [], updatedAt: new Date().toISOString(), cloud: { id: c.id, role: c.role } });
  }
  applyingRemote = true;
  try { useStore.setState({ trees }); } finally { applyingRemote = false; }
  if (lost.length) st().notify(`You no longer have access to ${lost.join(', ')}. A copy stays on this device.`);
  const t = activeTree();
  if (t?.cloud && active?.cloudId !== t.cloud.id) attach(t);
  else if (!t?.cloud && active) attach(t);
}

/** Make the active local tree a shared one, owned by you. */
export async function shareActiveTree() {
  const s = st();
  const t = activeTree();
  if (!t || !s.user || t.cloud) return;
  const cid = await cloud.createCloudTree(t.name, s.focusId, s.user.name);
  await cloud.upsertPeople(cid, s.people);
  applyingRemote = true;
  try { useStore.setState({ trees: st().trees.map((x) => (x.id === t.id ? { ...x, cloud: { id: cid, role: 'owner' } } : x)) }); } finally { applyingRemote = false; }
  await attach(activeTree());
}

/** Open a shared tree after joining it. */
export async function openCloudTree(cloudId: string) {
  await refreshTreeList();
  const t = st().trees.find((x) => x.cloud?.id === cloudId);
  if (t) st().switchTree(t.id);
}

export const syncNow = () => { if (active) { refresh(); flush(); } };

let started = false;
/** Wire the sync engine to the store and the account. Call once at start-up. */
export function startSync() {
  if (started || !cloud.cloudEnabled()) return;
  started = true;

  const onSession = (u: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null | undefined) => {
    const prev = st().user;
    const user = u ? { id: u.id, email: u.email ?? '', name: cloud.nameOf(u as never) } : null;
    if (prev?.id === user?.id && prev?.name === user?.name) return;
    useStore.setState({ user });
    if (user) refreshTreeList().catch((e) => setSync({ status: 'error', error: (e as Error).message }));
    else attach(undefined);
  };
  cloud.sb().auth.getSession().then(({ data }) => onSession(data.session?.user));
  cloud.sb().auth.onAuthStateChange((_e, session) => setTimeout(() => onSession(session?.user), 0));

  useStore.subscribe((s, prev) => {
    if (applyingRemote) return;
    if (s.activeTreeId !== prev.activeTreeId) { attach(activeTree()); return; }
    const t = s.trees.find((x) => x.id === s.activeTreeId);
    if (!t?.cloud || !active || active.localId !== t.id) return;
    if (s.people !== prev.people) queueLocalChanges(s.people);
    const before = prev.trees.find((x) => x.id === t.id);
    if (before && before.name !== t.name && t.cloud.role !== 'viewer') cloud.renameCloudTree(t.cloud.id, t.name).catch(() => st().notify('Could not rename the shared tree'));
  });

  window.addEventListener('online', syncNow);
  window.addEventListener('offline', () => { if (active) setSync({ status: 'offline' }); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') syncNow(); });
}
