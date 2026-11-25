import { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import world from 'world-atlas/countries-110m.json';
import { useStore } from '../store';
import { findPlace, allPlaces, flagFromCode, type Place } from '../data/places';
import { MapPin, Search, Check, X, Loader2 } from 'lucide-react';

const topo = world as unknown as Topology<{ countries: GeometryCollection }>;
const countries = feature(topo, topo.objects.countries) as unknown as GeoJSON.FeatureCollection;
let listCounter = 0;

/**
 * A place field that knows whether the place can be shown on the map.
 * Unknown places can be looked up online (OpenStreetMap) or pinned by clicking on a world map.
 */
export function PlaceInput({ value, onChange, placeholder = 'Town or city, Country' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  useStore((s) => s.customPlaces); // re-render when a new place is saved
  const addPlace = useStore.getState().addPlace;
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [picking, setPicking] = useState(false);
  const listId = useMemo(() => `pl-${++listCounter}`, []);
  const known = findPlace(value);
  const exact = known && known.name.toLowerCase() === value.trim().toLowerCase();

  const lookup = async () => {
    setBusy(true); setMsg('');
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=1&q=${encodeURIComponent(value)}`, { headers: { Accept: 'application/json' } });
      const j = (await r.json()) as { lat: string; lon: string; address?: { country?: string; country_code?: string } }[];
      if (!j.length) { setMsg('Not found — check the spelling, or pick it on the map.'); return; }
      const a = j[0].address ?? {};
      addPlace({ name: value.trim(), country: a.country ?? value.split(',').pop()!.trim(), flag: flagFromCode(a.country_code), lat: +j[0].lat, lon: +j[0].lon });
      setMsg('');
    } catch {
      setMsg('Couldn’t reach the online lookup (offline or blocked). Pick it on the map instead.');
    } finally { setBusy(false); }
  };

  return (
    <div className="place-input">
      <input list={listId} value={value} onChange={(e) => { onChange(e.target.value); setMsg(''); }} placeholder={placeholder} />
      <datalist id={listId}>{allPlaces().map((p) => <option key={p.name} value={p.name} />)}</datalist>
      {value.trim() && (
        <div className={`place-status ${known ? 'ok' : 'todo'}`}>
          {known ? (
            <><Check size={13} /> On the map{!exact ? ` as ${known.name}` : ''} {known.flag}</>
          ) : (
            <>
              <MapPin size={13} /> Not on the map yet
              <button type="button" className="link" onClick={lookup} disabled={busy}>{busy ? <Loader2 size={13} className="spin" /> : <Search size={13} />} Find it</button>
              <button type="button" className="link" onClick={() => setPicking(true)}><MapPin size={13} /> Pick on map</button>
            </>
          )}
        </div>
      )}
      {msg && <div className="place-msg">{msg}</div>}
      {picking && <MapPicker name={value.trim()} onClose={() => setPicking(false)} onSave={(pl) => { addPlace(pl); setPicking(false); }} />}
    </div>
  );
}

function MapPicker({ name, onClose, onSave }: { name: string; onClose: () => void; onSave: (p: Place) => void }) {
  const W = 640, H = 340;
  const svgRef = useRef<SVGSVGElement>(null);
  const [t, setT] = useState(d3.zoomIdentity);
  const [pt, setPt] = useState<[number, number] | null>(null); // lon, lat
  const proj = useMemo(() => d3.geoNaturalEarth1().fitExtent([[6, 6], [W - 6, H - 6]], { type: 'Sphere' } as d3.GeoPermissibleObjects), []);
  const path = useMemo(() => d3.geoPath(proj), [proj]);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  useEffect(() => {
    const z = d3.zoom<SVGSVGElement, unknown>().scaleExtent([1, 40]).on('zoom', (e) => setT(e.transform));
    d3.select(svgRef.current!).call(z).on('dblclick.zoom', null);
    zoomRef.current = z;
  }, []);
  // start zoomed on the country if the name ends with one we already know
  useEffect(() => {
    const country = name.split(',').slice(1).join(',').trim().toLowerCase();
    const near = country && allPlaces().find((p) => p.country.toLowerCase() === country);
    if (near && zoomRef.current) {
      const [x, y] = proj([near.lon, near.lat])!;
      const k = 6;
      d3.select(svgRef.current!).call(zoomRef.current.transform as never, d3.zoomIdentity.translate(W / 2 - k * x, H / 2 - k * y).scale(k));
    }
  }, [name, proj]);

  const click = (e: React.MouseEvent<SVGSVGElement>) => {
    if ((e as unknown as { defaultPrevented: boolean }).defaultPrevented) return;
    const r = svgRef.current!.getBoundingClientRect();
    const [x, y] = t.invert([((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H]);
    const ll = proj.invert?.([x, y]);
    if (ll && isFinite(ll[0])) setPt([ll[0], ll[1]]);
  };
  const country = pt ? countries.features.find((f) => d3.geoContains(f, pt)) : undefined;
  const countryName = (country?.properties as { name?: string } | undefined)?.name;
  const mark = pt ? proj(pt) : null;

  return (
    <div className="modal-bg" style={{ zIndex: 120 }} onClick={onClose}>
      <div className="modal map-picker" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><MapPin size={18} /><h3>Where is “{name || 'this place'}”?</h3><span className="grow" /><button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button></div>
        <p className="muted small" style={{ marginTop: -6 }}>Scroll or pinch to zoom in, then click the spot. You only need to do this once per place — every person who uses this name will appear there.</p>
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="picker-map" onClick={click}>
          <g transform={t.toString()}>
            <path d={path({ type: 'Sphere' } as d3.GeoPermissibleObjects)!} className="sphere" />
            {countries.features.map((f, i) => <path key={i} d={path(f)!} className={`land ${f === country ? 'hl' : ''}`} strokeWidth={0.6 / t.k} />)}
            {allPlaces().map((p) => { const xy = proj([p.lon, p.lat])!; return <circle key={p.name} cx={xy[0]} cy={xy[1]} r={2.2 / t.k} className="known-dot"><title>{p.name}</title></circle>; })}
            {mark && <g transform={`translate(${mark[0]},${mark[1]}) scale(${1 / t.k})`}><path d="M0,0 C-7,-10 -9,-14 -9,-18 A9,9 0 1 1 9,-18 C9,-14 7,-10 0,0Z" className="pin" /><circle cy={-18} r={3.2} fill="#fff" /></g>}
          </g>
        </svg>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="muted small">{pt ? `${pt[1].toFixed(3)}°, ${pt[0].toFixed(3)}°${countryName ? ` · ${countryName}` : ''}` : 'No spot chosen yet'}</span>
          <span className="row" style={{ marginTop: 0 }}>
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="button" className="btn primary" disabled={!pt || !name} onClick={() => pt && onSave({ name, country: countryName ?? (name.split(',').length > 1 ? name.split(',').pop()!.trim() : 'Unknown'), flag: allPlaces().find((p) => p.country === countryName)?.flag ?? '', lat: pt[1], lon: pt[0] })}>Save location</button>
          </span>
        </div>
      </div>
    </div>
  );
}
