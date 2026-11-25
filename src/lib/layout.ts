import type { Index } from './graph';
import { parentsOf, childrenOf, spousesOf, birthYear } from './graph';

export const NODE_W = 184;
export const NODE_H = 64;
const SPOUSE_GAP = 20;
const UNIT_GAP = 40;
export const ROW_H = 150;

export interface LaidNode { id: string; x: number; y: number } // center
export interface Family { key: string; parents: string[]; children: string[]; sx: number; sy: number; busY: number }
export interface Layout { nodes: Map<string, LaidNode>; families: Family[]; couples: [string, string, boolean][]; bounds: { x0: number; y0: number; x1: number; y1: number } }

interface Unit { members: string[]; x: number }

/** Isotonic regression (pool-adjacent-violators) → minimal squared movement respecting order + spacing. */
function placeRow(units: Unit[], desired: number[]) {
  const n = units.length;
  if (!n) return;
  const widths = units.map((u) => u.members.length * NODE_W + (u.members.length - 1) * SPOUSE_GAP);
  const off: number[] = [];
  let acc = 0;
  for (let i = 0; i < n; i++) { off.push(acc); acc += widths[i] + UNIT_GAP; }
  const target = desired.map((d, i) => d - off[i]);
  const blocks: { sum: number; cnt: number; start: number }[] = [];
  for (let i = 0; i < n; i++) {
    blocks.push({ sum: target[i], cnt: 1, start: i });
    while (blocks.length > 1) {
      const b = blocks[blocks.length - 1], a = blocks[blocks.length - 2];
      if (a.sum / a.cnt <= b.sum / b.cnt) break;
      a.sum += b.sum; a.cnt += b.cnt; blocks.pop();
    }
  }
  for (const b of blocks) for (let k = 0; k < b.cnt; k++) units[b.start + k].x = b.sum / b.cnt + off[b.start + k];
}

