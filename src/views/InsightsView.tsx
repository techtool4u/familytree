import { useMemo, useState } from 'react';
import { useStore, useDerived } from '../store';
import { birthYear, deathYear, isLiving, age, fullName, lifeSpan, CURRENT_YEAR, parentsOf } from '../lib/graph';
import { countryOf } from '../data/places';
import { Avatar } from '../components/Avatar';
import { EchoSection } from '../components/EchoCards';

export default function InsightsView() {
  const { people, ix, gen, colorer, matched, branch } = useDerived();
  const select = useStore((s) => s.select);
  const pool = people.filter((p) => matched.has(p.id));
  const [hoverBar, setHoverBar] = useState<number | null>(null);

  const s = useMemo(() => {
    const dead = pool.filter((p) => !isLiving(p) && !isNaN(deathYear(p)));
    const avgLife = dead.length ? Math.round(dead.reduce((a, p) => a + age(p), 0) / dead.length) : 0;
    const gens = new Set(pool.map((p) => gen.get(p.id)));
    const countries = new Map<string, number>();
    pool.forEach((p) => { const c = countryOf(p.birthPlace); if (c) countries.set(c, (countries.get(c) ?? 0) + 1); });
    const surnames = new Map<string, number>();
    pool.forEach((p) => { const sn = p.birthSurname ?? p.surname; surnames.set(sn, (surnames.get(sn) ?? 0) + 1); });
    const decades = new Map<number, number>();
    pool.forEach((p) => { const b = birthYear(p); if (!isNaN(b)) { const d = Math.floor(b / 10) * 10; decades.set(d, (decades.get(d) ?? 0) + 1); } });
    const dk = [...decades.keys()];
    const allDec: [number, number][] = [];
    if (dk.length) for (let d = Math.min(...dk); d <= Math.max(...dk); d += 10) allDec.push([d, decades.get(d) ?? 0]);
    const longest = dead.slice().sort((a, b) => age(b) - age(a))[0];
    const oldest = pool.slice().sort((a, b) => birthYear(a) - birthYear(b))[0];
    const today = new Date();
    const upcoming = pool.filter((p) => isLiving(p) && p.birthDate && p.birthDate.length >= 10).map((p) => {
      const [, m, d] = p.birthDate!.split('-').map(Number);
      let next = new Date(today.getFullYear(), m - 1, d);
      if (next < new Date(today.getFullYear(), today.getMonth(), today.getDate())) next = new Date(today.getFullYear() + 1, m - 1, d);
      return { p, next, days: Math.round((next.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 864e5), turning: next.getFullYear() - birthYear(p) };
    }).sort((a, b) => a.days - b.days).slice(0, 6);
    const gaps = pool.filter((p) => parentsOf(ix, p.id).length < 2 && (gen.get(p.id) ?? 0) <= 0).length;
    const noPlace = pool.filter((p) => !p.birthPlace).length;
    const immigrants = pool.filter((p) => p.events.some((e) => e.type === 'migration')).length;
    return { dead, avgLife, gens, countries, surnames, allDec, longest, oldest, upcoming, gaps, noPlace, immigrants };
  }, [pool, gen, ix]);

  const maxDec = Math.max(1, ...s.allDec.map((d) => d[1]));
  const topSurnames = [...s.surnames.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxSn = Math.max(1, ...topSurnames.map((x) => x[1]));
  const topCountries = [...s.countries.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxC = Math.max(1, ...topCountries.map((x) => x[1]));
  const branchCounts = branch.branches.map((b) => ({ ...b, n: pool.filter((p) => branch.branchOf.get(p.id) === b.key).length, color: colorer.title === 'Family line' ? colorer.legend.find((l) => l.label === b.label)?.color ?? b.color : b.color })).filter((b) => b.n);

  return (
    <div className="view insights-view">
      <div className="insights">
        <p className="muted small">{pool.length === people.length ? 'Whole tree' : `${pool.length} of ${people.length} people match your filters`}</p>
        <EchoSection />
        <h2 className="sec-title">By the numbers</h2>
        <div className="tiles">
          <div className="tile"><div className="tv">{pool.length}</div><div className="tl">People</div></div>
          <div className="tile"><div className="tv">{s.gens.size}</div><div className="tl">Generations</div></div>
          <div className="tile"><div className="tv">{pool.filter(isLiving).length}</div><div className="tl">Living</div></div>
          <div className="tile"><div className="tv">{s.countries.size}</div><div className="tl">Birth countries</div></div>
          <div className="tile"><div className="tv">{s.avgLife || '–'}</div><div className="tl">Avg. lifespan (yrs)</div></div>
          <div className="tile"><div className="tv">{s.immigrants}</div><div className="tl">Migrated</div></div>
        </div>

        <div className="cards">
          <section className="card-box wide">
            <h3>Births by decade</h3>
            <div className="bars">
              {s.allDec.map(([d, n]) => (
                <div key={d} className="bar-col" onMouseEnter={() => setHoverBar(d)} onMouseLeave={() => setHoverBar(null)}>
                  {hoverBar === d && <div className="bar-tip">{d}s · {n} born</div>}
                  <div className="bar-v" style={{ height: `${(n / maxDec) * 100}%` }} />
                  <div className="bar-l">{d % 20 === 0 ? `'${String(d).slice(2)}` : ''}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="card-box">
            <h3>Family lines</h3>
            {branchCounts.map((b) => (
              <div key={b.key} className="hbar"><span className="hbar-l"><span className="dot" style={{ background: b.color }} />{b.label}</span><span className="hbar-n">{b.n}</span></div>
            ))}
          </section>

          <section className="card-box">
            <h3>Surnames</h3>
            {topSurnames.map(([n, c]) => (
              <div key={n} className="hbar"><span className="hbar-l">{n}</span><span className="hbar-track"><span style={{ width: `${(c / maxSn) * 100}%` }} /></span><span className="hbar-n">{c}</span></div>
            ))}
          </section>

          <section className="card-box">
            <h3>Where we were born</h3>
            {topCountries.map(([n, c]) => (
              <div key={n} className="hbar"><span className="hbar-l">{n}</span><span className="hbar-track"><span style={{ width: `${(c / maxC) * 100}%` }} /></span><span className="hbar-n">{c}</span></div>
            ))}
          </section>

          <section className="card-box">
            <h3>Upcoming birthdays</h3>
            {s.upcoming.length === 0 && <p className="muted">No living people with full birth dates.</p>}
            {s.upcoming.map(({ p, days, turning, next }) => (
              <button key={p.id} className="row-btn" onClick={() => select(p.id)}>
                <Avatar p={p} color={colorer.color(p.id)} size={30} />
                <span className="grow"><b>{fullName(p)}</b><br /><span className="muted">turns {turning} · {next.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span></span>
                <span className="pill">{days === 0 ? 'Today 🎂' : `${days}d`}</span>
              </button>
            ))}
          </section>

          <section className="card-box">
            <h3>Records</h3>
            {s.oldest && <button className="row-btn" onClick={() => select(s.oldest.id)}><Avatar p={s.oldest} color={colorer.color(s.oldest.id)} size={30} /><span className="grow"><b>Earliest ancestor</b><br /><span className="muted">{fullName(s.oldest)} · {lifeSpan(s.oldest)}</span></span></button>}
            {s.longest && <button className="row-btn" onClick={() => select(s.longest.id)}><Avatar p={s.longest} color={colorer.color(s.longest.id)} size={30} /><span className="grow"><b>Longest life</b><br /><span className="muted">{fullName(s.longest)} · {age(s.longest)} years</span></span></button>}
            <div className="research">
              <h4>Research to-do</h4>
              <p>🔍 {s.gaps} ancestors or relatives with a missing parent</p>
              <p>📍 {s.noPlace} people without a birthplace</p>
              <p className="muted small">Tip: the fan chart shows gaps as empty “+ father / + mother” slots.</p>
            </div>
          </section>
        </div>
        <p className="muted small">Data as of {CURRENT_YEAR}. Statistics follow the active filters.</p>
      </div>
    </div>
  );
}
