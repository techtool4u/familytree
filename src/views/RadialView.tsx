import { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useStore, useDerived } from '../store';
import { descendantsOf, childrenOf, fullName, lifeSpan, birthYear } from '../lib/graph';

interface HNode { id: string; children?: HNode[] }

export default function RadialView() {
  const { ix, matched, colorer, focusId, filters, people } = useDerived();
  const select = useStore((s) => s.select);
  const selectedId = useStore((s) => s.selectedId);
  const path = useStore((s) => s.path);
  const svgRef = useRef<SVGSVGElement>(null);
  const [t, setT] = useState(d3.zoomIdentity);
  const [size, setSize] = useState({ w: 900, h: 700 });
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const roots = useMemo(() => people
    .filter((p) => !p.fatherId && !p.motherId && childrenOf(ix, p.id).length)
    .map((p) => ({ p, n: descendantsOf(ix, p.id).size - 1 }))
    .filter((r) => !(r.p.gender === 'F' && r.p.spouseIds.some((s) => !ix.byId.get(s)?.fatherId && childrenOf(ix, s).length))) // one root per founding couple
    .sort((a, b) => b.n - a.n), [people, ix]);
  const [rootId, setRootId] = useState<string>('');
  const root = rootId && ix.byId.has(rootId) ? rootId : roots[0]?.p.id;

  useEffect(() => {
    const z = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.3, 8]).on('zoom', (e) => setT(e.transform));
    zoomRef.current = z;
    d3.select(svgRef.current!).call(z).on('dblclick.zoom', null);
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(svgRef.current!);
    return () => ro.disconnect();
  }, []);

  const tree = useMemo(() => {
    if (!root) return null;
    const build = (id: string, seen: Set<string>): HNode => {
      seen.add(id);
      const kids = childrenOf(ix, id).filter((c) => !seen.has(c));
      return { id, children: kids.length ? kids.map((k) => build(k, seen)) : undefined };
    };
    const h = d3.hierarchy(build(root, new Set()));
    h.sort((a, b) => birthYear(ix.byId.get(a.data.id)!) - birthYear(ix.byId.get(b.data.id)!));
    const R = Math.max(90 * h.height, Math.min(size.w, size.h) / 2 - 140);
    return { h: d3.tree<HNode>().size([2 * Math.PI, R]).separation((a, b) => (a.parent === b.parent ? 1 : 1.6) / Math.max(1, a.depth))(h), R };
  }, [ix, root, size]);

  const pathSet = new Set(path ?? []);
  const compact = size.w < 600;
  // On a phone, fill the screen with the rings themselves and reveal names as you zoom in.
  const k0 = tree ? Math.min(1, Math.min(size.w, size.h) / (2 * tree.R + (compact ? 70 : 280))) : 1;
  const ke = k0 * t.k; // on-screen scale
  const small = compact && ke < 0.6;
  const nodeR = small ? Math.min(26, 8.5 / ke) : 11;
  const flyTo = (d: d3.HierarchyPointNode<HNode> | null) => {
    if (!svgRef.current || !zoomRef.current) return;
    let tr = d3.zoomIdentity;
    if (d) {
      const a = d.x - Math.PI / 2, kt = 1 / k0; // zoom until names are full size
      const px = size.w / 2 + k0 * d.y * Math.cos(a), py = size.h / 2 + k0 * d.y * Math.sin(a);
      tr = d3.zoomIdentity.translate(size.w / 2 - kt * px, size.h / 2 - kt * py).scale(kt);
    }
    d3.select(svgRef.current).transition().duration(650).call(zoomRef.current.transform as never, tr);
  };
  const tapNode = (d: d3.HierarchyPointNode<HNode>) => { if (small && d.depth > 0) flyTo(d); else select(d.data.id); };
  const link = d3.linkRadial<d3.HierarchyPointLink<HNode>, d3.HierarchyPointNode<HNode>>().angle((d) => d.x).radius((d) => d.y);
  const rootP = root ? ix.byId.get(root) : undefined;

  return (
    <div className="view radial-view">
      <div className="view-toolbar">
        <label>Descendants of&nbsp;
          <select value={root} onChange={(e) => setRootId(e.target.value)}>
            {roots.map(({ p, n }) => {
              const sp = p.spouseIds.map((s) => ix.byId.get(s)).find(Boolean);
              return <option key={p.id} value={p.id}>{fullName(p)}{sp ? ` & ${sp.given}` : ''} · {n} descendants</option>;
            })}
          </select>
        </label>
        <span className="muted">Each ring is a generation. Spouses listed under each name.</span>
      </div>
      <svg ref={svgRef} className="radial-svg">
        {tree && (
          <g transform={`${t.toString()} translate(${size.w / 2},${size.h / 2}) scale(${k0})`}>
            {tree.h.descendants().filter((d) => d.depth > 0).map((d) => <circle key={'r' + d.depth} r={d.y} className="ring" />)}
            <g className="r-links">
              {tree.h.links().map((l) => (
                <path key={l.source.data.id + l.target.data.id} d={link(l)!} className={(path && !(pathSet.has(l.source.data.id) && pathSet.has(l.target.data.id))) || (filters.mode === 'highlight' && !matched.has(l.target.data.id)) ? 'faded' : ''} />
              ))}
            </g>
            {tree.h.descendants().map((d) => {
              const p = ix.byId.get(d.data.id)!;
              const ang = (d.x * 180) / Math.PI - 90;
              const flip = d.x > Math.PI;
              const faded = (filters.mode === 'highlight' && !matched.has(p.id)) || (path && !pathSet.has(p.id));
              const sp = p.spouseIds.map((s) => ix.byId.get(s)).filter(Boolean).map((s) => s!.given).join(', ');
              const isRoot = d.depth === 0;
              return (
                <g key={p.id} transform={isRoot ? '' : `rotate(${ang}) translate(${d.y},0)`} className={`r-node ${faded ? 'faded' : ''} ${selectedId === p.id ? 'sel' : ''} ${focusId === p.id ? 'focus' : ''}`} onClick={() => tapNode(d)}>
                  <circle r={isRoot ? Math.max(30, nodeR * 1.4) : nodeR} fill={colorer.color(p.id)} />
                  {!isRoot && small && <text className="r-ini" textAnchor="middle" dy="0.35em" style={{ fontSize: nodeR * 0.85 }} transform={`rotate(${-ang})`}>{(p.given[0] ?? '') + (p.surname[0] ?? '')}</text>}
                  {!isRoot && !small && (
                    <text transform={flip ? 'rotate(180)' : ''} x={flip ? -18 : 18} textAnchor={flip ? 'end' : 'start'} dy="-0.15em" className="r-label">
                      {p.given} {p.surname}
                      <tspan x={flip ? -18 : 18} dy="1.15em" className="r-sub">{lifeSpan(p)}{sp ? ` · ⚭ ${sp}` : ''}</tspan>
                    </text>
                  )}
                </g>
              );
            })}
            {rootP && !small && <text y={50} textAnchor="middle" className="r-root-label">{fullName(rootP)} · {lifeSpan(rootP)}</text>}
          </g>
        )}
      </svg>
      {compact && (
        <div className="wheel-hint">
          {small ? 'Tap anyone to zoom in · pinch to explore' : <button className="btn sm" onClick={() => flyTo(null)}>Show whole wheel</button>}
        </div>
      )}
    </div>
  );
}
