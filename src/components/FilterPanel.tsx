import { useMemo } from 'react';
import { useStore, useDerived, DEFAULT_FILTERS } from '../store';
import { birthYear, activeFilterCount, ancestorsOf } from '../lib/graph';
import { countryOf, findPlace } from '../data/places';
import type { ColorMode, Filters, Scope } from '../types';
import { Search, X, SlidersHorizontal, Sparkles } from 'lucide-react';

function Seg<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="seg" role="radiogroup">
      {options.map(([v, l]) => <button key={v} role="radio" aria-checked={value === v} className={value === v ? 'on' : ''} onClick={() => onChange(v)}>{l}</button>)}
    </div>
  );
}

function DualRange({ min, max, lo, hi, onChange, fmt = String }: { min: number; max: number; lo: number; hi: number; onChange: (lo: number, hi: number) => void; fmt?: (n: number) => string }) {
  const L = Math.max(min, Math.min(lo, max)), H = Math.min(max, Math.max(hi, min));
  const pct = (v: number) => ((v - min) / Math.max(1, max - min)) * 100;
  return (
    <div className="dual">
      <div className="dual-vals"><span>{fmt(L)}</span><span>{fmt(H)}</span></div>
      <div className="dual-track">
        <div className="dual-fill" style={{ left: `${pct(L)}%`, right: `${100 - pct(H)}%` }} />
        <input type="range" min={min} max={max} value={L} onChange={(e) => onChange(Math.min(+e.target.value, H), H)} aria-label="minimum" />
        <input type="range" min={min} max={max} value={H} onChange={(e) => onChange(L, Math.max(+e.target.value, L))} aria-label="maximum" />
      </div>
    </div>
  );
}

function Chips({ items, selected, onToggle, colorOf }: { items: { key: string; label: string; n: number }[]; selected: string[]; onToggle: (k: string) => void; colorOf?: (k: string) => string | undefined }) {
  return (
    <div className="chips">
      {items.map((it) => (
        <button key={it.key} className={`chip ${selected.includes(it.key) ? 'on' : ''}`} onClick={() => onToggle(it.key)} aria-pressed={selected.includes(it.key)}>
          {colorOf?.(it.key) && <span className="dot" style={{ background: colorOf(it.key) }} />}
          {it.label}<span className="chip-n">{it.n}</span>
        </button>
      ))}
    </div>
  );
}

