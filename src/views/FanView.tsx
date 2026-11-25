import { fitText, fanFont } from '../lib/fitName';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useStore, useDerived } from '../store';
import { lifeSpan, isLiving, inkOn, fullName } from '../lib/graph';
import type { Person } from '../types';

interface Slot { gen: number; idx: number; p?: Person; childId?: string; role: 'father' | 'mother' | 'self' }

export default function FanView() {
  const { ix, matched, colorer, focusId, filters } = useDerived();
  const select = useStore((s) => s.select);
  const setFocus = useStore((s) => s.setFocus);
  const selectedId = useStore((s) => s.selectedId);
  const path = useStore((s) => s.path);
  const set = useStore((s) => s.set);
  const [depth, setDepth] = useState(5);
  const svgRef = useRef<SVGSVGElement>(null);
  const [t, setT] = useState(d3.zoomIdentity);
  const [size, setSize] = useState({ w: 900, h: 700 });

  useEffect(() => {
    const z = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.3, 4]).on('zoom', (e) => setT(e.transform));
    d3.select(svgRef.current!).call(z).on('dblclick.zoom', null);
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(svgRef.current!);
    return () => ro.disconnect();
  }, []);

  const slots = useMemo(() => {
    const out: Slot[] = [];
    const walk = (id: string | undefined, gen: number, idx: number, childId: string | undefined, role: Slot['role']) => {
      if (gen > depth) return;
      const p = id ? ix.byId.get(id) : undefined;
      out.push({ gen, idx, p, childId, role });
      if (!p) return;
      walk(p.fatherId, gen + 1, idx * 2, p.id, 'father');
      walk(p.motherId, gen + 1, idx * 2 + 1, p.id, 'mother');
    };
    walk(focusId, 0, 0, undefined, 'self');
    return out;
  }, [ix, focusId, depth]);

  const R0 = 78;
  const ringW = (g: number) => (g <= 2 ? 92 : g <= 4 ? 112 : 128);
  const inner = (g: number) => { let r = R0; for (let i = 1; i < g; i++) r += ringW(i); return r; };
  const SPAN = Math.PI * 1.5;
  const arc = d3.arc<{ a0: number; a1: number; r0: number; r1: number }>().startAngle((d) => d.a0).endAngle((d) => d.a1).innerRadius((d) => d.r0).outerRadius((d) => d.r1).padAngle(0.004).cornerRadius(4);
  const maxR = inner(depth + 1);
  const baseK = 0.94 * Math.min(size.w / (maxR * 2 + 40), size.h / (maxR * 1.71 + 40));
  const cx = size.w / 2, cy = size.h / 2 + maxR * 0.146 * baseK;
  const pathSet = new Set(path ?? []);
  const focus = ix.byId.get(focusId);

  return (
    <div className="view fan-view">
      <div className="view-toolbar">
        <label>Generations <input type="range" min={2} max={7} value={depth} onChange={(e) => setDepth(+e.target.value)} /> <b>{depth}</b></label>
        <span className="muted">Click a segment for details · double-click to re-center the fan · empty slots are research gaps</span>
      </div>
      <svg ref={svgRef} className="fan-svg">
        <g transform={`${t.toString()} translate(${cx},${cy}) scale(${baseK})`}>
          {slots.filter((s) => s.gen > 0).map((s) => {
            const n = 2 ** s.gen;
            const a0 = -SPAN / 2 + (SPAN * s.idx) / n, a1 = a0 + SPAN / n;
            const r0 = inner(s.gen), r1 = r0 + ringW(s.gen);
            const d = arc({ a0, a1, r0, r1 })!;
            const [x, y] = arc.centroid({ a0, a1, r0, r1 });
            const mid = ((a0 + a1) / 2) * (180 / Math.PI);
            const radial = s.gen >= 3;
            let rot = radial ? mid - 90 : mid;
            if (radial && mid < 0) rot += 180;
            if (!radial && Math.abs(mid) > 90) rot += 180;
            if (!s.p) {
              return (
                <g key={`${s.gen}-${s.idx}`} className="fan-empty" onClick={() => s.childId && set({ edit: { relativeOf: s.childId, relation: 'parent' } })}>
                  <path d={d} />
                  {s.gen <= 4 && <text transform={`translate(${x},${y}) rotate(${rot})`} textAnchor="middle" dy="0.35em">+ {s.role}</text>}
                </g>
              );
            }
            const p = s.p;
            const col = colorer.color(p.id);
            const faded = (filters.mode === 'highlight' && !matched.has(p.id)) || (path && !pathSet.has(p.id));
            const ink = inkOn(col);
            const small = s.gen >= 5;
            const room = (radial ? ringW(s.gen) : ((r0 + r1) / 2) * (a1 - a0)) - 14;
            const ff = fanFont(small ? 11 : 13);
            return (
              <g key={p.id + s.idx} className={`fan-seg ${faded ? 'faded' : ''} ${selectedId === p.id ? 'sel' : ''}`} onClick={() => select(p.id)} onDoubleClick={() => setFocus(p.id)}>
                <path d={d} fill={col} />
                <title>{fullName(p)} {lifeSpan(p)}</title>
                <text transform={`translate(${x},${y}) rotate(${rot})`} textAnchor="middle" fill={ink} className={small ? 'fan-t small' : 'fan-t'}>
                  <tspan x={0} dy={small ? '-0.1em' : '-0.35em'} className="fan-name">{fitText(p.given, room, ff)}</tspan>
                  <tspan x={0} dy="1.15em" className="fan-name">{fitText(p.birthSurname ?? p.surname, room, ff)}</tspan>
                  {!small && <tspan x={0} dy="1.2em" className="fan-yrs">{lifeSpan(p)}{isLiving(p) ? '' : ''}</tspan>}
                </text>
              </g>
            );
          })}
          {focus && (
            <g className="fan-center" onClick={() => select(focus.id)}>
              <circle r={R0 - 4} fill={colorer.color(focus.id)} />
              <text textAnchor="middle" fill={inkOn(colorer.color(focus.id))}>
                <tspan x={0} dy="-0.3em" className="fan-c-name">{focus.given}</tspan>
                <tspan x={0} dy="1.2em" className="fan-c-name">{focus.surname}</tspan>
                <tspan x={0} dy="1.4em" className="fan-yrs">{lifeSpan(focus)}</tspan>
              </text>
            </g>
          )}
        </g>
      </svg>
    </div>
  );
}
