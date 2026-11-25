import { useMemo, useState } from 'react';
import { useStore, useDerived } from '../store';
import { birthYear, deathYear, isLiving, CURRENT_YEAR, fullName, lifeSpan } from '../lib/graph';
import type { LifeEvent } from '../types';
import { HISTORY } from '../lib/history';

const ICON: Partial<Record<LifeEvent['type'], string>> = { marriage: '⚭', migration: '✈', military: '★', education: '🎓', career: '💼', residence: '⌂' };

export default function TimelineView() {
  const { people, matched, colorer, filters, gen, branch, focusId } = useDerived();
  const select = useStore((s) => s.select);
  const selectedId = useStore((s) => s.selectedId);
  const [group, setGroup] = useState<'none' | 'branch' | 'generation'>('branch');
  // On a phone, start with every century fitting the screen ("fit"); the slider zooms in from there.
  const narrow = window.innerWidth < 600;
  const [pxSel, setPx] = useState<number | null>(() => (narrow ? null : window.innerWidth < 900 ? 5 : 9));
  const [cursor, setCursor] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(true);

  const rows = useMemo(() => {
    const list = people.filter((p) => !isNaN(birthYear(p)) && (filters.mode === 'highlight' || matched.has(p.id)));
    list.sort((a, b) => birthYear(a) - birthYear(b));
    if (group === 'none') return [{ title: '', items: list }];
    const keyOf = (id: string) => (group === 'branch' ? branch.branchOf.get(id) ?? 'other' : String(gen.get(id) ?? 0));
    const groups = new Map<string, typeof list>();
    for (const p of list) { const k = keyOf(p.id); if (!groups.has(k)) groups.set(k, []); groups.get(k)!.push(p); }
    const title = (k: string) => group === 'branch' ? branch.branches.find((b) => b.key === k)?.label ?? k : (+k === 0 ? 'Focus generation' : +k < 0 ? `${-k} generation${+k < -1 ? 's' : ''} up` : `${k} generation${+k > 1 ? 's' : ''} down`);
    const order = group === 'branch' ? branch.branches.map((b) => b.key) : [...groups.keys()].sort((a, b) => +a - +b);
    return order.filter((k) => groups.has(k)).map((k) => ({ title: title(k), items: groups.get(k)! }));
  }, [people, matched, filters.mode, group, gen, branch]);

  const all = rows.flatMap((r) => r.items);
  const minY = Math.floor((Math.min(...all.map(birthYear), CURRENT_YEAR - 50) - 5) / 10) * 10;
  const maxY = CURRENT_YEAR + 5;
  const LW = narrow ? 92 : window.innerWidth < 900 ? 130 : 220;
  const fitPx = Math.max(1, (window.innerWidth - LW - 24) / (maxY - minY));
  const pxPerYear = pxSel ?? fitPx;
  const W = (maxY - minY) * pxPerYear;
  const x = (y: number) => (y - minY) * pxPerYear;
  const ROW = 30, HEAD = 26;
  let yCursor = 0;
  const placed = rows.map((r) => {
    const top = yCursor; yCursor += (r.title ? HEAD : 0);
    const items = r.items.map((p) => { const y = yCursor; yCursor += ROW; return { p, y }; });
    return { ...r, top, items };
  });
  const H = yCursor + 10;
  const livingAt = cursor ? people.filter((p) => birthYear(p) <= cursor && (isNaN(deathYear(p)) ? isLiving(p) || cursor <= birthYear(p) + 80 : deathYear(p) >= cursor)).length : 0;
  const decades = [];
  for (let d = minY; d <= maxY; d += 10) decades.push(d);
  const labelStep = pxPerYear * 10 >= 34 ? 10 : pxPerYear * 20 >= 34 ? 20 : 50;

  return (
    <div className="view timeline-view">
      <div className="view-toolbar">
        <label>Group by <select value={group} onChange={(e) => setGroup(e.target.value as typeof group)}>
          <option value="branch">Family line</option><option value="generation">Generation</option><option value="none">None (by birth)</option>
        </select></label>
        <label>Zoom <input type="range" min={Math.min(4, Math.floor(fitPx))} max={24} step={0.5} value={pxPerYear} onChange={(e) => setPx(+e.target.value)} /></label>
        <label className="chk"><input type="checkbox" checked={showHistory} onChange={(e) => setShowHistory(e.target.checked)} /> World events</label>
        <span className="muted">Hover to see who was alive in any year · ⚭ marriage ✈ migration ★ service 🎓 school 💼 career</span>
      </div>
      {all.length === 0 && <div className="empty-state">No birth years are recorded in this tree, so there is nothing to place on a timeline.</div>}
      <div className="tl-scroll">
        <div className="tl-inner" style={{ width: W + LW }}>
          <div className="tl-axis" style={{ width: W + LW }}>
            <div className="tl-corner" style={{ width: LW }}>{cursor ? <><b>{cursor}</b> · {livingAt} alive</> : narrow ? 'Tap a year' : 'Year'}</div>
            <svg width={W} height={28}>
              {decades.map((d) => <g key={d} transform={`translate(${x(d)},0)`}><line y1={18} y2={28} className="tick" />{d % labelStep === 0 && <text y={14} textAnchor="middle" className="tick-t">{d}</text>}</g>)}
              {cursor && <text x={x(cursor)} y={26} textAnchor="middle" className="cursor-t">▼</text>}
            </svg>
          </div>
          <div className="tl-body">
            <div className="tl-labels" style={{ width: LW }}>
              {placed.map((g) => (
                <div key={g.title + g.top}>
                  {g.title && <div className="tl-group" style={{ height: HEAD }}>{g.title}</div>}
                  {g.items.map(({ p }) => (
                    <div key={p.id} className={`tl-label ${selectedId === p.id ? 'sel' : ''} ${filters.mode === 'highlight' && !matched.has(p.id) ? 'faded' : ''}`} style={{ height: ROW }} onClick={() => select(p.id)}>
                      <span className="dot" style={{ background: colorer.color(p.id) }} />
                      <span className="tl-name">{narrow ? `${p.given.split(' ')[0]} ${p.surname[0] ?? ''}.` : fullName(p)}{p.id === focusId ? ' ◉' : ''}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <svg width={W} height={H} className="tl-svg" onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setCursor(Math.round((e.clientX - r.left) / pxPerYear + minY)); }} onPointerLeave={(e) => { if (e.pointerType === 'mouse') setCursor(null); }} onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setCursor(Math.round((e.clientX - r.left) / pxPerYear + minY)); }}>
              {decades.map((d) => <line key={d} x1={x(d)} x2={x(d)} y1={0} y2={H} className="grid" />)}
              {showHistory && HISTORY.filter((h) => h.b > minY).map((h, hi) => (
                <g key={h.label}>
                  <rect x={x(h.a)} width={Math.max(3, x(h.b) - x(h.a))} y={0} height={H} className="hist" />
                  {pxPerYear >= 3 && <text x={x(h.a) + 3} y={hi % 2 ? 22 : 11} className="hist-t">{h.label}</text>}
                </g>
              ))}
              <line x1={x(CURRENT_YEAR)} x2={x(CURRENT_YEAR)} y1={0} y2={H} className="now" />
              {placed.flatMap((g) => g.items).map(({ p, y }) => {
                const b = birthYear(p);
                const living = isLiving(p);
                const d = !isNaN(deathYear(p)) ? deathYear(p) : living ? CURRENT_YEAR : b + 70;
                const col = colorer.color(p.id);
                const faded = filters.mode === 'highlight' && !matched.has(p.id);
                return (
                  <g key={p.id} className={`tl-row ${faded ? 'faded' : ''} ${selectedId === p.id ? 'sel' : ''}`} onClick={() => select(p.id)}>
                    <title>{fullName(p)} · {lifeSpan(p)}{p.birthPlace ? ` · born ${p.birthPlace}` : ''}</title>
                    <rect x={x(b)} y={y + 8} width={Math.max(4, x(d) - x(b))} height={14} rx={4} fill={col} className={living ? 'bar living' : 'bar'} />
                    {living && <circle cx={x(d)} cy={y + 15} r={4} fill={col} className="pulse" />}
                    {p.events.filter((e) => ICON[e.type]).map((e) => (
                      <g key={e.id} transform={`translate(${x(e.year)},${y + 15})`} className="ev"><title>{e.year}: {e.title}</title><circle r={9} /><text y={4} textAnchor="middle">{ICON[e.type]}</text></g>
                    ))}
                    {pxPerYear >= 3 && <text x={x(d) + 8} y={y + 19} className="tl-yrs">{lifeSpan(p)}</text>}
                  </g>
                );
              })}
              {cursor && <line x1={x(cursor)} x2={x(cursor)} y1={0} y2={H} className="cursor" />}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
