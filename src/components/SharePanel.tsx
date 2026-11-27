import { useEffect, useState } from 'react';
import { Share } from '@capacitor/share';
import { useStore } from '../store';
import * as cloud from '../lib/cloud';
import { shareActiveTree, openCloudTree, refreshTreeList, syncNow } from '../lib/sync';
import { isNativeApp, openExternal } from '../lib/native';
import { X, Users, Mail, LogOut, Link2, Copy, Send, Trash2, CloudUpload, RefreshCw, Check, Pencil, UserMinus } from 'lucide-react';

const JOIN_KEY = 'oft-join';
export const rememberJoin = (token: string) => { try { localStorage.setItem(JOIN_KEY, token); } catch { /* ignore */ } };
const pendingJoin = () => { try { return localStorage.getItem(JOIN_KEY); } catch { return null; } };
const clearJoin = () => { try { localStorage.removeItem(JOIN_KEY); } catch { /* ignore */ } };

const ROLE_TEXT: Record<cloud.Role, string> = { owner: 'Owner', editor: 'Can edit', viewer: 'Can view' };
const STATUS_TEXT = { local: 'On this device only', loading: 'Loading the latest…', synced: 'Up to date', saving: 'Saving…', offline: 'Offline: changes will sync when you reconnect', error: 'Could not sync' } as const;

/** Docked panel for everything about sharing a tree with family. */
export default function SharePanel() {
  const user = useStore((s) => s.user);
  const close = () => useStore.setState({ shareOpen: false });
  return (
    <aside className="drawer share-panel" aria-label="Share with family">
      <div className="sp-head"><Users size={18} /><h3>Share with family</h3><span className="grow" /><button className="icon-btn" onClick={close} aria-label="Close"><X size={18} /></button></div>
      <div className="sp-body">
        {!cloud.cloudEnabled() ? <p className="muted">Sharing isn’t set up in this version of the app.</p> : !user ? <SignIn /> : <Signed />}
      </div>
    </aside>
  );
}

function SignIn() {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const run = async (f: () => Promise<unknown>) => { setBusy(true); setErr(''); try { await f(); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); } };

  return (
    <div className="sp-section">
      <p>Sign in to share a tree, so relatives can see it and help build it. Changes show up for everyone straight away.</p>
      {pendingJoin() && <p className="sp-note">You’ve opened an invite. Sign in and you’ll join the tree straight away.</p>}
      {step === 'email' ? (
        <form className="form-grid one" onSubmit={(e) => { e.preventDefault(); run(async () => { await cloud.sendCode(email.trim(), name.trim()); setStep('code'); }); }}>
          <label>Your name<input required value={name} onChange={(e) => setName(e.target.value)} placeholder="How family will see you" autoComplete="name" /></label>
          <label>Email<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" /></label>
          <button className="btn primary" disabled={busy}><Mail size={15} /> {busy ? 'Sending…' : 'Email me a sign-in code'}</button>
        </form>
      ) : (
        <form className="form-grid one" onSubmit={(e) => { e.preventDefault(); run(() => cloud.verifyCode(email.trim(), code, name.trim())); }}>
          <p className="muted" style={{ margin: 0 }}>We sent a code to <b>{email}</b>. Enter it below, or tap the link in the email on this device.</p>
          <label>Sign-in code<input required inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="123456" className="sp-code" autoFocus /></label>
          <button className="btn primary" disabled={busy || code.length < 6}><Check size={15} /> {busy ? 'Checking…' : 'Sign in'}</button>
          <div className="row gap"><button type="button" className="link" onClick={() => run(() => cloud.sendCode(email.trim(), name.trim()))}>Send a new code</button><button type="button" className="link" onClick={() => { setStep('email'); setCode(''); }}>Use a different email</button></div>
        </form>
      )}
      {err && <p className="sp-err">{friendly(err)}</p>}
    </div>
  );
}

