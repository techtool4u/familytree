import { fitName, fitText, textWidth, fanFont } from '../lib/fitName';
const NM2 = fanFont(13);
import { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useStore, useDerived } from '../store';
import { layoutTree, NODE_W, NODE_H } from '../lib/layout';
import { lifeSpan, isLiving, inkOn, relationship, parentsOf, childrenOf, spousesOf } from '../lib/graph';
import { journeyRoute } from '../lib/journey';
import { AskBar, QuickAdd, HoverCard, JourneyCaption, type Composer } from '../components/TreeTools';
import type { Answer } from '../lib/ask';
import type { Relation } from '../store';
import RelationBar from '../components/RelationBar';
import { flagOf } from '../data/places';
import { initials } from '../components/Avatar';
import { ZoomIn, ZoomOut, Maximize, Crosshair, Download, Map as MapIcon, Tags, Focus, Route } from 'lucide-react';

export default function TreeView() {
  const { ix, gen, branch, matched, colorer, visible, focusId, filters } = useDerived();
  const selectedId = useStore((s) => s.selectedId);
  const select = useStore((s) => s.select);
  const setFocus = useStore((s) => s.setFocus);
  const path = useStore((s) => s.path);
  const centerReq = useStore((s) => s.centerReq);
  const spotlight = useStore((s) => s.spotlight);
  const relPair = useStore((s) => s.relPair);
  const spotSet = useMemo(() => new Set(spotlight?.ids ?? []), [spotlight]);

  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [t, setT] = useState<d3.ZoomTransform>(d3.zoomIdentity);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [showMini, setShowMini] = useState(true);
  const [hover, setHover] = useState<string | null>(null);
  const [hoverCard, setHoverCard] = useState<string | null>(null);
  // on touch screens the first tap 'arms' a card (shows the + handles), the second opens the profile
  const [armed, setArmed] = useState<string | null>(null);
  const pointerType = useRef('mouse');
  const [lens, setLens] = useState(false);
  const [near, setNear] = useState<{ center: string; steps: number } | null>(null);
  const [composer, setComposer] = useState<Composer | null>(null);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [journey, setJourney] = useState<{ route: string[]; i: number; playing: boolean } | null>(null);

  // show the rich hover card only after the pointer rests on a card for a moment
  useEffect(() => {
    if (!hover || composer || journey) { setHoverCard(null); return; }
    const tm = setTimeout(() => setHoverCard(hover), 450);
    return () => clearTimeout(tm);
  }, [hover, composer, journey]);

  // "Nearby" mode: only people within N family steps of one person
  const nearSet = useMemo(() => {
    if (!near || !ix.byId.has(near.center)) return null;
    const dist = new Map<string, number>([[near.center, 0]]);
    const q = [near.center];
    while (q.length) {
      const cur = q.shift()!; const d = dist.get(cur)!;
      if (d >= near.steps) continue;
      for (const n of [...parentsOf(ix, cur), ...childrenOf(ix, cur), ...spousesOf(ix, cur)]) if (!dist.has(n)) { dist.set(n, d + 1); q.push(n); }
    }
    return new Set(dist.keys());
  }, [near, ix]);
  const shown = useMemo(() => (nearSet ? new Set([...visible].filter((id) => nearSet.has(id))) : visible), [visible, nearSet]);
  const askSet = useMemo(() => (answer && !answer.path ? new Set(answer.ids) : null), [answer]);
  // relationship of everyone to the focus person, for the kinship lens
  const kin = useMemo(() => {
    if (!lens) return null;
    const m = new Map<string, string>();
    for (const id of shown) m.set(id, id === focusId ? 'you · focus' : relationship(ix, focusId, id));
    return m;
  }, [lens, shown, ix, focusId]);

  const branchRank = useMemo(() => {
    const order = new Map(branch.branches.map((b, i) => [b.key, i]));
    return (id: string) => {
      const b = branch.branchOf.get(id) ?? 'other';
      // keep paternal lines left, maternal right; immediate family in the middle
      const r = order.get(b) ?? 9;
      return b === 'direct' ? 1.5 : b === 'married' ? 1.6 : r;
    };
  }, [branch]);

  const layout = useMemo(() => layoutTree(ix, shown, gen, branchRank), [ix, shown, gen, branchRank]);
  const compact = t.k < 0.5;
  const pathSet = useMemo(() => new Set(path ?? []), [path]);

  // zoom behaviour
  useEffect(() => {
    const svg = d3.select(svgRef.current!);
    const z = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.12, 2.5]).on('zoom', (e) => setT(e.transform));
    svg.call(z).on('dblclick.zoom', null);
    zoomRef.current = z;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(svgRef.current!);
    return () => ro.disconnect();
  }, []);

  const fit = (animate = true, only?: string[]) => {
    let { x0, y0, x1, y1 } = layout.bounds;
    const pts = (only ?? []).map((id) => layout.nodes.get(id)).filter(Boolean) as { x: number; y: number }[];
    if (pts.length) {
      x0 = Math.min(...pts.map((p) => p.x)) - NODE_W; x1 = Math.max(...pts.map((p) => p.x)) + NODE_W;
      y0 = Math.min(...pts.map((p) => p.y)) - NODE_H * 1.5; y1 = Math.max(...pts.map((p) => p.y)) + NODE_H * 1.5;
    }
    const el = svgRef.current!;
    const w = el.clientWidth, h = el.clientHeight;
    const k = Math.min(1.1, 0.9 * Math.min(w / (x1 - x0 + 1), h / (y1 - y0 + 1)));
    const tr = d3.zoomIdentity.translate(w / 2 - k * (x0 + x1) / 2, h / 2 - k * (y0 + y1) / 2).scale(k);
    const sel = d3.select(el);
    (animate ? sel.transition().duration(600) : sel).call(zoomRef.current!.transform as never, tr);
  };
  const centerOn = (id: string, k?: number, yFrac = 0.5) => {
    const n = layout.nodes.get(id);
    if (!n) return;
    const el = svgRef.current!;
    const kk = k ?? Math.max(t.k, 0.75);
    const tr = d3.zoomIdentity.translate(el.clientWidth / 2 - kk * n.x, el.clientHeight * yFrac - kk * n.y).scale(kk);
    d3.select(el).transition().duration(yFrac === 0.5 ? 650 : 1200).call(zoomRef.current!.transform as never, tr);
  };

  // initial: center on focus
  const did = useRef(false);
  useEffect(() => {
    if (did.current || !layout.nodes.size) return;
    did.current = true;
    const el = svgRef.current!;
    const n = layout.nodes.get(focusId);
    if (n) d3.select(el).call(zoomRef.current!.transform as never, d3.zoomIdentity.translate(el.clientWidth / 2 - 0.85 * n.x, el.clientHeight * 0.62 - 0.85 * n.y).scale(0.85));
    else fit(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout]);

  useEffect(() => { if (centerReq) centerOn(centerReq.id); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [centerReq]);
  useEffect(() => { if (spotlight?.ids.length) fit(true, spotlight.ids); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [spotlight]);
  useEffect(() => {
    if (!answer) return;
    if (answer.path) useStore.getState().set({ path: answer.path, spotlight: null });
    else { useStore.getState().set({ spotlight: null }); fit(true, answer.ids); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answer]);
  // journey: fly from card to card
  useEffect(() => {
    if (!journey) return;
    const id = journey.route[journey.i];
    const tm1 = setTimeout(() => centerOn(id, 1.05, 0.36), 60);
    if (!journey.playing) return () => clearTimeout(tm1);
    const tm2 = setTimeout(() => setJourney((j) => (j ? (j.i < j.route.length - 1 ? { ...j, i: j.i + 1 } : { ...j, playing: false }) : j)), 4200);
    return () => { clearTimeout(tm1); clearTimeout(tm2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journey?.i, journey?.playing, journey?.route]);
  const startJourney = () => {
    useStore.getState().set({ relPair: null });
    const sel = useStore.getState().selectedId;
    const route = journeyRoute(ix, focusId, sel && sel !== focusId ? sel : undefined);
    if (route.length < 2) { useStore.getState().notify('Add some ancestors first — the journey walks from them down to the focus person'); return; }
    setNear(null); setAnswer(null); setComposer(null);
    useStore.getState().set({ path: route, spotlight: null, selectedId: null });
    setJourney({ route, i: 0, playing: true });
  };
  const stopJourney = () => { setJourney(null); useStore.getState().set({ path: null }); };
  const openComposer = (anchorId: string, rel: Relation, wx: number, wy: number) => {
    setArmed(null);
    setComposer({ anchorId, rel, x: t.x + t.k * wx, y: t.y + t.k * wy });
    setHoverCard(null);
  };
  useEffect(() => { if (path?.length) fit(true, path); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [path]);

  const exportImage = (kind: 'svg' | 'png') => {
    const { x0, y0, x1, y1 } = layout.bounds;
    const pad = 40;
    const clone = svgRef.current!.cloneNode(true) as SVGSVGElement;
    clone.querySelector('.viewport')?.setAttribute('transform', `translate(${-x0 + pad},${-y0 + pad})`);
    clone.querySelectorAll('.no-export').forEach((n) => n.remove());
    const W = x1 - x0 + pad * 2, H = y1 - y0 + pad * 2;
    clone.setAttribute('width', String(W)); clone.setAttribute('height', String(H));
    clone.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const cs = getComputedStyle(document.documentElement);
    const vars = ['--surface', '--surface-2', '--ink', '--ink-2', '--ink-3', '--line', '--edge', '--accent'].map((v) => `${v}:${cs.getPropertyValue(v)}`).join(';');
    clone.setAttribute('style', `${vars};font-family:Inter,system-ui,sans-serif;background:${cs.getPropertyValue('--bg')}`);
    const data = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([data], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const dl = (href: string, name: string) => { const a = document.createElement('a'); a.href = href; a.download = name; a.click(); };
    if (kind === 'svg') { dl(url, 'family-tree.svg'); return; }
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); const s = 2;
      c.width = W * s; c.height = H * s;
      const ctx = c.getContext('2d')!; ctx.fillStyle = cs.getPropertyValue('--bg'); ctx.fillRect(0, 0, c.width, c.height);
      ctx.scale(s, s); ctx.drawImage(img, 0, 0);
      dl(c.toDataURL('image/png'), 'family-tree.png');
    };
    img.src = url;
  };

  const dim = (id: string) => (filters.mode === 'highlight' && !matched.has(id)) || (path && !pathSet.has(id)) || (spotlight && !spotSet.has(id)) || (askSet && !askSet.has(id));
  const hoverRel = hover ? new Set([hover, ...(ix.byId.get(hover)?.spouseIds ?? []), ix.byId.get(hover)?.fatherId, ix.byId.get(hover)?.motherId, ...(ix.children.get(hover) ?? [])].filter(Boolean) as string[]) : null;

  // path overlay (orthogonal steps through node centres)
  const pathD = useMemo(() => {
    if (!path || path.length < 2) return '';
    let d = '';
    path.forEach((id, i) => {
      const n = layout.nodes.get(id);
      if (!n) return;
      if (i === 0 || !d) { d += `M${n.x},${n.y}`; return; }
      const p = layout.nodes.get(path[i - 1]);
      if (!p) { d += `M${n.x},${n.y}`; return; }
      if (p.y === n.y) d += `L${n.x},${n.y}`;
      else { const my = (p.y + n.y) / 2; d += `L${p.x},${my}L${n.x},${my}L${n.x},${n.y}`; }
    });
    return d;
  }, [path, layout]);

  const gens = useMemo(() => {
    const ys = new Map<number, number>();
    for (const n of layout.nodes.values()) ys.set(n.y, gen.get(n.id) ?? 0);
    return [...ys.entries()].sort((a, b) => a[0] - b[0]);
  }, [layout, gen]);
  const genLabel = (g: number) => g === 0 ? 'Focus generation' : g === -1 ? 'Parents' : g === -2 ? 'Grandparents' : g < -2 ? `${g < -3 ? (-g - 2) + '× ' : ''}Great-grandparents` : g === 1 ? 'Children' : g === 2 ? 'Grandchildren' : `Generation +${g}`;

  // minimap
  const mm = { w: 200, h: 120 };
  const b = layout.bounds;
  const ms = Math.min(mm.w / (b.x1 - b.x0 + 200), mm.h / (b.y1 - b.y0 + 120));
  const mx = (x: number) => (x - b.x0 + 100) * ms, my = (y: number) => (y - b.y0 + 60) * ms;
  const vp = { x: mx(-t.x / t.k), y: my(-t.y / t.k), w: (size.w / t.k) * ms, h: (size.h / t.k) * ms };
  const onMini = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.buttons !== 1 && e.type !== 'pointerdown') return;
    const r = e.currentTarget.getBoundingClientRect();
    const wx = (e.clientX - r.left) / ms + b.x0 - 100, wy = (e.clientY - r.top) / ms + b.y0 - 60;
    d3.select(svgRef.current!).call(zoomRef.current!.transform as never, d3.zoomIdentity.translate(size.w / 2 - t.k * wx, size.h / 2 - t.k * wy).scale(t.k));
  };

  return (
    <div className="view tree-view">
      <svg ref={svgRef} className="tree-svg" onClick={(e) => { if (e.target === svgRef.current) { select(null); setArmed(null); } }}>
        <defs>
          <pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="var(--line)" /></pattern>
          <clipPath id="avclip"><circle cx="0" cy="0" r="20" /></clipPath>
        </defs>
        <rect className="no-export" width="100%" height="100%" fill="url(#dots)" style={{ pointerEvents: 'none' }} />
        <g className="viewport" transform={t.toString()}>
          {/* generation bands */}
          <g className="gen-bands no-export">
            {gens.map(([y, g]) => (
              <g key={y}>
                <text x={b.x0 - 30} y={y + 4} textAnchor="end" className="gen-label">{genLabel(g)}</text>
                <line x1={b.x0 - 20} x2={b.x1 + 20} y1={y - NODE_H / 2 - 18} y2={y - NODE_H / 2 - 18} className="gen-line" />
              </g>
            ))}
          </g>
          {/* family connectors */}
          <g className="edges">
            {layout.families.map((f) => {
              const kids = f.children.map((c) => layout.nodes.get(c)!).filter(Boolean);
              const xs = kids.map((k) => k.x).concat(f.sx);
              const faded = f.children.every((c) => dim(c)) || f.parents.every((p) => dim(p));
              const hot = hoverRel && f.parents.includes(hover!) || hoverRel && f.children.includes(hover!);
              return (
                <g key={f.key} className={`fam ${faded ? 'faded' : ''} ${hot ? 'hot' : ''}`}>
                  <path d={`M${f.sx},${f.sy}V${f.busY}M${Math.min(...xs)},${f.busY}H${Math.max(...xs)}${kids.map((k) => `M${k.x},${f.busY}V${k.y - NODE_H / 2}`).join('')}`} />
                </g>
              );
            })}
            {layout.couples.map(([a, c, adj]) => {
              const A = layout.nodes.get(a)!, C = layout.nodes.get(c)!;
              const faded = dim(a) && dim(c);
              if (adj) return <line key={a + c} className={`couple ${faded ? 'faded' : ''}`} x1={Math.min(A.x, C.x) + NODE_W / 2} x2={Math.max(A.x, C.x) - NODE_W / 2} y1={A.y} y2={A.y} />;
              const top = Math.min(A.y, C.y) - NODE_H / 2;
              return <path key={a + c} className={`couple far ${faded ? 'faded' : ''}`} d={`M${A.x},${A.y - NODE_H / 2}C${A.x},${top - 60} ${C.x},${top - 60} ${C.x},${C.y - NODE_H / 2}`} />;
            })}
          </g>
          {pathD && <path className="rel-path" d={pathD} />}
          {/* nodes */}
          <g className="nodes">
            {[...layout.nodes.values()].map((n) => {
              const p = ix.byId.get(n.id)!;
              const col = colorer.color(n.id);
              const isSel = selectedId === n.id, isFocus = focusId === n.id;
              const faded = dim(n.id);
              const onPath = pathSet.has(n.id);
              const isNow = journey?.route[journey.i] === n.id;
              const cls = `node ${faded ? 'faded' : ''} ${isSel ? 'sel' : ''} ${isFocus ? 'focus' : ''} ${onPath ? 'onpath' : ''} ${isLiving(p) ? '' : 'deceased'} ${hoverRel?.has(n.id) && hover !== n.id ? 'kin' : ''} ${isNow ? 'journey-now' : ''} ${askSet?.has(n.id) ? 'answer' : ''}`;
              return (
                <g key={n.id} className={cls} style={{ transform: `translate(${n.x - NODE_W / 2}px,${n.y - NODE_H / 2}px)` }}
                  onPointerDown={(e) => { pointerType.current = e.pointerType; }}
                  onClick={(e) => { e.stopPropagation(); const st = useStore.getState(); if (st.relPair) { st.set(st.relSlot === 'a' ? { relPair: { ...st.relPair, a: n.id }, relSlot: 'b' } : { relPair: { ...st.relPair, b: n.id } }); return; } if (pointerType.current === 'touch' && armed !== n.id) { setArmed(n.id); return; } setArmed(null); select(n.id); }}
                  onDoubleClick={(e) => { e.stopPropagation(); setFocus(n.id); }}
                  onMouseEnter={() => setHover(n.id)} onMouseLeave={() => setHover(null)}
                  role="button" aria-label={`${`${p.given} ${p.surname}`.trim()}, ${lifeSpan(p)}`}>
                  {compact ? (
                    <>
                      <rect width={NODE_W} height={NODE_H} rx={14} fill={col} className="card-compact" />
                      <text x={NODE_W / 2} y={NODE_H / 2 + 12} textAnchor="middle" className="compact-text" fill={inkOn(col)}>{initials(p)}</text>
                    </>
                  ) : (
                    <>
                      <rect width={NODE_W} height={NODE_H} rx={12} className="card" />
                      <rect width={6} height={NODE_H - 16} x={0} y={8} rx={3} fill={col} />
                      <g transform="translate(36,32)">
                        {p.photo ? (
                          <image href={p.photo} x={-20} y={-20} width={40} height={40} clipPath="url(#avclip)" preserveAspectRatio="xMidYMid slice" />
                        ) : (
                          <>
                            <circle r={20} fill={col} />
                            <text y={5} textAnchor="middle" className="av-text" fill={inkOn(col)}>{initials(p)}</text>
                          </>
                        )}
                      </g>
                      {(() => {
                        // One line if the whole name fits; otherwise first names on one line and surname on the next.
                        const full = `${p.given} ${p.surname}`.trim(), room = NODE_W - 76;
                        if (textWidth(full) <= room || !p.given.trim() || !p.surname.trim()) return (
                          <>
                            <text x={64} y={27} className="nm"><title>{full}</title>{fitName(p, room)}</text>
                            <text x={64} y={46} className="sub">{lifeSpan(p)} {flagOf(p.birthPlace)}</text>
                          </>
                        );
                        return (
                          <>
                            <text x={64} y={21} className="nm two"><title>{full}</title>{fitText(p.given, room, NM2)}</text>
                            <text x={64} y={37} className="nm two">{fitText(p.surname, room, NM2)}</text>
                            <text x={64} y={53} className="sub two">{lifeSpan(p)} {flagOf(p.birthPlace)}</text>
                          </>
                        );
                      })()}
                      {p.media.length > 0 && <text x={NODE_W - 12} y={52} textAnchor="end" className="sub" aria-label="has media">📎</text>}
                    </>
                  )}
                  {kin && kin.get(n.id) && !faded && (() => {
                    const label = kin.get(n.id)!; const w = Math.min(NODE_W + 20, label.length * 6.4 + 18);
                    return <g className="kin-pill" transform={`translate(${NODE_W / 2},-10)`}><rect x={-w / 2} y={-10} width={w} height={20} rx={10} /><text y={4} textAnchor="middle">{label}</text></g>;
                  })()}
                  {!compact && !journey && !relPair && (hover === n.id || selectedId === n.id || armed === n.id) && (
                    <g className="grow-handles no-export">
                      {parentsOf(ix, n.id).length < 2 && <GrowHandle x={NODE_W / 2} y={-2} label="Add parent" onClick={() => openComposer(n.id, 'parent', n.x, n.y - NODE_H / 2)} />}
                      <GrowHandle x={NODE_W / 2} y={NODE_H + 2} label="Add child" onClick={() => openComposer(n.id, 'child', n.x, n.y + NODE_H / 2)} />
                      <GrowHandle x={NODE_W + 2} y={NODE_H / 2} label="Add partner" onClick={() => openComposer(n.id, 'spouse', n.x + NODE_W / 2, n.y)} />
                      {parentsOf(ix, n.id).length > 0 && <GrowHandle x={-2} y={NODE_H / 2} label="Add brother or sister" onClick={() => openComposer(n.id, 'sibling', n.x - NODE_W / 2, n.y)} />}
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </g>
      </svg>

      {layout.nodes.size === 0 && <div className="empty-state">No one matches these filters. <button className="link" onClick={() => useStore.getState().setFilters({ ...useStore.getState().filters, mode: 'highlight' })}>Switch to highlight mode</button></div>}

      {relPair && !journey && <RelationBar />}
      {!journey && !relPair && (
        <div className="tree-tools">
          <AskBar onAnswer={(a) => { setAnswer(a); if (!a && useStore.getState().path && !journey) useStore.getState().set({ path: null }); }} />
          <div className="tt-btns">
            <button className={`tt-btn ${lens ? 'on' : ''}`} onClick={() => setLens(!lens)} title="Label every card with how they are related to the focus person"><Tags size={16} /><span>Relations</span></button>
            <div className={`tt-near ${near ? 'on' : ''}`}>
              <button className={`tt-btn ${near ? 'on' : ''}`} onClick={() => setNear(near ? null : { center: selectedId ?? focusId, steps: 2 })} title="Show only the people closest to one person"><Focus size={16} /><span>{near ? `Near ${ix.byId.get(near.center)?.given ?? ''}` : 'Nearby'}</span></button>
              {near && <>
                <input type="range" min={1} max={6} value={near.steps} onChange={(e) => setNear({ ...near, steps: +e.target.value })} aria-label="How many family steps" />
                <span className="tt-steps">{near.steps} step{near.steps > 1 ? 's' : ''} · {shown.size}</span>
                {selectedId && selectedId !== near.center && <button className="link small" onClick={() => setNear({ ...near, center: selectedId })}>Center on {ix.byId.get(selectedId)?.given}</button>}
              </>}
            </div>
            <button className="tt-btn" onClick={startJourney} title="Fly from your earliest ancestor down to the focus person (or from the selected person)"><Route size={16} /><span>Journey</span></button>
          </div>
        </div>
      )}

      {composer && ix.byId.has(composer.anchorId) && <QuickAdd c={composer} onClose={() => setComposer(null)} bounds={size} />}
      {hoverCard && !composer && layout.nodes.get(hoverCard) && (() => {
        const n = layout.nodes.get(hoverCard)!;
        return <HoverCard id={hoverCard} x={t.x + t.k * (n.x + NODE_W / 2)} y={t.y + t.k * (n.y - NODE_H / 2)} bounds={size} />;
      })()}
      {journey && (
        <JourneyCaption route={journey.route} i={journey.i} playing={journey.playing}
          onPrev={() => setJourney({ ...journey, i: Math.max(0, journey.i - 1), playing: false })}
          onNext={() => setJourney({ ...journey, i: Math.min(journey.route.length - 1, journey.i + 1), playing: false })}
          onToggle={() => setJourney({ ...journey, playing: !journey.playing, i: !journey.playing && journey.i === journey.route.length - 1 ? 0 : journey.i })}
          onStop={stopJourney} />
      )}

      <div className="zoom-ctrls">
        <button title="Zoom in" onClick={() => d3.select(svgRef.current!).transition().call(zoomRef.current!.scaleBy as never, 1.3)}><ZoomIn size={18} /></button>
        <button title="Zoom out" onClick={() => d3.select(svgRef.current!).transition().call(zoomRef.current!.scaleBy as never, 1 / 1.3)}><ZoomOut size={18} /></button>
        <button title="Fit everyone (F)" onClick={() => fit()}><Maximize size={18} /></button>
        <button title="Center on focus person (C)" onClick={() => centerOn(focusId, 0.9)}><Crosshair size={18} /></button>
        <button title="Toggle minimap" className={showMini ? 'on' : ''} onClick={() => setShowMini(!showMini)}><MapIcon size={18} /></button>
        <div className="menu-wrap">
          <button title="Export image"><Download size={18} /></button>
          <div className="menu up">
            <button onClick={() => exportImage('png')}>Export PNG</button>
            <button onClick={() => exportImage('svg')}>Export SVG</button>
            <button onClick={() => window.print()}>Print…</button>
          </div>
        </div>
        <span className="zoom-pct">{Math.round(t.k * 100)}%</span>
      </div>

      {showMini && layout.nodes.size > 0 && (
        <svg className="minimap" width={mm.w} height={mm.h} onPointerDown={onMini} onPointerMove={onMini}>
          {[...layout.nodes.values()].map((n) => (
            <rect key={n.id} x={mx(n.x - NODE_W / 2)} y={my(n.y - NODE_H / 2)} width={NODE_W * ms} height={NODE_H * ms} rx={1} fill={colorer.color(n.id)} opacity={dim(n.id) ? 0.25 : 1} />
          ))}
          <rect x={vp.x} y={vp.y} width={vp.w} height={vp.h} className="mm-vp" />
        </svg>
      )}
      {!journey && <div className="hint no-print">Hover a card and press <b>+</b> to add family · scroll to zoom · drag to pan · double-click to re-center · Ctrl+Z to undo</div>}
    </div>
  );
}


function GrowHandle({ x, y, label, onClick }: { x: number; y: number; label: string; onClick: () => void }) {
  return (
    <g className="grow-handle" transform={`translate(${x},${y})`} role="button" aria-label={label}
      onClick={(e) => { e.stopPropagation(); onClick(); }} onDoubleClick={(e) => e.stopPropagation()}>
      <title>{label}</title>
      <circle r={11} />
      <path d="M-5,0H5M0,-5V5" />
    </g>
  );
}