export default function FilterPanel() {
  const { people, ix, gen, branch, matched, focusId, filters, colorer } = useDerived();
  const setFilters = useStore((s) => s.setFilters);
  const colorMode = useStore((s) => s.colorMode);
  const set = useStore((s) => s.set);
  const focus = ix.byId.get(focusId);

  const stats = useMemo(() => {
    const count = (keys: (string | undefined)[]) => {
      const m = new Map<string, number>();
      keys.forEach((k) => k && m.set(k, (m.get(k) ?? 0) + 1));
      return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([key, n]) => ({ key, label: key, n }));
    };
    const gs = people.map((p) => gen.get(p.id) ?? 0);
    const ys = people.map(birthYear).filter((y) => !isNaN(y));
    return {
      surnames: count(people.flatMap((p) => [...new Set([p.surname, p.birthSurname])])),
      countries: count(people.map((p) => countryOf(p.birthPlace))).map((c) => ({ ...c, label: `${findPlace(people.find((p) => countryOf(p.birthPlace) === c.key)?.birthPlace)?.flag ?? ''} ${c.key}` })),
      tags: count(people.flatMap((p) => p.tags)),
      gMin: Math.min(...gs), gMax: Math.max(...gs),
      yMin: Math.floor(Math.min(...ys) / 5) * 5, yMax: Math.ceil(Math.max(...ys) / 5) * 5,
    };
  }, [people, gen]);

  const branchItems = branch.branches.map((b) => ({ key: b.key, label: b.label, n: [...branch.branchOf.values()].filter((v) => v === b.key).length })).filter((b) => b.n);
  const branchColor = (k: string) => colorMode === 'branch' ? colorer.legend.find((l) => l.label === branch.branches.find((b) => b.key === k)?.label)?.color : branch.branches.find((b) => b.key === k)?.color;
  const toggle = (key: 'surnames' | 'countries' | 'branches' | 'tags', v: string) => {
    const cur = filters[key];
    setFilters({ [key]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] } as Partial<Filters>);
  };
  const n = activeFilterCount(filters, DEFAULT_FILTERS);
  const genFmt = (g: number) => (g === 0 ? 'Focus' : g > 0 ? `+${g}` : `${g}`);

  const paternal = branch.branches.slice(0, 2).filter((b) => b.key.startsWith('line:')).map((b) => b.key);
  const maternal = branch.branches.slice(2, 4).filter((b) => b.key.startsWith('line:')).map((b) => b.key);
  const presets: { label: string; f: Partial<Filters> }[] = [
    { label: 'Living relatives', f: { status: 'living' } },
    { label: 'Immigrants', f: { tags: ['Immigrant'] } },
    { label: 'Direct line', f: { scope: 'direct' } },
    { label: 'Paternal side', f: { branches: paternal } },
    { label: 'Maternal side', f: { branches: maternal } },
    { label: 'Born before 1920', f: { yearMax: 1920 } },
    { label: 'Women of the family', f: { gender: 'F' } },
    { label: 'Served in the military', f: { tags: ['Military'] } },
  ];
  const ancCount = useMemo(() => ancestorsOf(ix, focusId).size - 1, [ix, focusId]);

  return (
    <aside className="filters" aria-label="Filters">
      <div className="f-head">
        <SlidersHorizontal size={16} /> <b>Filters</b>
        {n > 0 && <span className="badge">{n}</span>}
        <span className="grow" />
        {n > 0 && <button className="link" onClick={() => setFilters({ ...DEFAULT_FILTERS, mode: filters.mode })}>Clear all</button>}
        <button className="icon-btn only-mobile" onClick={() => set({ filtersOpen: false })} aria-label="Close filters"><X size={18} /></button>
      </div>

      <div className="f-scroll">
        <div className="searchbox">
          <Search size={15} />
          <input placeholder="Name, place, job, tag…" value={filters.text} onChange={(e) => setFilters({ text: e.target.value })} />
          {filters.text && <button className="x" onClick={() => setFilters({ text: '' })} aria-label="Clear search">×</button>}
        </div>

        {filters.aliveIn != null && (
          <div className="f-sec">
            <div className="f-label">Time machine</div>
            <button className="chip on" onClick={() => setFilters({ aliveIn: null })}>Alive in {filters.aliveIn} ×</button>
          </div>
        )}
        <div className="f-sec">
          <div className="f-label"><Sparkles size={13} /> Quick views</div>
          <div className="chips">
            {presets.map((p) => <button key={p.label} className="chip ghost" onClick={() => setFilters({ ...DEFAULT_FILTERS, mode: filters.mode, ...p.f })}>{p.label}</button>)}
          </div>
        </div>

        <div className="f-sec">
          <div className="f-label">When filtering</div>
          <Seg value={filters.mode} options={[['highlight', 'Highlight matches'], ['hide', 'Hide others']]} onChange={(v) => setFilters({ mode: v })} />
        </div>

        <div className="f-sec">
          <div className="f-label">Color people by</div>
          <select className="full" value={colorMode} onChange={(e) => set({ colorMode: e.target.value as ColorMode })}>
            <option value="branch">Family line (grandparents)</option>
            <option value="surname">Birth surname</option>
            <option value="country">Birth country</option>
            <option value="generation">Generation</option>
            <option value="lifespan">Age reached</option>
            <option value="gender">Gender</option>
            <option value="none">No color</option>
          </select>
        </div>

        <div className="f-sec">
          <div className="f-label">Relative to {focus?.given ?? 'focus'}</div>
          <Seg<Scope> value={filters.scope} options={[['all', 'Everyone'], ['hourglass', 'Hourglass'], ['ancestors', `Ancestors (${ancCount})`], ['descendants', 'Descendants'], ['direct', 'Direct + siblings']]} onChange={(v) => setFilters({ scope: v })} />
        </div>

        <div className="f-sec">
          <div className="f-label">Generations</div>
          <DualRange min={stats.gMin} max={stats.gMax} lo={filters.genMin} hi={filters.genMax} fmt={genFmt} onChange={(lo, hi) => setFilters({ genMin: lo === stats.gMin ? -99 : lo, genMax: hi === stats.gMax ? 99 : hi })} />
        </div>

        {isFinite(stats.yMin) && <div className="f-sec">
          <div className="f-label">Born between</div>
          <DualRange min={stats.yMin} max={stats.yMax} lo={filters.yearMin} hi={filters.yearMax} onChange={(lo, hi) => setFilters({ yearMin: lo === stats.yMin ? 0 : lo, yearMax: hi === stats.yMax ? 9999 : hi })} />
        </div>}

        <div className="f-sec two">
          <div>
            <div className="f-label">Status</div>
            <Seg value={filters.status} options={[['all', 'All'], ['living', 'Living'], ['deceased', 'Deceased']]} onChange={(v) => setFilters({ status: v })} />
          </div>
          <div>
            <div className="f-label">Gender</div>
            <Seg value={filters.gender} options={[['all', 'All'], ['M', 'Men'], ['F', 'Women']]} onChange={(v) => setFilters({ gender: v })} />
          </div>
        </div>

        <div className="f-sec">
          <div className="f-label">Family line</div>
          <Chips items={branchItems} selected={filters.branches} onToggle={(k) => toggle('branches', k)} colorOf={branchColor} />
        </div>
        <div className="f-sec">
          <div className="f-label">Surname <span className="muted">(incl. birth names)</span></div>
          <Chips items={stats.surnames} selected={filters.surnames} onToggle={(k) => toggle('surnames', k)} />
        </div>
        <div className="f-sec">
          <div className="f-label">Born in</div>
          <Chips items={stats.countries} selected={filters.countries} onToggle={(k) => toggle('countries', k)} />
        </div>
        {stats.tags.length > 0 && (
          <div className="f-sec">
            <div className="f-label">Tags</div>
            <Chips items={stats.tags} selected={filters.tags} onToggle={(k) => toggle('tags', k)} />
          </div>
        )}
      </div>
      <div className="f-foot"><b>{matched.size}</b> of {people.length} people match</div>
    </aside>
  );
}
