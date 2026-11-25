import type { Person, Filters, ColorMode } from '../types';
import { countryOf } from '../data/places';

export const CURRENT_YEAR = new Date().getFullYear();

export const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];
export const SERIES_DARK = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'];
export const NEUTRAL = '#9a9890';
export const SEQ = ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#184f95', '#0d366b'];

export const yearOf = (d?: string) => (d ? parseInt(d.slice(0, 4), 10) : NaN);
export const birthYear = (p: Person) => yearOf(p.birthDate);
export const deathYear = (p: Person) => yearOf(p.deathDate);
// Unknown birth year (e.g. legendary or very old records) is never treated as living.
export const isLiving = (p: Person) => !p.deathDate && !isNaN(birthYear(p)) && birthYear(p) >= CURRENT_YEAR - 105;
/** Was this person alive at some point during `year`? Unknown death years assume a ~85 year life. */
export function aliveIn(p: Person, year: number) {
  const b = birthYear(p);
  if (isNaN(b) || b > year) return false;
  const d = deathYear(p);
  if (!isNaN(d)) return d >= year;
  return isLiving(p) || b + 85 >= year;
}
/** Where a person was living in a given year: birthplace, then moves and recorded residences, then their current home. */
export function placeIn(p: Person, year: number): string | undefined {
  let place = p.birthPlace;
  for (const e of [...p.events].sort((x, y) => x.year - y.year)) {
    if (e.year > year) break;
    if (e.type === 'migration' && e.toPlace) place = e.toPlace;
    if (e.type === 'residence' && e.place) place = e.place;
  }
  if (p.residence && year >= CURRENT_YEAR - 1) place = p.residence;
  return place;
}
export const fullName = (p: Person) => `${p.given} ${p.surname}`.trim();
export const lifeSpan = (p: Person) => {
  const b = birthYear(p), d = deathYear(p);
  if (isNaN(b)) return '';
  if (!isNaN(d)) return `${b}–${d}`;
  return isLiving(p) ? `b. ${b}` : `${b}–?`;
};
export const ageAt = (p: Person, year: number) => year - birthYear(p);
export const age = (p: Person) => {
  const b = birthYear(p);
  if (isNaN(b)) return NaN;
  const d = deathYear(p);
  return (isNaN(d) ? CURRENT_YEAR : d) - b;
};

export interface Index {
  byId: Map<string, Person>;
  children: Map<string, string[]>;
}

export function buildIndex(people: Person[]): Index {
  const byId = new Map(people.map((p) => [p.id, p]));
  const children = new Map<string, string[]>();
  for (const p of people) {
    for (const par of [p.fatherId, p.motherId]) {
      if (par && byId.has(par)) {
        if (!children.has(par)) children.set(par, []);
        children.get(par)!.push(p.id);
      }
    }
  }
  for (const list of children.values()) list.sort((a, b) => birthYear(byId.get(a)!) - birthYear(byId.get(b)!));
  return { byId, children };
}

export const parentsOf = (ix: Index, id: string) => {
  const p = ix.byId.get(id);
  return p ? [p.fatherId, p.motherId].filter((x): x is string => !!x && ix.byId.has(x)) : [];
};
export const childrenOf = (ix: Index, id: string) => ix.children.get(id) ?? [];
export const spousesOf = (ix: Index, id: string) => (ix.byId.get(id)?.spouseIds ?? []).filter((s) => ix.byId.has(s));
export function siblingsOf(ix: Index, id: string) {
  const s = new Set<string>();
  for (const par of parentsOf(ix, id)) for (const c of childrenOf(ix, par)) if (c !== id) s.add(c);
  return [...s].sort((a, b) => birthYear(ix.byId.get(a)!) - birthYear(ix.byId.get(b)!));
}

/** Map of ancestor id → generations up (self = 0). */
export function ancestorsOf(ix: Index, id: string): Map<string, number> {
  const out = new Map<string, number>([[id, 0]]);
  const q = [id];
  while (q.length) {
    const cur = q.shift()!;
    for (const p of parentsOf(ix, cur)) if (!out.has(p)) { out.set(p, out.get(cur)! + 1); q.push(p); }
  }
  return out;
}
export function descendantsOf(ix: Index, id: string): Map<string, number> {
  const out = new Map<string, number>([[id, 0]]);
  const q = [id];
  while (q.length) {
    const cur = q.shift()!;
    for (const c of childrenOf(ix, cur)) if (!out.has(c)) { out.set(c, out.get(cur)! + 1); q.push(c); }
  }
  return out;
}

