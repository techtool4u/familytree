import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore, useDerived } from '../store';
import { fullName, birthYear, isLiving, uid } from '../lib/graph';
import { putBlob } from '../lib/idb';
import { Avatar } from './Avatar';
import { StoryAudio } from './StoryAudio';
import { X, Mic, Square, Lock, MailOpen } from 'lucide-react';
import type { Capsule, Person } from '../types';

export const todayISO = () => new Date().toISOString().slice(0, 10);
export const isUnlocked = (c: Capsule) => c.unlockDate <= todayISO();
export const daysUntil = (iso: string) => Math.ceil((new Date(iso + 'T00:00:00').getTime() - new Date(todayISO() + 'T00:00:00').getTime()) / 864e5);
export const fmtDate = (iso: string) => new Date(iso + (iso.length === 10 ? 'T12:00:00' : '')).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
const ord = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;

export default function CapsuleModal() {
  const ui = useStore((s) => s.capsuleUI)!;
  return ui.mode === 'write' ? <Writer toId={ui.toId} /> : <Reader id={ui.id} />;
}

function Writer({ toId }: { toId?: string }) {
  const { people, focusId, colorer } = useDerived();
  const { set, addCapsule, notify } = useStore.getState();
  const sorted = useMemo(() => people.slice().sort((a, b) => fullName(a).localeCompare(fullName(b))), [people]);
  const [to, setTo] = useState(toId ?? sorted.find((p) => p.id !== focusId && isLiving(p))?.id ?? '');
  const [from, setFrom] = useState(focusId);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [mode, setMode] = useState<'birthday' | 'years' | 'date'>('birthday');
  const [age, setAge] = useState(18);
  const [years, setYears] = useState(10);
  const [date, setDate] = useState('');
  const rec = useRecorder();
  const T = people.find((p) => p.id === to);
  const F = people.find((p) => p.id === from);
  const hasBirthday = !!T?.birthDate && T.birthDate.length >= 10;
  const effMode = mode === 'birthday' && !hasBirthday ? 'years' : mode;

  const unlock = useMemo(() => {
    if (effMode === 'birthday' && T) {
      const d = `${birthYear(T) + age}${T.birthDate!.slice(4, 10)}`;
      return { date: d, label: `on ${T.given}’s ${ord(age)} birthday` };
    }
    if (effMode === 'years') {
      const d = new Date(); d.setFullYear(d.getFullYear() + years);
      return { date: d.toISOString().slice(0, 10), label: `${years} year${years === 1 ? '' : 's'} from today` };
    }
    return date ? { date, label: `on ${fmtDate(date)}` } : null;
  }, [effMode, T, age, years, date]);
  const future = unlock && unlock.date > todayISO();
  const ok = !!T && !!unlock && future && (message.trim() || rec.blob);

  const seal = async () => {
    if (!ok || !T || !unlock) return;
    let audioKey: string | undefined;
    if (rec.blob) { audioKey = 'cap-' + uid(); try { await putBlob(audioKey, rec.blob); } catch { audioKey = undefined; } }
    addCapsule({ id: 'cap-' + uid(), toId: T.id, fromId: F?.id, fromName: F ? fullName(F) : 'Someone who loves you', title: title.trim() || `For ${T.given}`, message: message.trim(), audioKey, unlockDate: unlock.date, unlockLabel: unlock.label, createdAt: new Date().toISOString() });
    notify(`Sealed 🔒 — it will open ${unlock.label}`);
    set({ capsuleUI: null });
  };

  return (
    <div className="modal-bg" onClick={() => set({ capsuleUI: null })}>
      <div className="modal capsule-write" role="dialog" aria-label="Write a time-capsule letter" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><span className="cap-ic">✉️</span><h3>A letter to the future</h3><span className="grow" /><button className="icon-btn" onClick={() => set({ capsuleUI: null })} aria-label="Close"><X size={18} /></button></div>
        <p className="muted small" style={{ marginTop: -6 }}>Write something today that stays sealed until the day it matters most. The letter is hidden in the app until then.</p>
        <div className="form-grid">
          <label>To<PersonSelect people={sorted} value={to} onChange={setTo} /></label>
          <label>From<PersonSelect people={sorted} value={from} onChange={setFrom} /></label>
        </div>

        <div className="f-label" style={{ marginTop: 14 }}>When should it open?</div>
        <div className="seg">
          <button className={effMode === 'birthday' ? 'on' : ''} onClick={() => setMode('birthday')} disabled={!hasBirthday} title={hasBirthday ? '' : 'Add a full birth date for this person first'}>On a birthday</button>
          <button className={effMode === 'years' ? 'on' : ''} onClick={() => setMode('years')}>In some years</button>
          <button className={effMode === 'date' ? 'on' : ''} onClick={() => setMode('date')}>On a date</button>
        </div>
        <div className="cap-when">
          {effMode === 'birthday' && <label>{T?.given}’s <input type="number" min={1} max={120} value={age} onChange={(e) => setAge(+e.target.value)} /> birthday</label>}
          {effMode === 'years' && <label>In <input type="number" min={1} max={100} value={years} onChange={(e) => setYears(+e.target.value)} /> years</label>}
          {effMode === 'date' && <input type="date" min={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} />}
          {unlock && <span className={`pill ${future ? 'strong' : ''}`}>{future ? `Opens ${fmtDate(unlock.date)}` : 'That date has already passed'}</span>}
        </div>

        <div className="form-grid" style={{ marginTop: 14 }}>
          <label className="span2">Title<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={T ? `For ${T.given}, on your big day` : 'Title'} /></label>
          <label className="span2">Your letter<textarea className="letter-input" rows={8} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={T ? `Dear ${T.given},\n\nBy the time you read this…` : ''} /></label>
        </div>
        <div className="cap-rec">
          {rec.state === 'idle' && <button type="button" className="btn sm" onClick={rec.start}><Mic size={14} /> Add a voice message</button>}
          {rec.state === 'recording' && <button type="button" className="btn sm danger" onClick={rec.stop}><Square size={14} /> Stop · {rec.secs}s</button>}
          {rec.state === 'done' && rec.url && <><audio controls src={rec.url} className="story-audio" /><button type="button" className="link" onClick={rec.reset}>Remove</button></>}
          {rec.err && <span className="err">{rec.err}</span>}
        </div>
        <div className="row end">
          <span className="muted small grow">{T && F && <><Avatar p={F} color={colorer.color(F.id)} size={20} /> → <Avatar p={T} color={colorer.color(T.id)} size={20} /></>}</span>
          <button className="btn" onClick={() => set({ capsuleUI: null })}>Cancel</button>
          <button className="btn primary" disabled={!ok || rec.state === 'recording'} onClick={seal}><Lock size={14} /> Seal the letter</button>
        </div>
      </div>
    </div>
  );
}