function Signed() {
  const s = useStore();
  const user = s.user!;
  const tree = s.trees.find((t) => t.id === s.activeTreeId);
  const [joinText, setJoinText] = useState('');
  const [busy, setBusy] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(user.name);
  const run = async (key: string, f: () => Promise<unknown>) => { setBusy(key); try { await f(); } catch (e) { s.notify(friendly((e as Error).message)); } finally { setBusy(''); } };

  const join = (token: string) => run('join', async () => {
    const id = await cloud.acceptInvite(token, user.name);
    clearJoin(); setJoinText('');
    await openCloudTree(id);
    s.notify(`You joined “${useStore.getState().trees.find((t) => t.cloud?.id === id)?.name ?? 'the family tree'}”`);
  });

  // Finish an invite that was opened before signing in.
  useEffect(() => { const t = pendingJoin(); if (t) join(t); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div className="sp-section sp-me">
        {editingName ? (
          <form className="row gap" onSubmit={(e) => { e.preventDefault(); run('name', async () => { await cloud.setMyName(name.trim()); useStore.setState({ user: { ...user, name: name.trim() } }); setEditingName(false); }); }}>
            <input className="sp-input" value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
            <button className="btn sm primary" disabled={busy === 'name'}>Save</button>
          </form>
        ) : (
          <div className="row gap"><span className="grow">Signed in as <b>{user.name}</b><br /><span className="muted small">{user.email}</span></span>
            <button className="icon-btn" title="Change your name" onClick={() => setEditingName(true)}><Pencil size={15} /></button>
            <button className="btn sm" onClick={() => cloud.signOut()}><LogOut size={14} /> Sign out</button></div>
        )}
      </div>

      {tree && !tree.cloud && (
        <div className="sp-section">
          <div className="f-label">This tree</div>
          <p><b>“{tree.name}”</b> is only on this device right now.</p>
          <p className="muted small">Sharing puts it online so you can invite relatives as editors or viewers. You stay the owner, and it keeps working offline.</p>
          <button className="btn primary" disabled={busy === 'share'} onClick={() => run('share', async () => { await shareActiveTree(); s.notify(`“${tree.name}” is now shared. Invite your family below.`); })}>
            <CloudUpload size={15} /> {busy === 'share' ? 'Sharing…' : 'Share this tree online'}
          </button>
        </div>
      )}

      {tree?.cloud && <SharedTree key={tree.cloud.id} cloudId={tree.cloud.id} role={tree.cloud.role} treeName={tree.name} />}

      <div className="sp-section">
        <div className="f-label">Got an invite link?</div>
        <form className="row gap" onSubmit={(e) => { e.preventDefault(); const t = cloud.tokenFrom(joinText); if (t) join(t); else s.notify('That doesn’t look like an invite link'); }}>
          <input className="sp-input grow" value={joinText} onChange={(e) => setJoinText(e.target.value)} placeholder="Paste it here" />
          <button className="btn sm" disabled={!joinText.trim() || busy === 'join'}>Join</button>
        </form>
      </div>
      <button className="link small" onClick={() => run('list', refreshTreeList)}><RefreshCw size={12} /> Refresh my shared trees</button>
    </>
  );
}

function SharedTree({ cloudId, role, treeName }: { cloudId: string; role: cloud.Role; treeName: string }) {
  const s = useStore();
  const me = s.user!;
  const [members, setMembers] = useState<cloud.Member[]>([]);
  const [invites, setInvites] = useState<cloud.Invite[]>([]);
  const owner = role === 'owner';
  const load = async () => {
    try {
      setMembers(await cloud.listMembers(cloudId));
      if (owner) setInvites(await cloud.listInvites(cloudId));
    } catch (e) { s.notify(friendly((e as Error).message)); }
  };
  useEffect(() => { load(); }, [cloudId, role]); // eslint-disable-line react-hooks/exhaustive-deps
  const act = async (f: () => Promise<unknown>, done?: string) => { try { await f(); await load(); if (done) s.notify(done); } catch (e) { s.notify(friendly((e as Error).message)); } };

  const message = (token: string, r: string) => `${me.name} invited you to ${r === 'editor' ? 'help build' : 'see'} the “${treeName}” family tree on OurFamilyTree. Open this link to join:\n${cloud.inviteUrl(token)}`;
  const copy = (token: string, r: string) => navigator.clipboard?.writeText(message(token, r)).then(() => s.notify('Invite copied. Paste it in a message.')).catch(() => s.notify(cloud.inviteUrl(token)));
  const share = async (token: string, r: string) => {
    if (isNativeApp() || 'share' in navigator) { try { await Share.share({ title: 'Join our family tree', text: message(token, r) }); return; } catch { /* cancelled */ return; } }
    openExternal(`https://wa.me/?text=${encodeURIComponent(message(token, r))}`);
  };
  const st = s.sync;

  return (
    <>
      <div className="sp-section">
        <div className="f-label">This tree</div>
        <p style={{ margin: 0 }}><b>“{treeName}”</b> · <span className={`role-badge ${role}`}>{ROLE_TEXT[role]}</span></p>
        <p className={`sp-status ${st.status}`}>
          <span className="sp-dot" />{STATUS_TEXT[st.status]}{st.pending > 0 && st.status !== 'saving' ? ` (${st.pending} waiting)` : ''}
          {(st.status === 'error' || st.status === 'offline') && <button className="link" onClick={syncNow}>Try again</button>}
        </p>
        {st.status === 'error' && st.error && <p className="sp-err small">{friendly(st.error)}</p>}
        {role === 'viewer' && <p className="muted small">You can look around but not change anything. Ask the owner if you’d like to help edit.</p>}
      </div>

      {owner && (
        <div className="sp-section">
          <div className="f-label">Invite family</div>
          <p className="muted small" style={{ marginTop: 0 }}>Anyone with a link can join after signing in. Send it only to family, and remove a link once everyone has joined.</p>
          <div className="row gap wrap">
            <button className="btn sm primary" onClick={() => act(() => cloud.createInvite(cloudId, 'editor'), 'Invite link for editors created')}><Link2 size={14} /> Link for editors</button>
            <button className="btn sm" onClick={() => act(() => cloud.createInvite(cloudId, 'viewer'), 'Invite link for viewers created')}><Link2 size={14} /> Link for viewers</button>
          </div>
          {invites.map((inv) => (
            <div key={inv.token} className="sp-invite">
              <span className="grow"><b>{inv.role === 'editor' ? 'Editors' : 'Viewers'}</b> link<br /><span className="muted small sp-url">{cloud.inviteUrl(inv.token)}</span></span>
              <button className="icon-btn" title="Copy invite" onClick={() => copy(inv.token, inv.role)}><Copy size={15} /></button>
              <button className="icon-btn" title="Send invite" onClick={() => share(inv.token, inv.role)}><Send size={15} /></button>
              <button className="icon-btn" title="Turn this link off" onClick={() => act(() => cloud.revokeInvite(inv.token), 'Invite link turned off')}><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      )}

      <div className="sp-section">
        <div className="f-label">Family members <span className="muted">{members.length}</span></div>
        {members.map((m) => (
          <div key={m.user_id} className="sp-member">
            <span className="avatar sp-av">{(m.display_name || m.email || '?').slice(0, 1).toUpperCase()}</span>
            <span className="grow">{m.display_name || m.email}{m.user_id === me.id && <span className="muted"> (you)</span>}<br /><span className="muted small">{m.email}</span></span>
            {owner && m.user_id !== me.id ? (
              <>
                <select className="sp-select" value={m.role} onChange={(e) => act(() => cloud.setMemberRole(cloudId, m.user_id, e.target.value as 'editor' | 'viewer'), `${m.display_name || 'They'} can now ${e.target.value === 'editor' ? 'edit' : 'only view'}`)}>
                  <option value="editor">Can edit</option><option value="viewer">Can view</option>
                </select>
                <button className="icon-btn" title="Remove from tree" onClick={() => { if (confirm(`Remove ${m.display_name || m.email} from “${treeName}”?`)) act(() => cloud.removeMember(cloudId, m.user_id), 'Removed from the tree'); }}><UserMinus size={15} /></button>
              </>
            ) : <span className={`role-badge ${m.role}`}>{ROLE_TEXT[m.role]}</span>}
          </div>
        ))}
      </div>
    </>
  );
}

/** Turn database / network errors into plain English. */
function friendly(msg: string) {
  if (/rate limit|too many/i.test(msg)) return 'Too many emails sent for now. Wait a few minutes and try again.';
  if (/token has expired|invalid/i.test(msg) && /otp|token/i.test(msg)) return 'That code is wrong or has expired. Ask for a new one.';
  if (/fetch|network/i.test(msg)) return 'Can’t reach the internet right now.';
  if (/row-level security|permission/i.test(msg)) return 'You don’t have permission to do that.';
  if (/schema cache|does not exist/i.test(msg)) return 'The shared-tree database isn’t set up yet (run supabase/schema.sql).';
  return msg;
}