/** Generation number relative to focus (parents -1, children +1, spouses same). */
export function generations(ix: Index, focus: string): Map<string, number> {
  const gen = new Map<string, number>();
  const run = (start: string, g0: number) => {
    gen.set(start, g0);
    const q = [start];
    while (q.length) {
      const cur = q.shift()!;
      const g = gen.get(cur)!;
      const push = (n: string, v: number) => { if (!gen.has(n)) { gen.set(n, v); q.push(n); } };
      spousesOf(ix, cur).forEach((s) => push(s, g));
      parentsOf(ix, cur).forEach((p) => push(p, g - 1));
      childrenOf(ix, cur).forEach((c) => push(c, g + 1));
    }
  };
  if (ix.byId.has(focus)) run(focus, 0);
  const fb = birthYear(ix.byId.get(focus) ?? ([...ix.byId.values()][0] as Person));
  for (const p of ix.byId.values()) {
    if (!gen.has(p.id)) {
      const b = birthYear(p);
      run(p.id, isNaN(b) || isNaN(fb) ? 0 : Math.round((b - fb) / 28));
    }
  }
  return gen;
}

// ---------- Relationships ----------
const ord = (n: number) => (n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`);
const greats = (n: number) => (n <= 0 ? '' : n === 1 ? 'great-' : n === 2 ? 'great-great-' : `${n}× great-`);
const removed = (n: number) => (n === 0 ? '' : n === 1 ? ' once removed' : n === 2 ? ' twice removed' : ` ${n}× removed`);
const g3 = (p: Person, m: string, f: string, u: string) => (p.gender === 'M' ? m : p.gender === 'F' ? f : u);

/** What is B to A, by blood? Returns null if no common ancestor. */
export function bloodTerm(ix: Index, aId: string, bId: string): string | null {
  if (aId === bId) return 'self';
  const A = ancestorsOf(ix, aId), B = ancestorsOf(ix, bId);
  let best: { a: number; b: number; ca: string[] } | null = null;
  for (const [id, da] of A) {
    const db = B.get(id);
    if (db === undefined) continue;
    if (!best || da + db < best.a + best.b) best = { a: da, b: db, ca: [id] };
    else if (da + db === best.a + best.b) best.ca.push(id);
  }
  if (!best) return null;
  const { a, b } = best;
  const P = ix.byId.get(bId)!;
  if (a === 0) { // B is descendant of A
    if (b === 1) return g3(P, 'son', 'daughter', 'child');
    return greats(b - 2) + g3(P, 'grandson', 'granddaughter', 'grandchild');
  }
  if (b === 0) { // B is ancestor of A
    if (a === 1) return g3(P, 'father', 'mother', 'parent');
    return greats(a - 2) + g3(P, 'grandfather', 'grandmother', 'grandparent');
  }
  if (a === 1 && b === 1) return (best.ca.length < 2 && parentsOf(ix, aId).length === 2 ? 'half-' : '') + g3(P, 'brother', 'sister', 'sibling');
  if (a === 1) return greats(b - 3) + (b >= 3 ? 'grand' : '') + g3(P, 'nephew', 'niece', 'niece/nephew');
  if (b === 1) return greats(a - 3) + (a >= 3 ? 'grand-' : '') + g3(P, 'uncle', 'aunt', 'aunt/uncle');
  return `${ord(Math.min(a, b) - 1)} cousin${removed(Math.abs(a - b))}`;
}

/** Shortest path through parent/child/spouse links. */
export function findPath(ix: Index, a: string, b: string): string[] | null {
  if (!ix.byId.has(a) || !ix.byId.has(b)) return null;
  const prev = new Map<string, string | null>([[a, null]]);
  const q = [a];
  while (q.length) {
    const cur = q.shift()!;
    if (cur === b) break;
    for (const n of [...parentsOf(ix, cur), ...childrenOf(ix, cur), ...spousesOf(ix, cur)]) {
      if (!prev.has(n)) { prev.set(n, cur); q.push(n); }
    }
  }
  if (!prev.has(b)) return null;
  const path: string[] = [];
  for (let c: string | null = b; c; c = prev.get(c) ?? null) path.unshift(c);
  return path;
}

/** Human label for "B is A's ____". */
export function relationship(ix: Index, aId: string, bId: string): string {
  const B = ix.byId.get(bId);
  if (!B) return '';
  const blood = bloodTerm(ix, aId, bId);
  if (blood) return blood;
  if (spousesOf(ix, aId).includes(bId)) return g3(B, 'husband', 'wife', 'spouse');
  // B is the spouse of A's blood relative (prefer specific in-law terms over generic ones)
  let fallback: string | undefined;
  for (const s of spousesOf(ix, bId)) {
    const t = bloodTerm(ix, aId, s);
    if (!t) continue;
    if (/^(son|daughter|child)$/.test(t)) return g3(B, 'son', 'daughter', 'child') + '-in-law';
    if (/(brother|sister|sibling)$/.test(t)) return g3(B, 'brother', 'sister', 'sibling') + '-in-law';
    if (/(uncle|aunt)$/.test(t)) return t.replace(/aunt\/uncle|uncle|aunt/, g3(B, 'uncle', 'aunt', 'aunt/uncle')) + ' (by marriage)';
    if (/^(father|mother|parent)$/.test(t)) return 'step' + g3(B, 'father', 'mother', 'parent');
    if (/(father|mother|parent)$/.test(t)) return t.replace(/father|mother|parent/, g3(B, 'father', 'mother', 'parent')) + ' (by marriage)';
    fallback ??= `${t}’s ${g3(B, 'husband', 'wife', 'spouse')}`;
  }
  // B is a blood relative of A's spouse
  for (const s of spousesOf(ix, aId)) {
    const t = bloodTerm(ix, s, bId);
    if (!t) continue;
    if (/^(father|mother|parent)$/.test(t)) return t + '-in-law';
    if (/^(half-)?(brother|sister|sibling)$/.test(t)) return t.replace('half-', '') + '-in-law';
    fallback ??= `spouse’s ${t}`;
  }
  if (fallback) return fallback;
  return findPath(ix, aId, bId) ? 'relative by marriage' : 'not connected';
}

export const possessive = (name: string) => (name.endsWith('s') ? `${name}’` : `${name}’s`);

// ---------- Branches (grandparent lines) ----------
export interface BranchInfo { key: string; label: string; color: string }

export function computeBranches(ix: Index, focus: string): { branchOf: Map<string, string>; branches: BranchInfo[] } {
  const branchOf = new Map<string, string>();
  const branches: BranchInfo[] = [];
  const F = ix.byId.get(focus);
  if (!F) return { branchOf, branches };
  const gps: Person[] = [];
  for (const par of [F.fatherId, F.motherId]) {
    const P = par ? ix.byId.get(par) : undefined;
    if (!P) continue;
    for (const gp of [P.fatherId, P.motherId]) { const G = gp ? ix.byId.get(gp) : undefined; if (G) gps.push(G); }
  }
  const lines = gps.map((g, i) => ({ key: 'line:' + g.id, label: `${g.birthSurname || g.surname || g.given} line`, color: SERIES[i], anc: ancestorsOf(ix, g.id) }));
  branches.push(...lines.map(({ key, label, color }) => ({ key, label, color })));
  branches.push({ key: 'direct', label: 'Immediate family', color: SERIES[6] });
  branches.push({ key: 'married', label: 'Married in', color: NEUTRAL });
  branches.push({ key: 'other', label: 'Other', color: '#c8c6bd' });

  const focusAnc = ancestorsOf(ix, focus);
  const parents = new Set(parentsOf(ix, focus));
  const classify = (id: string): string | null => {
    const anc = ancestorsOf(ix, id);
    // nearest common ancestors
    let bestD = Infinity; let cas: string[] = [];
    for (const [a, d] of anc) {
      const fd = focusAnc.get(a);
      if (fd === undefined) continue;
      const t = d + fd;
      if (t < bestD) { bestD = t; cas = [a]; } else if (t === bestD) cas.push(a);
    }
    if (!cas.length) return null;
    if (cas.some((c) => c === focus || parents.has(c))) return 'direct';
    for (const l of lines) if (cas.some((c) => l.anc.has(c))) return l.key;
    return 'direct';
  };
  for (const p of ix.byId.values()) {
    const c = classify(p.id);
    if (c) branchOf.set(p.id, c);
  }
  for (const p of ix.byId.values()) {
    if (branchOf.has(p.id)) continue;
    branchOf.set(p.id, p.spouseIds.some((s) => branchOf.has(s)) ? 'married' : 'other');
  }
  return { branchOf, branches };
}

// ---------- Scope & filters ----------
export function scopeSet(ix: Index, focus: string, scope: Filters['scope']): Set<string> | null {
  if (scope === 'all') return null;
  const anc = ancestorsOf(ix, focus), desc = descendantsOf(ix, focus);
  const s = new Set<string>();
  if (scope === 'ancestors' || scope === 'hourglass' || scope === 'direct') anc.forEach((_, k) => s.add(k));
  if (scope === 'descendants' || scope === 'hourglass' || scope === 'direct') {
    desc.forEach((_, k) => { s.add(k); spousesOf(ix, k).forEach((sp) => s.add(sp)); });
  }
  if (scope === 'direct') {
    for (const a of anc.keys()) for (const sib of siblingsOf(ix, a)) s.add(sib);
  }
  return s;
}

export function matchSet(people: Person[], ix: Index, focus: string, f: Filters, gen: Map<string, number>, branchOf: Map<string, string>): Set<string> {
  const scope = scopeSet(ix, focus, f.scope);
  const text = f.text.trim().toLowerCase();
  const out = new Set<string>();
  for (const p of people) {
    if (scope && !scope.has(p.id)) continue;
    const g = gen.get(p.id) ?? 0;
    if (g < f.genMin || g > f.genMax) continue;
    const by = birthYear(p);
    if (!isNaN(by) && (by < f.yearMin || by > f.yearMax)) continue;
    if (f.status === 'living' && !isLiving(p)) continue;
    if (f.status === 'deceased' && isLiving(p)) continue;
    if (f.gender !== 'all' && p.gender !== f.gender) continue;
    if (f.surnames.length && !f.surnames.includes(p.surname) && !(p.birthSurname && f.surnames.includes(p.birthSurname))) continue;
    if (f.countries.length && !f.countries.includes(countryOf(p.birthPlace) ?? '')) continue;
    if (f.branches.length && !f.branches.includes(branchOf.get(p.id) ?? '')) continue;
    if (f.tags.length && !f.tags.every((t) => p.tags.includes(t))) continue;
    if (f.aliveIn !== null && f.aliveIn !== undefined && !aliveIn(p, f.aliveIn)) continue;
    if (text) {
      const hay = [p.given, p.surname, p.birthSurname, p.birthPlace, p.deathPlace, p.occupation, ...p.tags].join(' ').toLowerCase();
      if (!text.split(/\s+/).every((t) => hay.includes(t))) continue;
    }
    out.add(p.id);
  }
  return out;
}

export function activeFilterCount(f: Filters, d: Filters) {
  let n = 0;
  if (f.text) n++;
  if (f.scope !== d.scope) n++;
  if (f.genMin !== d.genMin || f.genMax !== d.genMax) n++;
  if (f.yearMin !== d.yearMin || f.yearMax !== d.yearMax) n++;
  if (f.status !== 'all') n++;
  if (f.gender !== 'all') n++;
  n += f.surnames.length ? 1 : 0;
  n += f.countries.length ? 1 : 0;
  n += f.branches.length ? 1 : 0;
  n += f.tags.length ? 1 : 0;
  n += f.aliveIn != null ? 1 : 0;
  return n;
}

// ---------- Coloring ----------
export interface Colorer { color: (id: string) => string; legend: { label: string; color: string }[]; title: string }

export function makeColorer(mode: ColorMode, people: Person[], gen: Map<string, number>, branch: { branchOf: Map<string, string>; branches: BranchInfo[] }, dark: boolean): Colorer {
  const S = dark ? SERIES_DARK : SERIES;
  const byId = new Map(people.map((p) => [p.id, p]));
  const top = (keys: (string | undefined)[], n: number) => {
    const c = new Map<string, number>();
    keys.forEach((k) => k && c.set(k, (c.get(k) ?? 0) + 1));
    return [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map((e) => e[0]);
  };
  switch (mode) {
    case 'branch': {
      const m = new Map(branch.branches.map((b, i) => [b.key, b.key.startsWith('line:') ? S[i] : b.key === 'direct' ? S[6] : b.color]));
      return { title: 'Family line', color: (id) => m.get(branch.branchOf.get(id) ?? '') ?? NEUTRAL, legend: branch.branches.filter((b) => [...branch.branchOf.values()].includes(b.key)).map((b) => ({ label: b.label, color: m.get(b.key)! })) };
    }
    case 'surname': {
      const t = top(people.map((p) => p.birthSurname ?? p.surname), 7);
      const m = new Map(t.map((s, i) => [s, S[i]]));
      return { title: 'Birth surname', color: (id) => { const p = byId.get(id); return m.get(p?.birthSurname ?? p?.surname ?? '') ?? NEUTRAL; }, legend: [...t.map((s) => ({ label: s, color: m.get(s)! })), { label: 'Other', color: NEUTRAL }] };
    }
    case 'country': {
      const t = top(people.map((p) => countryOf(p.birthPlace)), 7);
      const m = new Map(t.map((s, i) => [s, S[i]]));
      return { title: 'Birth country', color: (id) => m.get(countryOf(byId.get(id)?.birthPlace) ?? '') ?? NEUTRAL, legend: [...t.map((s) => ({ label: s, color: m.get(s)! })), { label: 'Other', color: NEUTRAL }] };
    }
    case 'gender':
      return { title: 'Gender', color: (id) => { const g = byId.get(id)?.gender; return g === 'M' ? S[0] : g === 'F' ? S[1] : NEUTRAL; }, legend: [{ label: 'Male', color: S[0] }, { label: 'Female', color: S[1] }, { label: 'Unknown', color: NEUTRAL }] };
    case 'generation': {
      const gs = [...new Set(people.map((p) => gen.get(p.id) ?? 0))].sort((a, b) => a - b);
      const ramp = gs.map((_, i) => SEQ[Math.round((i / Math.max(1, gs.length - 1)) * (SEQ.length - 2)) + 1]);
      const m = new Map(gs.map((g, i) => [g, ramp[i]]));
      return { title: 'Generation (oldest → youngest)', color: (id) => m.get(gen.get(id) ?? 0) ?? NEUTRAL, legend: gs.map((g) => ({ label: g === 0 ? 'Focus' : g > 0 ? `+${g}` : `${g}`, color: m.get(g)! })) };
    }
    case 'lifespan': {
      const bins = [[0, 40], [40, 60], [60, 75], [75, 85], [85, 95], [95, 200]] as const;
      const cols = SEQ.slice(1);
      const lbl = ['< 40', '40–59', '60–74', '75–84', '85–94', '95+'];
      return {
        title: 'Age reached (deceased)',
        color: (id) => {
          const p = byId.get(id); if (!p || isLiving(p)) return dark ? '#3a3a37' : '#e4e2da';
          const a = age(p); const i = bins.findIndex(([lo, hi]) => a >= lo && a < hi);
          return cols[Math.max(0, i)];
        },
        legend: [...lbl.map((l, i) => ({ label: l, color: cols[i] })), { label: 'Living', color: dark ? '#3a3a37' : '#e4e2da' }],
      };
    }
    default:
      return { title: '', color: () => NEUTRAL, legend: [] };
  }
}

export const uid = () => Math.random().toString(36).slice(2, 10);

/** Readable ink (near-black or white) on a given fill. */
export function inkOn(hex: string) {
  const h = hex.replace('#', '');
  if (h.length < 6) return '#fff';
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return L > 0.36 ? '#1a1a19' : '#ffffff';
}
