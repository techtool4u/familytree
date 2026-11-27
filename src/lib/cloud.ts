// Thin wrapper around Supabase: sign-in with an emailed code, shared trees, members and invite links.
// The database rules (supabase/schema.sql) decide who may read or change what.
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { CLOUD } from '../cloud.config';
import { isNativeApp } from './native';
import type { Person } from '../types';

export type Role = 'owner' | 'editor' | 'viewer';
export interface Member { user_id: string; role: Role; display_name: string; email: string | null; joined_at: string }
export interface CloudTree { id: string; name: string; focus_id: string | null; role: Role }
export interface Invite { token: string; role: Exclude<Role, 'owner'>; created_at: string }

export const cloudEnabled = () => !!(CLOUD.url && CLOUD.key);

let client: SupabaseClient | null = null;
export function sb(): SupabaseClient {
  if (!client) client = createClient(CLOUD.url, CLOUD.key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' } });
  return client;
}

const check = <T>(r: { data: T; error: { message: string } | null } | { data: unknown; error: { message: string } | null }): T => { if (r.error) throw new Error(r.error.message); return r.data as T; };

// ---------- account ----------

export const nameOf = (u: User | null) => (u?.user_metadata?.name as string | undefined)?.trim() || u?.email?.split('@')[0] || 'Someone';

/** Email a sign-in code (and a magic link) to `email`. New accounts are created automatically. */
export async function sendCode(email: string, name: string) {
  const web = typeof location !== 'undefined' && location.protocol.startsWith('http') && !isNativeApp();
  check(await sb().auth.signInWithOtp({ email, options: { shouldCreateUser: true, data: name ? { name } : undefined, emailRedirectTo: web ? location.origin + location.pathname : CLOUD.appUrl } }));
}

export async function verifyCode(email: string, code: string, name: string) {
  const r = check(await sb().auth.verifyOtp({ email, token: code.trim(), type: 'email' }));
  if (name && r.user && !r.user.user_metadata?.name) await setMyName(name);
  return r.user;
}

export async function setMyName(name: string) {
  check(await sb().auth.updateUser({ data: { name } }));
  check(await sb().rpc('set_my_name', { p_display_name: name }));
}

export const signOut = () => sb().auth.signOut();

// ---------- trees ----------

export async function listMyTrees(userId: string): Promise<CloudTree[]> {
  const rows = check(await sb().from('tree_members').select('role, trees(id, name, focus_id)').eq('user_id', userId)) as unknown as { role: Role; trees: { id: string; name: string; focus_id: string | null } | null }[];
  return rows.filter((r) => r.trees).map((r) => ({ ...r.trees!, role: r.role }));
}

export async function createCloudTree(name: string, focusId: string, myName: string): Promise<string> {
  return check(await sb().rpc('create_tree', { p_name: name, p_focus: focusId, p_display_name: myName })) as string;
}

export async function renameCloudTree(id: string, name: string) { check(await sb().from('trees').update({ name }).eq('id', id)); }
export async function deleteCloudTree(id: string) { check(await sb().from('trees').delete().eq('id', id)); }

export async function fetchPeople(treeId: string): Promise<Person[]> {
  const out: Person[] = [];
  for (let from = 0; ; from += 1000) {
    const rows = check(await sb().from('people').select('data').eq('tree_id', treeId).eq('deleted', false).order('id').range(from, from + 999)) as { data: Person }[];
    out.push(...rows.map((r) => r.data));
    if (rows.length < 1000) return out;
  }
}

export async function upsertPeople(treeId: string, people: Person[]) {
  for (let i = 0; i < people.length; i += 300) {
    check(await sb().from('people').upsert(people.slice(i, i + 300).map((p) => ({ tree_id: treeId, id: p.id, data: p, deleted: false }))));
  }
}

export async function deletePeople(treeId: string, ids: string[]) {
  if (ids.length) check(await sb().from('people').update({ deleted: true }).eq('tree_id', treeId).in('id', ids));
}

// ---------- members & invites ----------

export async function listMembers(treeId: string): Promise<Member[]> {
  return check(await sb().from('tree_members').select('user_id, role, display_name, email, joined_at').eq('tree_id', treeId).order('joined_at')) as Member[];
}
export async function setMemberRole(treeId: string, userId: string, role: Exclude<Role, 'owner'>) { check(await sb().from('tree_members').update({ role }).eq('tree_id', treeId).eq('user_id', userId)); }
export async function removeMember(treeId: string, userId: string) { check(await sb().from('tree_members').delete().eq('tree_id', treeId).eq('user_id', userId)); }

export async function listInvites(treeId: string): Promise<Invite[]> {
  return check(await sb().from('invites').select('token, role, created_at').eq('tree_id', treeId).eq('revoked', false).order('created_at')) as Invite[];
}
export async function createInvite(treeId: string, role: Exclude<Role, 'owner'>): Promise<string> {
  return (check(await sb().from('invites').insert({ tree_id: treeId, role }).select('token').single()) as { token: string }).token;
}
export async function revokeInvite(token: string) { check(await sb().from('invites').update({ revoked: true }).eq('token', token)); }
export async function acceptInvite(token: string, myName: string): Promise<string> {
  return check(await sb().rpc('accept_invite', { p_token: token, p_display_name: myName })) as string;
}

export const inviteUrl = (token: string) => `${CLOUD.appUrl}#join=${token}`;
/** Pull the invite token out of a pasted link (or a bare token). */
export const tokenFrom = (text: string) => text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0] ?? null;
