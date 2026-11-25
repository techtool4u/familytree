import { useStore, useDerived } from '../store';
import { isUnlocked, daysUntil, fmtDate } from './CapsuleModal';
import { Avatar } from './Avatar';
import { fullName } from '../lib/graph';
import { Lock, MailOpen, Gift, Trash2, PenLine } from 'lucide-react';
import type { Capsule } from '../types';

const countdown = (iso: string) => {
  const d = daysUntil(iso);
  if (d > 730) return `${Math.round(d / 365)} years to go`;
  if (d > 60) return `${Math.round(d / 30)} months to go`;
  return `${d} day${d === 1 ? '' : 's'} to go`;
};

/** Time-capsule section on the Stories page. */
export function CapsuleSection() {
  const capsules = useStore((s) => s.capsules);
  const { ix, colorer } = useDerived();
  const { set, deleteCapsule, notify } = useStore.getState();
  const sorted = capsules.slice().sort((a, b) => Number(isUnlocked(b) && !b.openedAt) - Number(isUnlocked(a) && !a.openedAt) || a.unlockDate.localeCompare(b.unlockDate));

  return (
    <section>
      <div className="lib-head">
        <h2 className="sec-title">Time capsules ✉️ <span className="muted small">· letters sealed until a future day</span></h2>
        <button className="btn sm primary" onClick={() => set({ capsuleUI: { mode: 'write' } })}><PenLine size={14} /> Write a letter to the future</button>
      </div>
      {sorted.length === 0 && <p className="muted">No capsules yet. Write one for a child’s 18th birthday, a wedding day, or simply “10 years from now”.</p>}
      <div className="capsule-grid">
        {sorted.map((c) => {
          const T = ix.byId.get(c.toId); const F = c.fromId ? ix.byId.get(c.fromId) : undefined;
          const ready = isUnlocked(c);
          return (
            <div key={c.id} className={`capsule-card ${ready ? (c.openedAt ? 'opened' : 'ready') : 'sealed'}`}>
              <div className="cap-top">
                {ready ? (c.openedAt ? <MailOpen size={18} /> : <Gift size={18} />) : <Lock size={18} />}
                <span className="cap-state">{ready ? (c.openedAt ? `Opened ${fmtDate(c.openedAt.slice(0, 10))}` : 'Ready to open!') : `Opens ${fmtDate(c.unlockDate)}`}</span>
                <span className="grow" />
                <button className="icon-btn" title="Delete capsule" onClick={() => { deleteCapsule(c.id); notify('Capsule deleted'); }}><Trash2 size={14} /></button>
              </div>
              <h4>{ready ? c.title : 'Sealed letter'}</h4>
              <div className="cap-who">
                {F && <Avatar p={F} color={colorer.color(F.id)} size={24} />}<span>{c.fromName}</span><span className="muted">→</span>
                {T && <Avatar p={T} color={colorer.color(T.id)} size={24} />}<span>{T ? fullName(T) : '—'}</span>
              </div>
              <p className="muted small">{ready ? `Sealed ${fmtDate(c.createdAt.slice(0, 10))}` : `${c.unlockLabel} · ${countdown(c.unlockDate)}`}{c.audioKey ? ' · 🎙️ voice message' : ''}</p>
              {ready && <button className="btn sm" onClick={() => set({ capsuleUI: { mode: 'read', id: c.id } })}>{c.openedAt ? 'Read again' : 'Open it'}</button>}
              {!ready && <button className="btn sm ghost" onClick={() => set({ capsuleUI: { mode: 'read', id: c.id } })}>View envelope</button>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** Highlights on the Today page: unlocked letters waiting to be opened, and the next one to unlock. */
export function CapsuleToday() {
  const capsules = useStore((s) => s.capsules);
  const { ix, colorer } = useDerived();
  const set = useStore((s) => s.set);
  const ready = capsules.filter((c) => isUnlocked(c) && !c.openedAt);
  const next = capsules.filter((c) => !isUnlocked(c)).sort((a, b) => a.unlockDate.localeCompare(b.unlockDate))[0] as Capsule | undefined;
  if (!ready.length && !next) return null;
  return (
    <>
      {ready.map((c) => {
        const T = ix.byId.get(c.toId);
        return (
          <section key={c.id} className="capsule-hero" onClick={() => set({ capsuleUI: { mode: 'read', id: c.id } })}>
            <div className="ch-env">✉️</div>
            <div className="grow">
              <div className="sh-eyebrow">A time capsule has unlocked</div>
              <h3>A letter for {T?.given ?? 'you'}, from {c.fromName}</h3>
              <p className="muted">Sealed {fmtDate(c.createdAt.slice(0, 10))}, to be opened {c.unlockLabel}.</p>
            </div>
            <button className="btn primary">Open it</button>
          </section>
        );
      })}
      {!ready.length && next && (
        <p className="capsule-next" onClick={() => set({ view: 'stories' })}>
          🔒 Next time capsule: for {ix.byId.get(next.toId)?.given ?? '—'} from {next.fromName.split(' ')[0]} — opens {fmtDate(next.unlockDate)} ({countdown(next.unlockDate)}).
          {ix.byId.get(next.toId) && <Avatar p={ix.byId.get(next.toId)!} color={colorer.color(next.toId)} size={18} />}
        </p>
      )}
    </>
  );
}
