import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore, useDerived, newPerson, type Relation } from '../store';
import { ask, EXAMPLES, type Answer } from '../lib/ask';
import { fullName, lifeSpan, isLiving, age, relationship, possessive, childrenOf, uid } from '../lib/graph';
import { narrate } from '../lib/journey';
import { flagOf } from '../data/places';
import { Avatar } from './Avatar';
import { Sparkles, X, CornerDownLeft, Play, Pause, SkipBack, SkipForward, Square } from 'lucide-react';
import type { Gender } from '../types';

/* ---------------- Ask the tree ---------------- */

export function AskBar({ onAnswer }: { onAnswer: (a: Answer | null) => void }) {
  const { people, ix, focusId, colorer } = useDerived();
  const select = useStore((s) => s.select);
  const [q, setQ] = useState('');
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [focused, setFocused] = useState(false);
  const focus = ix.byId.get(focusId);
  const examples = useMemo(() => EXAMPLES.map((e) => e.replace('Maya', focus?.given ?? 'Maya')), [focus]);

  const run = (text: string) => {
    setQ(text);
    const a = ask(text, people, ix, focusId);
    setAnswer(a);
    onAnswer(a.understood && a.ids.length ? a : null);
  };
  const clear = () => { setQ(''); setAnswer(null); onAnswer(null); };
  const shown = answer?.ids.map((id) => ix.byId.get(id)!).filter(Boolean) ?? [];

  return (
    <div className={`ask-bar ${focused || answer ? 'open' : ''}`}>
      <form className="ask-input" onSubmit={(e) => { e.preventDefault(); run(q); }}>
        <Sparkles size={16} className="ask-spark" />
        <input value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder={`Ask your tree… e.g. “${examples[0]}”`} aria-label="Ask your tree a question" />
        {q && <button type="button" className="x" onClick={clear} aria-label="Clear"><X size={15} /></button>}
        <button type="submit" className="ask-go" aria-label="Ask"><CornerDownLeft size={15} /></button>
      </form>
      {focused && !answer && (
        <div className="ask-pop">
          <div className="f-label">Try asking</div>
          <div className="chips">{examples.map((e) => <button key={e} type="button" className="chip ghost" onMouseDown={(ev) => { ev.preventDefault(); run(e); }}>{e}</button>)}</div>
        </div>
      )}
      {answer && (
        <div className="ask-pop">
          {answer.understood && answer.ids.length > 0 && <>
            <div className="ask-head"><b>{answer.label}</b><span className="muted"> · {answer.path ? `${answer.path.length - 1} steps` : `${answer.ids.length} ${answer.ids.length === 1 ? 'person' : 'people'}`}</span></div>
            <div className="ask-people">
              {shown.slice(0, 14).map((p) => <button key={p.id} onClick={() => select(p.id, true)} title={fullName(p)}><Avatar p={p} color={colorer.color(p.id)} size={30} /><span>{p.given}</span></button>)}
              {shown.length > 14 && <span className="muted small">+{shown.length - 14} more</span>}
            </div>
          </>}
          {answer.understood && answer.ids.length === 0 && <p className="muted">I understood “{answer.label}”, but nobody in this tree matches.</p>}
          {!answer.understood && <>
            <p className="muted" style={{ margin: '0 0 8px' }}>I didn’t quite get that. Questions like these work:</p>
            <div className="chips">{examples.slice(0, 6).map((e) => <button key={e} className="chip ghost" onClick={() => run(e)}>{e}</button>)}</div>
          </>}
        </div>
      )}
    </div>
  );
}

/* ---------------- Quick add (grow the tree right on the canvas) ---------------- */

export interface Composer { anchorId: string; rel: Relation; x: number; y: number }
const REL_LABEL: Record<Relation, string> = { parent: 'parent', child: 'child', spouse: 'partner', sibling: 'brother or sister' };

