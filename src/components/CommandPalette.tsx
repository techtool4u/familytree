import { useEffect, useMemo, useState } from 'react';
import { useStore, useDerived } from '../store';
import { fullName, lifeSpan, relationship } from '../lib/graph';
import { Avatar } from './Avatar';
import type { ViewId } from '../types';

interface Item { key: string; label: string; sub?: string; run: () => void; person?: string }

export default function CommandPalette({ actions }: { actions: { label: string; run: () => void }[] }) {
  const { people, colorer, ix, focusId } = useDerived();
  const set = useStore((s) => s.set);
  const [q, setQ] = useState('');
  const [i, setI] = useState(0);
  const close = () => set({ paletteOpen: false });

  const items = useMemo<Item[]>(() => {
    const t = q.toLowerCase().trim();
    const ppl = people
      .filter((p) => !t || `${fullName(p)} ${p.birthSurname ?? ''} ${p.birthPlace ?? ''} ${p.occupation ?? ''}`.toLowerCase().includes(t))
      .slice(0, t ? 8 : 5)
      .map((p) => ({ key: p.id, person: p.id, label: fullName(p), sub: `${lifeSpan(p)} · ${p.id === focusId ? 'focus' : relationship(ix, focusId, p.id)}`, run: () => { useStore.getState().select(p.id, true); close(); } }));
    const views: [ViewId, string][] = [['today', 'Today'], ['time', 'Time machine'], ['stories', 'Stories · Ask the elders'], ['tree', 'Family tree'], ['fan', 'Fan chart'], ['radial', 'Descendants wheel'], ['timeline', 'Timeline'], ['map', 'Migration map'], ['insights', 'Insights']];
    const cmds: Item[] = [
      ...views.map(([v, l]) => ({ key: 'v' + v, label: `Go to ${l}`, sub: 'View', run: () => { set({ view: v }); close(); } })),
      ...actions.map((a) => ({ key: 'a' + a.label, label: a.label, sub: 'Action', run: () => { a.run(); close(); } })),
    ].filter((c) => !t || c.label.toLowerCase().includes(t));
    return [...ppl, ...cmds];
  }, [q, people, ix, focusId, actions]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => setI(0), [q]);

  return (
    <div className="modal-bg top" onClick={close}>
      <div className="palette" role="dialog" aria-label="Command palette" onClick={(e) => e.stopPropagation()}>
        <input autoFocus placeholder="Search people, places, or type a command…" value={q} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setI((x) => Math.min(items.length - 1, x + 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setI((x) => Math.max(0, x - 1)); }
            if (e.key === 'Enter') items[i]?.run();
            if (e.key === 'Escape') close();
          }} />
        <div className="pal-list">
          {items.map((it, k) => {
            const p = it.person ? ix.byId.get(it.person) : undefined;
            return (
              <button key={it.key} className={k === i ? 'on' : ''} onMouseEnter={() => setI(k)} onClick={it.run}>
                {p ? <Avatar p={p} color={colorer.color(p.id)} size={28} /> : <span className="pal-ic">›</span>}
                <span className="grow"><b>{it.label}</b>{it.sub && <span className="muted"> · {it.sub}</span>}</span>
              </button>
            );
          })}
          {!items.length && <div className="muted pad">No matches</div>}
        </div>
        <div className="pal-foot muted">↑↓ to move · Enter to open · Esc to close</div>
      </div>
    </div>
  );
}
