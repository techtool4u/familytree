import { create } from 'zustand';
import { useMemo } from 'react';
import type { Person, ViewId, ColorMode, Filters, MediaItem, Capsule } from './types';
import { buildSample, SAMPLE_FOCUS, SAMPLE_CAPSULES } from './data/sample';
import { setCustomPlaces, type Place } from './data/places';
import { buildIndex, generations, computeBranches, matchSet, makeColorer, uid } from './lib/graph';

export const DEFAULT_FILTERS: Filters = {
  text: '', scope: 'all', genMin: -99, genMax: 99, yearMin: 0, yearMax: 9999,
  status: 'all', gender: 'all', surnames: [], countries: [], branches: [], tags: [], aliveIn: null, mode: 'highlight',
};

/** One saved family tree. The active tree's data lives in `people`/`focusId`/`asked`; the rest wait here. */
export interface TreeDoc { id: string; name: string; people: Person[]; focusId: string; asked: Record<string, string[]>; capsules?: Capsule[]; updatedAt: string }

export type Relation = 'parent' | 'child' | 'spouse' | 'sibling';
export type EditState = { personId?: string; relativeOf?: string; relation?: Relation } | null;

interface State {
  people: Person[];
  focusId: string;
  selectedId: string | null;
  view: ViewId;
  colorMode: ColorMode;
  filters: Filters;
  theme: 'light' | 'dark';
  path: string[] | null;
  filtersOpen: boolean;
  /** the docked “How are they related?” bar: who is being compared, and which slot a click on the tree fills */
  relPair: { a: string; b: string | null } | null;
  relSlot: 'a' | 'b';
  openRelation: (b?: string) => void;
  paletteOpen: boolean;
  edit: EditState;
  toast: string | null;
  toastUndo: boolean;
  /** previous versions of `people` for undo (newest last) */
  past: Person[][];
  undo: () => void;
  centerReq: { id: string; n: number } | null;
  /** questions already sent to each person: personId → questionIds */
  asked: Record<string, string[]>;
  interview: { personId: string; question: string; questionId: string } | null;
  timeYear: number | null;
  trees: TreeDoc[];
  capsules: Capsule[];
  capsuleUI: { mode: 'write'; toId?: string } | { mode: 'read'; id: string } | null;
  spotlight: { ids: string[]; label: string } | null;
  addCapsule: (c: Capsule) => void;
  openCapsule: (id: string) => void;
  deleteCapsule: (id: string) => void;
  activeTreeId: string;
  newTreeOpen: boolean;
  customPlaces: Place[];
  addPlace: (pl: Place) => void;
  set: (p: Partial<State>) => void;
  setFilters: (p: Partial<Filters>) => void;
  select: (id: string | null, center?: boolean) => void;
  setFocus: (id: string) => void;
  upsert: (p: Person) => void;
  addRelative: (baseId: string, rel: Relation, p: Person) => void;
  remove: (id: string) => void;
  importPeople: (ps: Person[], focus?: string, name?: string) => void;
  createTree: (name: string, people: Person[], focusId: string) => void;
  switchTree: (id: string) => void;
  renameTree: (id: string, name: string) => void;
  deleteTree: (id: string) => void;
  resetSample: () => void;
  notify: (msg: string, opts?: { undo?: boolean }) => void;
  addMedia: (personId: string, m: MediaItem) => void;
  markAsked: (personId: string, qid: string) => void;
}

