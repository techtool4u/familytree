import { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import world from 'world-atlas/countries-110m.json';
import { useStore, useDerived } from '../store';
import { findPlace } from '../data/places';
import { birthYear, CURRENT_YEAR, fullName, lifeSpan } from '../lib/graph';
import { Play, Pause } from 'lucide-react';
import type { Person } from '../types';

const topo = world as unknown as Topology<{ countries: GeometryCollection }>;
const countries = feature(topo, topo.objects.countries) as unknown as GeoJSON.FeatureCollection;

interface Move { id: string; p: Person; from: [number, number]; to: [number, number]; year: number; title: string }

export default function MapView() {
  const { people, matched, colorer, filters } = useDerived();
  const select = useStore((s) => s.select);
  const customPlaces = useStore((s) => s.customPlaces);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 900, h: 600 });
  const [t, setT] = useState(d3.zoomIdentity);
  const minYear = useMemo(() => Math.min(...people.map(birthYear).filter((y) => !isNaN(y))), [people]);
  const [year, setYear] = useState(CURRENT_YEAR);
  const [playing, setPlaying] = useState(false);
  const [placeSel, setPlaceSel] = useState<string | null>(null);
  const [showMoves, setShowMoves] = useState(true);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const didAutoZoom = useRef(false);

  useEffect(() => {
    const z = d3.zoom<SVGSVGElement, unknown>().scaleExtent([1, 14]).on('zoom', (e) => setT(e.transform));
    zoomRef.current = z;
    d3.select(svgRef.current!).call(z);
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(svgRef.current!);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setYear((y) => { if (y >= CURRENT_YEAR) { setPlaying(false); return CURRENT_YEAR; } return y + 1; }), 90);
    return () => clearInterval(id);
  }, [playing]);

  const proj = useMemo(() => d3.geoNaturalEarth1().fitExtent([[10, 10], [size.w - 10, size.h - 10]], { type: 'Sphere' } as d3.GeoPermissibleObjects), [size]);
  const geoPath = useMemo(() => d3.geoPath(proj), [proj]);
  const pool = people.filter((p) => filters.mode === 'highlight' || matched.has(p.id));

  const places = useMemo(() => {
    const m = new Map<string, { name: string; xy: [number, number]; born: Person[]; other: Person[] }>();
    const add = (name: string | undefined, p: Person, born: boolean) => {
      const pl = findPlace(name); if (!pl) return;
      if (!m.has(pl.name)) m.set(pl.name, { name: pl.name, xy: proj([pl.lon, pl.lat])!, born: [], other: [] });
      const e = m.get(pl.name)!;
      (born ? e.born : e.other).includes(p) || (born ? e.born : e.other).push(p);
    };
    for (const p of pool) {
      const by = birthYear(p);
      if (by <= year || (isNaN(by) && year === CURRENT_YEAR)) add(p.birthPlace, p, true);
      for (const e of p.events) {
        if (e.type === 'migration' && e.year <= year) add(e.toPlace, p, false);
        if (e.type === 'residence' && e.year <= year) add(e.place, p, false);
      }
      if (p.residence && year >= CURRENT_YEAR - 1) add(p.residence, p, false);
      if (p.deathDate && +p.deathDate.slice(0, 4) <= year) add(p.deathPlace, p, false);
    }
    return [...m.values()];
  }, [pool, proj, year, customPlaces]); // eslint-disable-line react-hooks/exhaustive-deps

  const moves = useMemo(() => {
    const out: Move[] = [];
    for (const p of pool) for (const e of p.events) {
      if (e.type !== 'migration' || e.year > year) continue;
      const a = findPlace(e.place ?? p.birthPlace), b = findPlace(e.toPlace);
      if (!a || !b || a === b) continue;
      out.push({ id: e.id, p, from: proj([a.lon, a.lat])!, to: proj([b.lon, b.lat])!, year: e.year, title: e.title });
    }
    return out;
  }, [pool, proj, year, customPlaces]); // eslint-disable-line react-hooks/exhaustive-deps

  const arc = (m: Move) => {
    const [x1, y1] = m.from, [x2, y2] = m.to;
    const dx = x2 - x1, dy = y2 - y1, dist = Math.hypot(dx, dy);
    const cx = (x1 + x2) / 2 - dy * 0.25, cy = (y1 + y2) / 2 + dx * 0.25 - dist * 0.05;
    return `M${x1},${y1}Q${cx},${cy} ${x2},${y2}`;
  };
  const sel = places.find((p) => p.name === placeSel);
  // busiest places, for the "jump to" chips (and the phone's starting view)
  const top = useMemo(() => [...places].sort((a, b) => (b.born.length + b.other.length) - (a.born.length + a.other.length)).slice(0, 8), [places]);
  const flyTo = (xy: [number, number] | null, k = 4, animate = true) => {
    if (!svgRef.current || !zoomRef.current) return;
    const tr = xy ? d3.zoomIdentity.translate(size.w / 2 - k * xy[0], size.h / 2 - k * xy[1]).scale(k) : d3.zoomIdentity;
    const sel = d3.select(svgRef.current);
    (animate ? sel.transition().duration(750) : sel).call(zoomRef.current.transform as never, tr);
  };
  // On a phone the whole world is a thin strip, so start zoomed in on where most of the family is.
  useEffect(() => {
    if (didAutoZoom.current || size.w === 900 || !top[0]) return;
    didAutoZoom.current = true;
    if (size.w < 600) flyTo(top[0].xy, Math.min(3, Math.max(1.8, size.h / (size.w * 0.55))), false);
  }, [size, top]); // eslint-disable-line react-hooks/exhaustive-deps
  const k = t.k;

  return (
    <div className="view map-view">
      <div className="view-toolbar">
        <button className="btn sm" onClick={() => { if (year >= CURRENT_YEAR) setYear(minYear); setPlaying(!playing); }}>{playing ? <Pause size={14} /> : <Play size={14} />} {playing ? 'Pause' : 'Play history'}</button>
        <input className="year-slider" type="range" min={minYear} max={CURRENT_YEAR} value={year} onChange={(e) => { setPlaying(false); setYear(+e.target.value); }} />
        <b className="year-big">{year}</b>
        <label className="chk"><input type="checkbox" checked={showMoves} onChange={(e) => setShowMoves(e.target.checked)} /> Migration routes</label>
      </div>
      {top.length > 1 && (
        <div className="map-jump" aria-label="Jump to a place">
          <button className={t.k <= 1.05 ? 'chip on' : 'chip'} onClick={() => flyTo(null)}>🌍 World</button>
          {top.map((pl) => <button key={pl.name} className="chip" onClick={() => { flyTo(pl.xy, 5); setPlaceSel(pl.name); }}>{pl.name.split(',')[0]} <span className="muted">{pl.born.length + pl.other.length}</span></button>)}
        </div>
      )}
      <svg ref={svgRef} className="map-svg">
        <g transform={t.toString()}>
          <path d={geoPath({ type: 'Sphere' } as d3.GeoPermissibleObjects)!} className="sphere" />
          <path d={geoPath(d3.geoGraticule10())!} className="graticule" strokeWidth={0.5 / k} />
          {countries.features.map((f, i) => <path key={i} d={geoPath(f)!} className="land" strokeWidth={0.5 / k} />)}
          {showMoves && moves.map((m) => (
            <path key={m.id} d={arc(m)} className={`move ${year - m.year < 4 && playing ? 'fresh' : ''}`} stroke={colorer.color(m.p.id)} strokeWidth={2.2 / k} onClick={() => select(m.p.id)}>
              <title>{m.year} · {fullName(m.p)}: {m.title}</title>
            </path>
          ))}
          {places.map((pl) => {
            const n = pl.born.length + pl.other.length;
            const r = (4 + Math.sqrt(n) * 3.2) / Math.sqrt(k);
            const col = pl.born[0] ? colorer.color(pl.born[0].id) : 'var(--ink-3)';
            return (
              <g key={pl.name} transform={`translate(${pl.xy[0]},${pl.xy[1]})`} className={`place ${placeSel === pl.name ? 'sel' : ''}`} onClick={() => setPlaceSel(pl.name)}>
                <circle r={r} fill={col} strokeWidth={2 / k} />
                <title>{pl.name}: {pl.born.length} born, {pl.other.length} moved/died here</title>
                {(k > 2.2 || n >= 5) && <text y={-r - 4 / k} textAnchor="middle" style={{ fontSize: 12 / k }} className="place-t">{pl.name.split(',')[0]} · {n}</text>}
              </g>
            );
          })}
        </g>
      </svg>
      <div className="map-legend">
        <div><span className="lg-dot" /> Place size = people born, living, moved or died there</div>
        <div><span className="lg-line" /> Migration route (color = person's {colorer.title.toLowerCase()})</div>
        <div className="muted">{moves.length} migrations · {places.length} places by {year}</div>
      </div>
      {sel && (
        <div className="place-card">
          <div className="pc-head"><b>{sel.name}</b><button className="x" onClick={() => setPlaceSel(null)}>×</button></div>
          {sel.born.length > 0 && <><div className="pc-sub">Born here</div>{sel.born.map((p) => <button key={p.id} className="pc-person" onClick={() => select(p.id)}><span className="dot" style={{ background: colorer.color(p.id) }} />{fullName(p)} <span className="muted">{lifeSpan(p)}</span></button>)}</>}
          {sel.other.length > 0 && <><div className="pc-sub">Lived, moved or died here</div>{sel.other.map((p) => <button key={p.id} className="pc-person" onClick={() => select(p.id)}><span className="dot" style={{ background: colorer.color(p.id) }} />{fullName(p)} <span className="muted">{lifeSpan(p)}</span></button>)}</>}
        </div>
      )}
    </div>
  );
}
