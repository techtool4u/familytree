import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore, useDerived } from '../store';
import { relationship, findPath, fullName, lifeSpan, possessive, parentsOf, childrenOf } from '../lib/graph';
import { Avatar } from './Avatar';
import { X, ArrowLeftRight, Search, ChevronRight } from 'lucide-react';
import type { Index } from '../lib/graph';
import type { Person } from '../types';

/** What `next` is to `prev`, in one word: "father", "daughter", "wife"… */
function stepWord(ix: Index, prev: string, next: string) {
  const N = ix.byId.get(next)!;
  const g = (m: string, f: string, u: string) => (N.gender === 'M' ? m : N.gender === 'F' ? f : u);
  if (parentsOf(ix, prev).includes(next)) return g('father', 'mother', 'parent');
  if (childrenOf(ix, prev).includes(next)) return g('son', 'daughter', 'child');
  return g('husband', 'wife', 'partner');
}

/**
 * Docked "How are they related?" bar. It sits at the bottom of the tree instead of a pop-up:
 * the path is drawn on the tree itself, and clicking any card swaps who is being compared.
 */
export default function RelationBar() {
  const pair = useStore((s) => s.relPair)!;
  const slot = useStore((s) => s.relSlot);
  const { ix, colorer } = useDerived();
  const set = useStore((s) => s.set);
  const A = ix.byId.get(pair.a), B = pair.b ? ix.byId.get(pair.b) : undefined;

  const res = useMemo(() => {
    if (!A || !B || A.id === B.id) return null;
    const path = findPath(ix, A.id, B.id);
    let top: Person | undefined;
    if (path) for (let i = 1; i < path.length - 1; i++) {
      const kids = childrenOf(ix, path[i]);
      if (kids.includes(path[i - 1]) && kids.includes(path[i + 1])) top = ix.byId.get(path[i]);
    }
    return { path, term: relationship(ix, A.id, B.id), back: relationship(ix, B.id, A.id), top };
  }, [ix, A, B]);

  // draw the path on the tree while the bar is open
  useEffect(() => {
    set({ path: res?.path && res.path.length > 1 ? res.path : null });
  }, [res, set]);

  const close = () => set({ relPair: null, path: null });
  const pick = (id: string) => set(slot === 'a' ? { relPair: { ...pair, a: id }, relSlot: 'b' } : { relPair: { ...pair, b: id } });

  return (
    <div className="rel-bar" role="region" aria-label="How are they related">
      <div className="rb-top">
        <Slot p={A} active={slot === 'a'} label="First person" onActivate={() => set({ relSlot: 'a' })} onPick={(id) => set({ relPair: { ...pair, a: id }, relSlot: 'b' })} color={A ? colorer.color(A.id) : ''} />
        <button className="icon-btn" title="Swap" onClick={() => pair.b && set({ relPair: { a: pair.b, b: pair.a } })} disabled={!pair.b}><ArrowLeftRight size={16} /></button>
        <Slot p={B} active={slot === 'b'} label="Second person" onActivate={() => set({ relSlot: 'b' })} onPick={(id) => pick(id)} color={B ? colorer.color(B.id) : ''} />
        <span className="grow" />
        <button className="icon-btn" onClick={close} aria-label="Close"><X size={17} /></button>
      </div>

      {!B && <p className="rb-hint">👆 Click anyone on the tree, or choose a name here, to see how they’re related to {A?.given}.</p>}
      {A && B && A.id === B.id && <p className="rb-hint">That’s the same person. Click someone else on the tree.</p>}

      {res && A && B && (
        <div className="rb-result" key={A.id + B.id}>
          <div className="rb-answer">
            <span className="rb-big">{B.given} is {possessive(A.given)} <em>{res.term}</em></span>
            {res.back !== res.term && <span className="muted"> · and {A.given} is {possessive(B.given)} {res.back}</span>}
          </div>
          {res.path && res.path.length > 1 ? (
            <div className="rb-chain">
              {res.path.map((id, i) => {
                const p = ix.byId.get(id)!;
                return (
                  <div key={id} className="rb-step">
                    {i > 0 && <span className="rb-link"><ChevronRight size={14} /><span>{stepWord(ix, res.path![i - 1], id)}</span></span>}
                    <button className={`rb-node ${id === res.top?.id ? 'top' : ''} ${i === 0 || i === res.path!.length - 1 ? 'end' : ''}`} onClick={() => useStore.getState().select(id, true)} title={`${fullName(p)} · ${lifeSpan(p)}`}>
                      <Avatar p={p} color={colorer.color(id)} size={28} /><span>{p.given}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          ) : <p className="rb-hint">They aren’t connected in this tree yet.</p>}
          {res.top && <p className="rb-foot">Shared ancestor: <b>{fullName(res.top)}</b> <span className="muted">{lifeSpan(res.top)}</span> · {res.path!.length - 1} steps apart</p>}
          {!res.top && res.path && res.path.length > 1 && <p className="rb-foot">{res.path.length - 1} step{res.path.length > 2 ? 's' : ''} apart · click any card to compare {slot === 'a' ? 'from someone else' : `${A.given} with someone else`}</p>}
        </div>
      )}
    </div>
  );
}

function Slot({ p, active, label, onActivate, onPick, color }: { p?: Person; active: boolean; label: string; onActivate: () => void; onPick: (id: string) => void; color: string }) {
  const { people, colorer } = useDerived();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  const list = people.filter((x) => `${fullName(x)} ${x.birthSurname ?? ''}`.toLowerCase().includes(q.toLowerCase())).slice(0, 8);
  return (
    <div className={`rb-slot ${active ? 'active' : ''}`} ref={ref}>
      <button className="rb-slot-btn" onClick={() => { onActivate(); setOpen(true); }} aria-label={`${label}: ${p ? fullName(p) : 'not chosen'}`}>
        {p ? <><Avatar p={p} color={color} size={30} /><span><b>{p.given}</b><span className="muted small"> {p.surname}</span></span></> : <><span className="rb-empty"><Search size={14} /></span><span className="muted">Choose someone</span></>}
      </button>
      {open && (
        <div className="rb-pop">
          <input autoFocus placeholder="Type a name…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && list[0]) { onPick(list[0].id); setOpen(false); setQ(''); } if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } }} />
          {list.map((x) => (
            <button key={x.id} onClick={() => { onPick(x.id); setOpen(false); setQ(''); }}>
              <Avatar p={x} color={colorer.color(x.id)} size={22} />{fullName(x)} <span className="muted small">{lifeSpan(x)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
