import { useMemo, useState } from 'react';
import { useStore, useDerived } from '../store';
import { findEchoes, type Echo } from '../lib/echoes';
import { Avatar } from './Avatar';
import { Network } from 'lucide-react';

export function useEchoes() {
  const { people, ix } = useDerived();
  return useMemo(() => findEchoes(people, ix), [people, ix]);
}

export function EchoCard({ e, compact }: { e: Echo; compact?: boolean }) {
  const { ix, colorer } = useDerived();
  const { set, select } = useStore.getState();
  const ppl = e.people.map((id) => ix.byId.get(id)).filter(Boolean).slice(0, compact ? 5 : 8);
  return (
    <div className={`echo-card ${compact ? 'compact' : ''}`}>
      <div className="echo-ic">{e.icon}</div>
      <div className="grow">
        <h4>{e.title}</h4>
        <p>{e.detail}</p>
        {ppl.length > 0 && (
          <div className="echo-people">
            {ppl.map((p) => <button key={p!.id} onClick={() => select(p!.id)} title={p!.given}><Avatar p={p!} color={colorer.color(p!.id)} size={26} /></button>)}
            {e.people.length > ppl.length && <span className="muted small">+{e.people.length - ppl.length}</span>}
            {e.people.length > 1 && <button className="link echo-spot" onClick={() => set({ spotlight: { ids: e.people, label: e.title }, view: 'tree', path: null })}><Network size={13} /> Show on tree</button>}
          </div>
        )}
      </div>
    </div>
  );
}

/** The full "Family echoes" section used on the Insights page. */
export function EchoSection() {
  const echoes = useEchoes();
  const [all, setAll] = useState(false);
  if (!echoes.length) return null;
  const shown = all ? echoes : echoes.slice(0, 6);
  return (
    <section className="echoes">
      <div className="echo-head">
        <h2 className="sec-title" style={{ margin: 0 }}>Family echoes <span className="muted small">· patterns that repeat across generations</span></h2>
      </div>
      <div className="echo-grid">{shown.map((e) => <EchoCard key={e.id} e={e} />)}</div>
      {echoes.length > 6 && <button className="link" onClick={() => setAll(!all)}>{all ? 'Show fewer' : `Show all ${echoes.length} echoes`}</button>}
    </section>
  );
}