export function layoutTree(ix: Index, visible: Set<string>, gen: Map<string, number>, rank: (id: string) => number): Layout {
  const rows = new Map<number, string[]>();
  for (const id of visible) {
    const g = gen.get(id) ?? 0;
    if (!rows.has(g)) rows.set(g, []);
    rows.get(g)!.push(id);
  }
  const gens = [...rows.keys()].sort((a, b) => a - b);
  const vis = (ids: string[]) => ids.filter((i) => visible.has(i));

  // --- build couple units per row
  const unitRows = new Map<number, Unit[]>();
  const unitOf = new Map<string, Unit>();
  for (const g of gens) {
    const ids = rows.get(g)!.slice().sort((a, b) => rank(a) - rank(b) || birthYear(ix.byId.get(a)!) - birthYear(ix.byId.get(b)!));
    const seen = new Set<string>();
    const units: Unit[] = [];
    for (const id of ids) {
      if (seen.has(id)) continue;
      const members: string[] = [];
      const st = [id];
      while (st.length) {
        const c = st.pop()!;
        if (seen.has(c)) continue;
        seen.add(c); members.push(c);
        vis(spousesOf(ix, c)).filter((s) => (gen.get(s) ?? 0) === g).forEach((s) => st.push(s));
      }
      // put the most-married person in the middle; men left by default
      members.sort((a, b) => (ix.byId.get(a)!.gender === 'M' ? -1 : 0) - (ix.byId.get(b)!.gender === 'M' ? -1 : 0));
      if (members.length > 2) {
        const hub = members.reduce((m, c) => (spousesOf(ix, c).length > spousesOf(ix, m).length ? c : m));
        const rest = members.filter((m) => m !== hub);
        members.splice(0, members.length, ...rest.slice(0, Math.ceil(rest.length / 2)), hub, ...rest.slice(Math.ceil(rest.length / 2)));
      }
      const u = { members, x: 0 };
      units.push(u);
      members.forEach((m) => unitOf.set(m, u));
    }
    unitRows.set(g, units);
  }

  // --- ordering via barycenter sweeps on person index positions
  const pos = new Map<string, number>();
  const reindex = (g: number) => {
    let i = 0;
    for (const u of unitRows.get(g)!) for (const m of u.members) pos.set(m, i++);
  };
  gens.forEach(reindex);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
  const sweep = (dir: 'down' | 'up') => {
    const order = dir === 'down' ? gens.slice(1) : gens.slice(0, -1).reverse();
    for (const g of order) {
      const units = unitRows.get(g)!;
      const keyed = units.map((u, i) => {
        const nb = u.members.flatMap((m) => (dir === 'down' ? vis(parentsOf(ix, m)) : vis(childrenOf(ix, m)))).filter((n) => pos.has(n) && (gen.get(n) ?? 0) !== g);
        const k = avg(nb.map((n) => pos.get(n)!));
        return { u, k: isNaN(k) ? NaN : k, i };
      });
      // units without neighbours keep their relative slot
      let last = -1;
      for (const e of keyed) { if (isNaN(e.k)) e.k = last + 0.001; last = e.k; }
      keyed.sort((a, b) => a.k - b.k || a.i - b.i);
      unitRows.set(g, keyed.map((e) => e.u));
      // orient couples so each spouse sits on the side of their own parents
      for (const u of unitRows.get(g)!) {
        if (u.members.length !== 2) continue;
        const [a, b] = u.members;
        const pa = avg(vis(parentsOf(ix, a)).filter((n) => pos.has(n)).map((n) => pos.get(n)!));
        const pb = avg(vis(parentsOf(ix, b)).filter((n) => pos.has(n)).map((n) => pos.get(n)!));
        if (!isNaN(pa) && !isNaN(pb) && pa > pb) u.members.reverse();
      }
      reindex(g);
    }
  };
  for (let i = 0; i < 6; i++) { sweep('down'); sweep('up'); }
  // final orientation pass using neighbor position of unit in its row
  for (const g of gens) {
    const units = unitRows.get(g)!;
    units.forEach((u, ui) => {
      if (u.members.length !== 2) return;
      const [a, b] = u.members;
      const hasA = vis(parentsOf(ix, a)).length > 0, hasB = vis(parentsOf(ix, b)).length > 0;
      if (hasA === hasB) return;
      // the spouse with parents should sit toward their parents: estimate by unit's neighbours
      const withP = hasA ? a : b;
      const pAvg = avg(vis(parentsOf(ix, withP)).map((n) => pos.get(n)!));
      const myIdx = pos.get(withP)!;
      const rowCount = units.reduce((s, x) => s + x.members.length, 0);
      void ui; void rowCount;
      const rowsAbove = unitRows.get(g - 1);
      if (!rowsAbove) return;
      const aboveCount = rowsAbove.reduce((s, x) => s + x.members.length, 0);
      const myRel = myIdx / Math.max(1, rowCount - 1), pRel = pAvg / Math.max(1, aboveCount - 1);
      const wantLeft = pRel < myRel;
      if ((wantLeft && u.members[0] !== withP) || (!wantLeft && u.members[0] === withP)) u.members.reverse();
    });
    reindex(g);
  }

  // --- x assignment
  const unitW = (u: Unit) => u.members.length * NODE_W + (u.members.length - 1) * SPOUSE_GAP;
  const personX = (id: string) => { const u = unitOf.get(id)!; return u.x + u.members.indexOf(id) * (NODE_W + SPOUSE_GAP) + NODE_W / 2; };
  for (const g of gens) { let x = 0; for (const u of unitRows.get(g)!) { u.x = x; x += unitW(u) + UNIT_GAP; } }
  const unitTarget = (u: Unit, g: number, useParents: boolean, useChildren: boolean) => {
    const ts: number[] = [];
    if (useParents) {
      for (const m of u.members) {
        const ps = vis(parentsOf(ix, m)).filter((p) => (gen.get(p) ?? 0) < g);
        if (ps.length) {
          // the member should sit under its parents' midpoint
          const mid = avg(ps.map(personX));
          ts.push(mid - (personX(m) - u.x) + 0); // desired unit.x so that member is centered under parents
        }
      }
    }
    if (useChildren) {
      const kids = [...new Set(u.members.flatMap((m) => vis(childrenOf(ix, m))))].filter((c) => (gen.get(c) ?? 0) > g);
      if (kids.length) {
        const xs = kids.map(personX);
        const mid = (Math.min(...xs) + Math.max(...xs)) / 2;
        ts.push(mid - unitW(u) / 2);
      }
    }
    return ts.length ? avg(ts) : u.x;
  };
  for (let it = 0; it < 40; it++) {
    const down = it % 2 === 0;
    const seq = down ? gens : gens.slice().reverse();
    for (const g of seq) {
      const units = unitRows.get(g)!;
      const d = units.map((u) => unitTarget(u, g, down || it > 30, !down || it > 30));
      placeRow(units, d);
    }
  }

  // --- output
  const nodes = new Map<string, LaidNode>();
  const g0 = gens[0] ?? 0;
  for (const g of gens) for (const u of unitRows.get(g)!) for (const m of u.members) nodes.set(m, { id: m, x: personX(m), y: (g - g0) * ROW_H });

  const families: Family[] = [];
  const famMap = new Map<string, Family>();
  for (const id of visible) {
    const ps = vis(parentsOf(ix, id)).filter((p) => nodes.has(p));
    if (!ps.length) continue;
    const key = ps.slice().sort().join('+');
    if (!famMap.has(key)) {
      const pn = ps.map((p) => nodes.get(p)!);
      const together = ps.length === 2 && Math.abs(pn[0].x - pn[1].x) <= NODE_W + SPOUSE_GAP + 1 && pn[0].y === pn[1].y;
      const sx = together ? (pn[0].x + pn[1].x) / 2 : pn[0].x;
      const sy = together ? pn[0].y : pn[0].y + NODE_H / 2;
      const f: Family = { key, parents: ps, children: [], sx, sy, busY: 0 };
      famMap.set(key, f); families.push(f);
    }
    famMap.get(key)!.children.push(id);
  }
  // stagger bus lines between rows to reduce overlap
  const byRow = new Map<number, Family[]>();
  for (const f of families) { const y = nodes.get(f.parents[0])!.y; if (!byRow.has(y)) byRow.set(y, []); byRow.get(y)!.push(f); }
  for (const [y, fs] of byRow) { fs.sort((a, b) => a.sx - b.sx); fs.forEach((f, i) => (f.busY = y + NODE_H / 2 + 30 + (i % 3) * 9)); }

  const couples: [string, string, boolean][] = [];
  const cs = new Set<string>();
  for (const id of visible) for (const s of vis(spousesOf(ix, id))) {
    const k = [id, s].sort().join('+');
    if (cs.has(k) || !nodes.has(s)) continue;
    cs.add(k);
    const a = nodes.get(id)!, b = nodes.get(s)!;
    couples.push([id, s, a.y === b.y && Math.abs(a.x - b.x) <= NODE_W + SPOUSE_GAP + 1]);
  }

  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const n of nodes.values()) { x0 = Math.min(x0, n.x - NODE_W / 2); x1 = Math.max(x1, n.x + NODE_W / 2); y0 = Math.min(y0, n.y - NODE_H / 2); y1 = Math.max(y1, n.y + NODE_H / 2); }
  if (!nodes.size) { x0 = y0 = 0; x1 = y1 = 1; }
  return { nodes, families, couples, bounds: { x0, y0, x1, y1 } };
}
