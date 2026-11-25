import { useEffect, useMemo, useState } from 'react';
import { useStore, useDerived } from '../store';
import { aliveIn, birthYear, deathYear, fullName, CURRENT_YEAR, placeIn } from '../lib/graph';
import { worldContext } from '../lib/history';
import { findPlace, flagOf, countryOf } from '../data/places';
import { phrase } from '../lib/daily';
import { Avatar } from '../components/Avatar';
import { Play, Pause, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Network } from 'lucide-react';
import type { Person } from '../types';

const residence = (p: Person, year: number) => placeIn(p, year);

export default function TimeMachineView() {
  const { people, colorer, focusId, ix, gen, matched, filters } = useDerived();
  const { select, set, setFilters } = useStore.getState();
  const timeYear = useStore((s) => s.timeYear);
  const focus = ix.byId.get(focusId);
  const years = people.map(birthYear).filter((y) => !isNaN(y));
  const minY = years.length ? Math.min(...years) : CURRENT_YEAR - 100;
  const [year, setYear] = useState(() => timeYear ?? (focus && !isNaN(birthYear(focus)) ? birthYear(focus) : CURRENT_YEAR));
  const [playing, setPlaying] = useState(false);
  const [group, setGroup] = useState<'place' | 'generation'>('place');

  useEffect(() => { if (timeYear) setYear(timeYear); }, [timeYear]);
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setYear((y) => { if (y >= CURRENT_YEAR) { setPlaying(false); return y; } return y + 1; }), 260);
    return () => clearInterval(t);
  }, [playing]);

  const pool = people.filter((p) => filters.mode === 'highlight' || matched.has(p.id));
  const alive = useMemo(() => pool.filter((p) => aliveIn(p, year)), [pool, year]);
  const groups = useMemo(() => {
    const m = new Map<string, Person[]>();
    for (const p of alive) {
      const k = group === 'place' ? (findPlace(residence(p, year))?.name ?? residence(p, year) ?? 'Unknown place') : String(gen.get(p.id) ?? 0);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(p);
    }
    for (const list of m.values()) list.sort((a, b) => birthYear(a) - birthYear(b));
    const entries = [...m.entries()];
    return group === 'place' ? entries.sort((a, b) => b[1].length - a[1].length) : entries.sort((a, b) => +a[0] - +b[0]);
  }, [alive, group, year, gen]);

  const happenings = useMemo(() => {
    const out: { p: Person; text: string; icon: string }[] = [];
    for (const p of pool) {
      if (birthYear(p) === year) out.push({ p, text: `${p.given} is born${p.birthPlace ? ` in ${p.birthPlace.split(',')[0]}` : ''}`, icon: '👶' });
      if (deathYear(p) === year) out.push({ p, text: `${p.given} passes away`, icon: '🕯️' });
      for (const e of p.events) if (e.year === year && e.type !== 'birth' && e.type !== 'death' && !(e.type === 'marriage' && p.gender === 'F' && p.spouseIds.some((s) => e.title.includes(ix.byId.get(s)?.given ?? '#')))) out.push({ p, text: phrase(p, e), icon: e.type === 'migration' ? '✈️' : e.type === 'marriage' ? '💍' : e.type === 'military' ? '🎖️' : e.type === 'education' ? '🎓' : '💼' });
    }
    return out;
  }, [pool, year, ix]);

  const milestones = useMemo(() => pool.flatMap((p) => p.events.filter((e) => e.type === 'migration' || (e.type === 'marriage' && p.gender !== 'F')).map((e) => ({ year: e.year, label: e.type === 'migration' ? `✈️ ${p.given} → ${(e.toPlace ?? '').split(',')[0]}` : `💍 ${p.given}’s wedding` })))
    .sort((a, b) => a.year - b.year), [pool]);
  const countries = new Set(alive.map((p) => countryOf(residence(p, year))).filter(Boolean)).size;
  const oldest = alive.reduce<Person | null>((o, p) => (!o || birthYear(p) < birthYear(o) ? p : o), null);
  const youngest = alive.reduce<Person | null>((o, p) => (!o || birthYear(p) > birthYear(o) ? p : o), null);
  const fb = focus ? birthYear(focus) : NaN;
  const ctx = worldContext(year);
  const genName = (g: number) => (g === 0 ? 'Focus generation' : g === -1 ? 'Parents’ generation' : g === -2 ? 'Grandparents’ generation' : g < 0 ? `${-g} generations up` : g === 1 ? 'Children' : `${g} generations down`);

  if (!years.length) return <div className="view"><div className="empty-state">The time machine needs birth years. Add them to people to travel through your family’s history.</div></div>;

  return (
    <div className="view time-view">
      <div className="today">
        <div className="tm-bar">
          <button className="icon-btn" onClick={() => setYear(Math.max(minY, year - 10))} title="Back 10 years"><ChevronsLeft size={18} /></button>
          <button className="icon-btn" onClick={() => setYear(Math.max(minY, year - 1))} title="Back 1 year"><ChevronLeft size={18} /></button>
          <div className="tm-year">{year}</div>
          <button className="icon-btn" onClick={() => setYear(Math.min(CURRENT_YEAR, year + 1))} title="Forward 1 year"><ChevronRight size={18} /></button>
          <button className="icon-btn" onClick={() => setYear(Math.min(CURRENT_YEAR, year + 10))} title="Forward 10 years"><ChevronsRight size={18} /></button>
          <button className="btn sm" onClick={() => { if (year >= CURRENT_YEAR) setYear(minY); setPlaying(!playing); }}>{playing ? <Pause size={14} /> : <Play size={14} />} {playing ? 'Pause' : 'Travel'}</button>
          <input className="tm-slider" type="range" min={minY} max={CURRENT_YEAR} value={year} onChange={(e) => { setPlaying(false); setYear(+e.target.value); }} aria-label="Year" />
        </div>
        <div className="chips tm-chips">
          {focus && !isNaN(fb) && <button className="chip ghost" onClick={() => setYear(fb)}>🌱 {focus.given} is born · {fb}</button>}
          {milestones.map((m) => <button key={m.label + m.year} className={`chip ghost ${m.year === year ? 'on' : ''}`} onClick={() => setYear(m.year)}>{m.year} · {m.label}</button>)}
        </div>

        <section className="tm-headline">
          <h1>In {year}, <span className="accent">{alive.length}</span> of your family {alive.length === 1 ? 'was' : 'were'} alive{countries > 1 ? <>, across <span className="accent">{countries}</span> countries</> : ''}.</h1>
          <p className="muted">
            {focus && !isNaN(fb) && (fb > year ? `${focus.given} won’t be born for another ${fb - year} year${fb - year === 1 ? '' : 's'}. ` : `${focus.given} ${year === CURRENT_YEAR ? 'is' : 'was'} ${year - fb}. `)}
            {oldest && youngest && oldest !== youngest && `Oldest: ${oldest.given} (${year - birthYear(oldest)}). Youngest: ${youngest.given} (${Math.max(0, year - birthYear(youngest))}).`}
          </p>
          {ctx.length > 0 && <p className="tm-world">🌍 Meanwhile in the world: {ctx.join(' · ')}</p>}
        </section>

        {happenings.length > 0 && (
          <section className="card-box tm-happen">
            <h3>This year in the family</h3>
            <div className="chips">{happenings.map((h, i) => <button key={i} className="chip" onClick={() => select(h.p.id)}>{h.icon} {h.text}</button>)}</div>
          </section>
        )}

        <div className="tm-tools">
          <div className="seg" style={{ maxWidth: 320 }}>
            <button className={group === 'place' ? 'on' : ''} onClick={() => setGroup('place')}>Where they lived</button>
            <button className={group === 'generation' ? 'on' : ''} onClick={() => setGroup('generation')}>By generation</button>
          </div>
          <button className="btn sm" onClick={() => { setFilters({ aliveIn: year, mode: 'hide' }); set({ view: 'tree' }); }}><Network size={14} /> Show {year} on the tree</button>
        </div>

        <div className="tm-groups">
          {groups.map(([k, list]) => (
            <section key={k} className="tm-group">
              <h4>{group === 'place' ? <>{flagOf(k)} {k}</> : genName(+k)} <span className="muted">· {list.length}</span></h4>
              <div className="tm-people">
                {list.map((p) => {
                  const a = year - birthYear(p);
                  const isNew = birthYear(p) === year, leaving = deathYear(p) === year;
                  return (
                    <button key={p.id} className={`tm-person ${isNew ? 'new' : ''} ${leaving ? 'leaving' : ''} ${p.id === focusId ? 'me' : ''}`} onClick={() => select(p.id)} title={fullName(p)}>
                      <Avatar p={p} color={colorer.color(p.id)} size={46} />
                      <span className="tm-age">{isNew ? 'new' : a}</span>
                      <span className="tm-name">{p.given}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
          {groups.length === 0 && <p className="muted">No one in the tree was alive in {year}. Travel forward ▶</p>}
        </div>
      </div>
    </div>
  );
}