function PersonSelect({ people, value, onChange }: { people: Person[]; value: string; onChange: (v: string) => void }) {
  return <select value={value} onChange={(e) => onChange(e.target.value)}>{people.map((p) => <option key={p.id} value={p.id}>{fullName(p)}</option>)}</select>;
}

function Reader({ id }: { id: string }) {
  const c = useStore((s) => s.capsules.find((x) => x.id === id));
  const { ix, colorer } = useDerived();
  const { set, openCapsule } = useStore.getState();
  const [opened, setOpened] = useState(!!c?.openedAt);
  if (!c) return null;
  const T = ix.byId.get(c.toId), F = c.fromId ? ix.byId.get(c.fromId) : undefined;
  const unlocked = isUnlocked(c);
  const close = () => set({ capsuleUI: null });

  return (
    <div className="modal-bg" onClick={close}>
      <div className={`envelope-wrap ${opened ? 'opened' : ''}`} onClick={(e) => e.stopPropagation()}>
        {!opened ? (
          <div className="envelope" role="dialog" aria-label="Sealed letter">
            <div className="env-flap" />
            <div className="env-body">
              <div className="env-to">For {T ? fullName(T) : 'you'}</div>
              <div className="env-from">from {c.fromName} · sealed {fmtDate(c.createdAt.slice(0, 10))}</div>
              <div className="env-seal">{unlocked ? '❤' : <Lock size={22} />}</div>
              {unlocked
                ? <button className="btn primary" onClick={() => { openCapsule(c.id); setOpened(true); }}><MailOpen size={15} /> Open the letter</button>
                : <p className="env-wait">Sealed until <b>{fmtDate(c.unlockDate)}</b> ({c.unlockLabel}).<br />{daysUntil(c.unlockDate).toLocaleString()} days to go.</p>}
              <button className="link" onClick={close}>Close</button>
            </div>
          </div>
        ) : (
          <article className="letter" role="dialog" aria-label={c.title}>
            <button className="icon-btn letter-x" onClick={close} aria-label="Close"><X size={18} /></button>
            <div className="letter-head">
              {F && <Avatar p={F} color={colorer.color(F.id)} size={44} />}
              <div><div className="muted small">Sealed {fmtDate(c.createdAt.slice(0, 10))} · opened {c.openedAt ? fmtDate(c.openedAt.slice(0, 10)) : 'today'}</div><h2>{c.title}</h2></div>
            </div>
            {c.audioKey && <StoryAudio audioKey={c.audioKey} />}
            <div className="letter-body">{c.message}</div>
            <div className="letter-sign">— {c.fromName}</div>
          </article>
        )}
      </div>
    </div>
  );
}

function useRecorder() {
  const [state, setState] = useState<'idle' | 'recording' | 'done'>('idle');
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [secs, setSecs] = useState(0);
  const [err, setErr] = useState('');
  const mr = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => { mr.current?.stream.getTracks().forEach((t) => t.stop()); if (timer.current) clearInterval(timer.current); }, []);
  return {
    state, blob, url, secs, err,
    start: async () => {
      setErr('');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const chunks: Blob[] = []; const m = new MediaRecorder(stream);
        m.ondataavailable = (e) => e.data.size && chunks.push(e.data);
        m.onstop = () => { const b = new Blob(chunks, { type: m.mimeType || 'audio/webm' }); setBlob(b); setUrl(URL.createObjectURL(b)); setState('done'); stream.getTracks().forEach((t) => t.stop()); };
        m.start(); mr.current = m; setState('recording'); setSecs(0);
        timer.current = setInterval(() => setSecs((s) => s + 1), 1000);
      } catch { setErr('Microphone not available — the written letter still works.'); }
    },
    stop: () => { mr.current?.stop(); if (timer.current) clearInterval(timer.current); },
    reset: () => { setBlob(null); setUrl(null); setState('idle'); },
  };
}