export function QuickAdd({ c, onClose, bounds }: { c: Composer; onClose: () => void; bounds: { w: number; h: number } }) {
  const { ix } = useDerived();
  const anchor = ix.byId.get(c.anchorId)!;
  const defaultGender: Gender = c.rel === 'parent' ? (anchor.fatherId ? 'F' : 'M') : c.rel === 'spouse' ? (anchor.gender === 'M' ? 'F' : anchor.gender === 'F' ? 'M' : 'U') : 'U';
  const defaultSurname = c.rel === 'child' || c.rel === 'sibling' || (c.rel === 'parent' && defaultGender === 'M') ? anchor.surname : '';
  const [name, setName] = useState(defaultSurname ? ` ${defaultSurname}` : '');
  const [gender, setGender] = useState<Gender>(defaultGender);
  const [year, setYear] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { input.current?.focus(); input.current?.setSelectionRange(0, 0); }, []);

  const add = (details = false) => {
    const parts = name.trim().split(/\s+/);
    if (!parts[0]) return;
    const surname = parts.length > 1 ? parts.at(-1)! : '';
    const given = parts.length > 1 ? parts.slice(0, -1).join(' ') : parts[0];
    const y = /^\d{4}$/.test(year.trim()) ? year.trim() : undefined;
    const p = newPerson({ given, surname, gender, birthDate: y, events: y ? [{ id: uid(), year: +y, type: 'birth', title: 'Born' }] : [] });
    useStore.getState().addRelative(anchor.id, c.rel, p);
    if (details) useStore.getState().set({ edit: { personId: p.id } });
    onClose();
  };
  const title = c.rel === 'parent' ? `Add ${anchor.given}’s ${gender === 'F' ? 'mother' : gender === 'M' ? 'father' : 'parent'}`
    : c.rel === 'child' ? `Add ${anchor.given}’s ${gender === 'F' ? 'daughter' : gender === 'M' ? 'son' : 'child'}`
    : c.rel === 'spouse' ? `Add ${anchor.given}’s ${gender === 'F' ? 'wife' : gender === 'M' ? 'husband' : 'partner'}`
    : `Add ${anchor.given}’s ${gender === 'F' ? 'sister' : gender === 'M' ? 'brother' : REL_LABEL.sibling}`;
  const W = 300, H = 178;
  const left = Math.max(8, Math.min(bounds.w - W - 8, c.x - W / 2));
  const top = c.y + 16 + H > bounds.h ? Math.max(8, c.y - H - 16) : c.y + 16;

  return (
    <form className="quick-add" style={{ left, top, width: W }} onSubmit={(e) => { e.preventDefault(); add(); }} onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }}>
      <div className="qa-head"><b>{title}</b><button type="button" className="x" onClick={onClose} aria-label="Cancel"><X size={15} /></button></div>
      <input ref={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="First name and surname" aria-label="Name" />
      <div className="qa-row">
        <div className="seg qa-gender" role="radiogroup" aria-label="Gender">
          {([['F', 'F'], ['M', 'M'], ['U', '?']] as [Gender, string][]).map(([g, l]) => <button key={g} type="button" className={gender === g ? 'on' : ''} onClick={() => setGender(g)} aria-label={g === 'F' ? 'Female' : g === 'M' ? 'Male' : 'Unknown'}>{l}</button>)}
        </div>
        <input className="qa-year" value={year} onChange={(e) => setYear(e.target.value)} placeholder="Born (year)" inputMode="numeric" aria-label="Birth year" />
      </div>
      <div className="qa-actions">
        <button type="button" className="link" onClick={() => add(true)}>Add + more details</button>
        <button type="submit" className="btn sm primary" disabled={!name.trim()}>Add <kbd>↵</kbd></button>
      </div>
    </form>
  );
}

/* ---------------- Hover card ---------------- */

export function HoverCard({ id, x, y, bounds }: { id: string; x: number; y: number; bounds: { w: number; h: number } }) {
  const { ix, colorer, focusId } = useDerived();
  const p = ix.byId.get(id);
  if (!p) return null;
  const focus = ix.byId.get(focusId);
  const rel = id === focusId ? 'This is the focus person' : focus ? `${possessive(focus.given)} ${relationship(ix, focusId, id)}` : '';
  const ev = p.events.filter((e) => e.type !== 'birth' && e.type !== 'death').slice(0, 3);
  const W = 260;
  const left = x + W + 12 > bounds.w ? x - W - 12 : x + 12;
  const top = Math.max(8, Math.min(bounds.h - 200, y - 30));
  const a = age(p);
  return (
    <div className="hover-card" style={{ left, top, width: W }} role="tooltip">
      <div className="hc-head">
        <Avatar p={p} color={colorer.color(p.id)} size={40} />
        <div><b>{fullName(p)}</b><div className="muted small">{lifeSpan(p)}{!isNaN(a) ? ` · ${isLiving(p) ? `age ${a}` : `lived ${a} yrs`}` : ''}</div></div>
      </div>
      <div className="hc-rel">{rel}</div>
      {p.birthPlace && <div className="small">{flagOf(p.birthPlace)} {p.birthPlace}</div>}
      {p.occupation && <div className="small muted">{p.occupation}</div>}
      {ev.length > 0 && <ul className="hc-ev">{ev.map((e) => <li key={e.id}><b>{e.year}</b> {e.title}</li>)}</ul>}
      <div className="hc-foot muted small">{childrenOf(ix, p.id).length} children · {p.media.length} memories · double-click to center the tree on {p.given}</div>
    </div>
  );
}

/* ---------------- Journey caption ---------------- */

export function JourneyCaption({ route, i, playing, onPrev, onNext, onToggle, onStop }: { route: string[]; i: number; playing: boolean; onPrev: () => void; onNext: () => void; onToggle: () => void; onStop: () => void }) {
  const { ix, colorer } = useDerived();
  const p = ix.byId.get(route[i]);
  if (!p) return null;
  const gens = route.length - 1;
  return (
    <div className="journey-cap" role="region" aria-label="Family journey">
      <div className="jc-progress"><span style={{ width: `${((i + 1) / route.length) * 100}%` }} /></div>
      <div className="jc-body" key={p.id}>
        <Avatar p={p} color={colorer.color(p.id)} size={56} />
        <div className="grow">
          <div className="jc-step">{i === 0 ? 'Where it begins' : i === route.length - 1 ? 'And here you are' : `Generation ${i + 1} of ${gens + 1}`}</div>
          <h3>{fullName(p)} <span className="muted">{lifeSpan(p)}</span></h3>
          <p>{narrate(p, ix)}</p>
        </div>
      </div>
      <div className="jc-ctrls">
        <button className="icon-btn" onClick={onPrev} disabled={i === 0} aria-label="Previous person"><SkipBack size={17} /></button>
        <button className="icon-btn jc-play" onClick={onToggle} aria-label={playing ? 'Pause' : 'Play'}>{playing ? <Pause size={18} /> : <Play size={18} />}</button>
        <button className="icon-btn" onClick={onNext} disabled={i === route.length - 1} aria-label="Next person"><SkipForward size={17} /></button>
        <span className="muted small">{i + 1} / {route.length}</span>
        <span className="grow" />
        <button className="btn sm" onClick={onStop}><Square size={13} /> End journey</button>
      </div>
    </div>
  );
}