const KEY = 'kindred-tree-v1';
function load(): Partial<State> | null {
  try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
const saved = load() as (Partial<State> & { trees?: TreeDoc[]; activeTreeId?: string }) | null;
const SAMPLE_NAME = 'Rossi–Chen family (sample)';
const now = () => new Date().toISOString();
// v1 stored a single tree; wrap it as the first tree of the list.
const initialTrees: TreeDoc[] = saved?.trees?.length
  ? saved.trees
  : [{ id: saved?.people ? 't_legacy' : 'sample', name: saved?.people ? (saved.people.some((p) => p.id === SAMPLE_FOCUS) ? SAMPLE_NAME : 'My family tree') : SAMPLE_NAME, people: saved?.people ?? buildSample(), focusId: saved?.focusId ?? SAMPLE_FOCUS, asked: (saved?.asked as Record<string, string[]>) ?? {}, updatedAt: now() }];
for (const t of initialTrees) if (t.id === 'sample' && !t.capsules) t.capsules = SAMPLE_CAPSULES;
const initialPlaces: Place[] = (saved as { customPlaces?: Place[] } | null)?.customPlaces ?? [];
setCustomPlaces(initialPlaces);
const initialActive = initialTrees.find((t) => t.id === saved?.activeTreeId) ?? initialTrees[0];
const prefersDark = (() => { try { return window.matchMedia('(prefers-color-scheme: dark)').matches; } catch { return false; } })();

let toastTimer: ReturnType<typeof setTimeout> | undefined;

export const useStore = create<State>((set, get) => {
  /** Save the current people list so the next change can be undone. */
  const remember = () => set({ past: [...get().past.slice(-39), get().people] });
  return {
  people: initialActive.people,
  focusId: initialActive.focusId,
  selectedId: null,
  view: 'today',
  colorMode: 'branch',
  filters: DEFAULT_FILTERS,
  theme: (saved?.theme as 'light' | 'dark') ?? (prefersDark ? 'dark' : 'light'),
  path: null,
  filtersOpen: typeof window !== 'undefined' ? window.innerWidth > 900 : true,
  relPair: null,
  relSlot: 'b',
  openRelation: (b) => {
    const { focusId } = get();
    set({ relPair: { a: focusId, b: b && b !== focusId ? b : null }, relSlot: 'b', view: 'tree', selectedId: null, spotlight: null });
  },
  paletteOpen: false,
  edit: null,
  toast: null,
  toastUndo: false,
  past: [],
  undo: () => {
    const past = get().past;
    if (!past.length) { get().notify('Nothing to undo'); return; }
    const prev = past[past.length - 1];
    const sel = get().selectedId;
    set({ people: prev, past: past.slice(0, -1), selectedId: sel && prev.some((p) => p.id === sel) ? sel : null });
    get().notify('Undone');
  },
  centerReq: null,
  asked: initialActive.asked ?? {},
  capsules: initialActive.capsules ?? [],
  capsuleUI: null,
  spotlight: null,
  addCapsule: (c) => set({ capsules: [...get().capsules, c] }),
  openCapsule: (id) => set({ capsules: get().capsules.map((c) => (c.id === id && !c.openedAt ? { ...c, openedAt: now() } : c)) }),
  deleteCapsule: (id) => set({ capsules: get().capsules.filter((c) => c.id !== id) }),
  trees: initialTrees,
  activeTreeId: initialActive.id,
  newTreeOpen: false,
  customPlaces: initialPlaces,
  addPlace: (pl) => {
    const list = [pl, ...get().customPlaces.filter((x) => x.name.toLowerCase() !== pl.name.toLowerCase())];
    setCustomPlaces(list);
    set({ customPlaces: list });
  },
  interview: null,
  timeYear: null,
  set: (p) => set(p),
  setFilters: (p) => set({ filters: { ...get().filters, ...p } }),
  select: (id, center) => set({ selectedId: id, ...(center && id ? { centerReq: { id, n: Date.now() } } : {}) }),
  setFocus: (id) => { set({ focusId: id, centerReq: { id, n: Date.now() } }); get().notify(`Focus moved to ${get().people.find((p) => p.id === id)?.given ?? ''}`); },
  upsert: (p) => {
    const people = get().people.slice();
    const i = people.findIndex((x) => x.id === p.id);
    if (i >= 0) people[i] = p; else people.push(p);
    remember();
    // keep spouse links symmetric
    for (const s of p.spouseIds) {
      const j = people.findIndex((x) => x.id === s);
      if (j >= 0 && !people[j].spouseIds.includes(p.id)) people[j] = { ...people[j], spouseIds: [...people[j].spouseIds, p.id] };
    }
    set({ people });
  },
  addRelative: (baseId, rel, p) => {
    const people = get().people.slice();
    const bi = people.findIndex((x) => x.id === baseId);
    if (bi < 0) return;
    const base = { ...people[bi] };
    if (rel === 'parent') {
      if (p.gender === 'F' && !base.motherId) base.motherId = p.id; else if (!base.fatherId) base.fatherId = p.id; else base.motherId = p.id;
      const other = p.gender === 'F' ? base.fatherId : base.motherId;
      if (other && other !== p.id) p.spouseIds = [...new Set([...p.spouseIds, other])];
    } else if (rel === 'child') {
      const sp = base.spouseIds[0];
      if (base.gender === 'F') { p.motherId = baseId; p.fatherId = sp; } else { p.fatherId = baseId; p.motherId = sp; }
    } else if (rel === 'spouse') {
      p.spouseIds = [...new Set([...p.spouseIds, baseId])];
      base.spouseIds = [...new Set([...base.spouseIds, p.id])];
    } else if (rel === 'sibling') {
      p.fatherId = base.fatherId; p.motherId = base.motherId;
    }
    remember();
    people[bi] = base;
    people.push(p);
    for (const s of p.spouseIds) {
      const j = people.findIndex((x) => x.id === s);
      if (j >= 0 && !people[j].spouseIds.includes(p.id)) people[j] = { ...people[j], spouseIds: [...people[j].spouseIds, p.id] };
    }
    set({ people, selectedId: p.id, centerReq: { id: p.id, n: Date.now() } });
    get().notify(`Added ${`${p.given} ${p.surname}`.trim()}`, { undo: true });
  },
  remove: (id) => {
    remember();
    const people = get().people.filter((p) => p.id !== id).map((p) => ({
      ...p,
      fatherId: p.fatherId === id ? undefined : p.fatherId,
      motherId: p.motherId === id ? undefined : p.motherId,
      spouseIds: p.spouseIds.filter((s) => s !== id),
    }));
    const focusId = get().focusId === id ? people[0]?.id ?? '' : get().focusId;
    set({ people, selectedId: null, focusId, path: null });
  },
  importPeople: (ps, focus, name) => get().createTree(name ?? 'Imported tree', ps, focus ?? ps[0]?.id ?? ''),
  createTree: (name, people, focusId) => {
    const st = get();
    const trees = snapshot(st);
    const t: TreeDoc = { id: 't_' + uid(), name, people, focusId, asked: {}, capsules: [], updatedAt: now() };
    set({ past: [], trees: [...trees, t], activeTreeId: t.id, people, focusId, asked: {}, capsules: [], spotlight: null, selectedId: null, path: null, filters: DEFAULT_FILTERS, centerReq: { id: focusId, n: Date.now() } });
  },
  switchTree: (id) => {
    const st = get();
    if (id === st.activeTreeId) return;
    const trees = snapshot(st);
    const t = trees.find((x) => x.id === id);
    if (!t) return;
    set({ past: [], trees, activeTreeId: id, people: t.people, focusId: t.focusId, asked: t.asked ?? {}, capsules: t.capsules ?? [], spotlight: null, selectedId: null, path: null, filters: DEFAULT_FILTERS, centerReq: { id: t.focusId, n: Date.now() } });
    get().notify(`Opened “${t.name}”`);
  },
  renameTree: (id, name) => set({ trees: get().trees.map((t) => (t.id === id ? { ...t, name } : t)) }),
  deleteTree: (id) => {
    const st = get();
    const rest = snapshot(st).filter((t) => t.id !== id);
    if (!rest.length) rest.push({ id: 'sample', name: SAMPLE_NAME, people: buildSample(), focusId: SAMPLE_FOCUS, asked: {}, capsules: SAMPLE_CAPSULES, updatedAt: now() });
    if (id !== st.activeTreeId) { set({ trees: rest }); return; }
    const t = rest[0];
    set({ past: [], trees: rest, activeTreeId: t.id, people: t.people, focusId: t.focusId, asked: t.asked ?? {}, capsules: t.capsules ?? [], spotlight: null, selectedId: null, path: null, filters: DEFAULT_FILTERS, centerReq: { id: t.focusId, n: Date.now() } });
  },
  resetSample: () => {
    const ex = get().trees.find((t) => t.id === 'sample');
    if (ex) { get().switchTree('sample'); return; }
    get().createTree(SAMPLE_NAME, buildSample(), SAMPLE_FOCUS);
    set({ capsules: SAMPLE_CAPSULES });
  },
  notify: (msg, opts) => {
    clearTimeout(toastTimer);
    set({ toast: msg, toastUndo: !!opts?.undo });
    toastTimer = setTimeout(() => set({ toast: null, toastUndo: false }), opts?.undo ? 6000 : 2600);
  },
  addMedia: (personId, m) => (remember(), set({ people: get().people.map((p) => (p.id === personId ? { ...p, media: [...p.media, m] } : p)) })),
  markAsked: (personId, qid) => {
    const cur = get().asked[personId] ?? [];
    if (!cur.includes(qid)) set({ asked: { ...get().asked, [personId]: [...cur, qid] } });
  },
};
});

let warned = false;
/** All trees, with the active one updated from the working copy. */
function snapshot(s: Pick<State, 'trees' | 'activeTreeId' | 'people' | 'focusId' | 'asked' | 'capsules'>): TreeDoc[] {
  return s.trees.map((t) => (t.id === s.activeTreeId ? { ...t, people: s.people, focusId: s.focusId, asked: s.asked, capsules: s.capsules, updatedAt: t.people === s.people ? t.updatedAt : now() } : t));
}

useStore.subscribe((s, prev) => {
  if (s.people === prev.people && s.focusId === prev.focusId && s.theme === prev.theme && s.asked === prev.asked && s.capsules === prev.capsules && s.trees === prev.trees && s.activeTreeId === prev.activeTreeId && s.customPlaces === prev.customPlaces) return;
  try { localStorage.setItem(KEY, JSON.stringify({ trees: snapshot(s), activeTreeId: s.activeTreeId, theme: s.theme, customPlaces: s.customPlaces })); } catch { if (!warned) { warned = true; setTimeout(() => useStore.getState().notify('Browser storage is full — use ⋯ → Export to back up your trees'), 0); } }
});

/** Derived graph data shared by every view. */
export function useDerived() {
  const people = useStore((s) => s.people);
  const focusId = useStore((s) => s.focusId);
  const filters = useStore((s) => s.filters);
  const colorMode = useStore((s) => s.colorMode);
  const dark = useStore((s) => s.theme === 'dark');
  const ix = useMemo(() => buildIndex(people), [people]);
  const gen = useMemo(() => generations(ix, focusId), [ix, focusId]);
  const branch = useMemo(() => computeBranches(ix, focusId), [ix, focusId]);
  const matched = useMemo(() => matchSet(people, ix, focusId, filters, gen, branch.branchOf), [people, ix, focusId, filters, gen, branch]);
  const colorer = useMemo(() => makeColorer(colorMode, people, gen, branch, dark), [colorMode, people, gen, branch, dark]);
  const visible = useMemo(() => (filters.mode === 'hide' ? matched : new Set(people.map((p) => p.id))), [filters.mode, matched, people]);
  return { people, ix, gen, branch, matched, colorer, visible, focusId, filters, dark };
}

export function newPerson(partial: Partial<Person> = {}): Person {
  return { id: 'p_' + uid(), given: '', surname: '', gender: 'U', spouseIds: [], tags: [], events: [], media: [], ...partial };
}
