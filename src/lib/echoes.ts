import type { Person } from '../types';
import type { Index } from './graph';
import { birthYear, deathYear, age, isLiving, ancestorsOf, parentsOf, childrenOf, bloodTerm, fullName } from './graph';
import { countryOf } from '../data/places';

/** A pattern discovered across the family — names, jobs, dates and places that repeat. */
export interface Echo { id: string; icon: string; title: string; detail: string; people: string[]; weight: number }

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const city = (s?: string) => (s ? s.split(',')[0].trim() : '');
const plural = (w: string) => (/man$/.test(w) ? w.replace(/man$/, 'men') : /(s|sh|ch|x)$/.test(w) ? w + 'es' : /[^aeiou]y$/.test(w) ? w.slice(0, -1) + 'ies' : w + 's');
const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');
const names = (ps: Person[]) => {
  const g = ps.map((p) => p.given.split(/[\s(]/)[0]);
  return g.length <= 2 ? g.join(' and ') : `${g.slice(0, -1).join(', ')} and ${g.at(-1)}`;
};

export function findEchoes(people: Person[], ix: Index): Echo[] {
  const out: Echo[] = [];
  const by = (id: string) => ix.byId.get(id)!;

  // 1. Names that come back generations later (named after an ancestor)
  for (const p of people) {
    const first = norm(p.given.split(/[\s(]/)[0]);
    if (first.length < 3) continue;
    const anc = [...ancestorsOf(ix, p.id).entries()].filter(([id, d]) => d >= 2 && norm(by(id).given.split(/[\s(]/)[0]) === first);
    if (anc.length) {
      const [aid, d] = anc.sort((x, y) => x[1] - y[1])[0];
      const A = by(aid);
      out.push({ id: `name-anc-${p.id}`, icon: '🔁', title: `${p.given} carries an ancestor’s name`, detail: `${fullName(p)} shares a first name with ${fullName(A)}, ${d === 2 ? 'a grandparent' : `${d - 2 === 1 ? 'a great-' : `${d - 2}× great-`}grandparent`}${!isNaN(birthYear(A)) && !isNaN(birthYear(p)) ? ` born ${birthYear(p) - birthYear(A)} years earlier` : ''}.`, people: [A.id, p.id], weight: 6 + d });
    }
  }
  // names shared by unrelated-in-line relatives (the same name across branches)
  const byName = new Map<string, Person[]>();
  for (const p of people) { const k = norm(p.given.split(/[\s(]/)[0]); if (k.length >= 3) byName.set(k, [...(byName.get(k) ?? []), p]); }
  for (const [, ps] of byName) {
    if (ps.length < 2) continue;
    if (ps.length === 2 && out.some((e) => e.people.includes(ps[0].id) && e.people.includes(ps[1].id))) continue;
    const ys = ps.map(birthYear).filter((y) => !isNaN(y));
    out.push({ id: `name-${ps[0].given}`, icon: '📛', title: `${ps.length} people named ${ps[0].given.split(/[\s(]/)[0]}`, detail: `${ps.map(fullName).join(', ')}${ys.length > 1 ? ` — born ${Math.max(...ys) - Math.min(...ys)} years apart` : ''}.`, people: ps.map((p) => p.id), weight: 3 + ps.length });
  }

  // 2. Work passed down a line, and the family's most common callings
  for (const p of people) {
    if (!p.occupation) continue;
    const occ = norm(p.occupation);
    const chain = [p];
    let cur: Person | undefined = p;
    while (cur) {
      const next: Person | undefined = parentsOf(ix, cur.id).map(by).find((q) => q.occupation && norm(q.occupation) === occ);
      if (next) chain.unshift(next);
      cur = next;
    }
    const hasChildSame = childrenOf(ix, p.id).some((c) => by(c).occupation && norm(by(c).occupation!) === occ);
    if (chain.length >= 2 && !hasChildSame) out.push({ id: `job-line-${p.id}`, icon: '🧰', title: `${chain.length} generations of ${plural(p.occupation.toLowerCase())}`, detail: `${names(chain)} — the same work, handed down from parent to child.`, people: chain.map((q) => q.id), weight: 8 + chain.length * 2 });
  }
  const byJob = new Map<string, Person[]>();
  for (const p of people) if (p.occupation) byJob.set(norm(p.occupation), [...(byJob.get(norm(p.occupation)) ?? []), p]);
  for (const [, ps] of byJob) {
    if (ps.length < 2 || out.some((e) => e.id.startsWith('job-line') && ps.every((p) => e.people.includes(p.id)))) continue;
    const nc = new Set(ps.map((p) => countryOf(p.birthPlace)).filter(Boolean)).size;
    out.push({ id: `job-${ps[0].occupation}`, icon: '💼', title: `${ps.length} ${plural(ps[0].occupation!.toLowerCase())} in the family`, detail: `${names(ps)}${nc > 1 ? ` — born in ${nc} different countries` : ''}.`, people: ps.map((p) => p.id), weight: 2 + ps.length });
  }

  // 3. Dates that line up
  const full = people.filter((p) => p.birthDate && p.birthDate.length >= 10);
  const byDay = new Map<string, Person[]>();
  for (const p of full) byDay.set(p.birthDate!.slice(5), [...(byDay.get(p.birthDate!.slice(5)) ?? []), p]);
  for (const [md, ps] of byDay) {
    if (ps.length < 2) continue;
    const [m, d] = md.split('-').map(Number);
    const twins = ps.length === 2 && ps[0].birthDate === ps[1].birthDate;
    out.push({ id: `bday-${md}`, icon: twins ? '👯' : '🎂', title: twins ? `${names(ps)} were born on the very same day` : `${ps.length} relatives share a birthday`, detail: `${names(ps)} were ${ps.length === 2 ? 'both' : 'all'} born on ${MONTHS[m - 1]} ${d}${twins ? '' : ` — in ${ps.map(birthYear).join(' and ')}`}.`, people: ps.map((p) => p.id), weight: 7 + ps.length });
  }
  for (const p of full) for (const q of people) {
    if (q.id === p.id || !q.deathDate || q.deathDate.length < 10 || q.deathDate.slice(5) !== p.birthDate!.slice(5)) continue;
    if (birthYear(p) < deathYear(q)) continue;
    const rel = bloodTerm(ix, p.id, q.id);
    if (!rel) continue;
    out.push({ id: `bdeath-${p.id}-${q.id}`, icon: '🕯️', title: `${p.given} was born on ${q.given}’s remembrance day`, detail: `${fullName(p)} arrived on ${MONTHS[+p.birthDate!.slice(5, 7) - 1]} ${+p.birthDate!.slice(8)} — the same date ${fullName(q)} (${p.given}’s ${rel}) had died${birthYear(p) === deathYear(q) ? ' earlier that same year' : ` ${birthYear(p) - deathYear(q)} years before`}.`, people: [q.id, p.id], weight: 9 });
  }

  // 4. Places the family keeps returning to
  const byTown = new Map<string, Person[]>();
  for (const p of people) if (p.birthPlace) byTown.set(city(p.birthPlace), [...(byTown.get(city(p.birthPlace)) ?? []), p]);
  for (const [town, ps] of byTown) {
    if (ps.length < 3) continue;
    // longest parent→child chain born in the same town
    let best: Person[] = [];
    for (const p of ps) {
      const chain = [p]; let cur = p;
      for (;;) { const nx = childrenOf(ix, cur.id).map(by).find((c) => city(c.birthPlace) === town); if (!nx) break; chain.push(nx); cur = nx; }
      if (chain.length > best.length) best = chain;
    }
    if (best.length >= 3) out.push({ id: `town-line-${town}`, icon: '🏡', title: `${best.length} generations born in ${town}`, detail: `${names(best)} — each one born in the same town as their parent.`, people: best.map((p) => p.id), weight: 9 + best.length });
    else out.push({ id: `town-${town}`, icon: '📍', title: `${ps.length} relatives were born in ${town}`, detail: `${names(ps.slice(0, 6))}${ps.length > 6 ? ` and ${ps.length - 6} more` : ''}.`, people: ps.map((p) => p.id), weight: 2 + ps.length / 2 });
  }
  const movers = people.filter((p) => p.events.some((e) => e.type === 'migration'));
  if (movers.length >= 2) {
    const firstMove = movers.flatMap((p) => p.events.filter((e) => e.type === 'migration').map((e) => ({ p, e }))).sort((a, b) => a.e.year - b.e.year)[0];
    const lands = new Set(movers.flatMap((p) => p.events.filter((e) => e.type === 'migration').map((e) => countryOf(e.toPlace))).filter(Boolean));
    out.push({ id: 'movers', icon: '✈️', title: `${movers.length} relatives packed up and moved`, detail: `The first was ${fullName(firstMove.p)} in ${firstMove.e.year} (${city(firstMove.e.place)} → ${city(firstMove.e.toPlace)}). Between them they settled in ${lands.size} countr${lands.size === 1 ? 'y' : 'ies'}.`, people: movers.map((p) => p.id), weight: 6 });
  }

  // 5. Long lives and long lines
  const dead = people.filter((p) => !isLiving(p) && !isNaN(age(p)) && !isNaN(deathYear(p)));
  const over90 = people.filter((p) => !isNaN(age(p)) && age(p) >= 90 && (!isLiving(p) || age(p) >= 90));
  if (over90.length >= 1) out.push({ id: 'nonagenarians', icon: '🌳', title: over90.length === 1 ? `${over90[0].given} reached ${age(over90[0])}` : `${over90.length} relatives reached 90`, detail: `${over90.map((p) => `${p.given} (${age(p)})`).join(', ')}. Longevity may run in the family.`, people: over90.map((p) => p.id), weight: 5 + over90.length });
  if (dead.length >= 6) {
    const decade = (y: number) => Math.floor(y / 50) * 50;
    const groups = new Map<number, number[]>();
    for (const p of dead) groups.set(decade(birthYear(p)), [...(groups.get(decade(birthYear(p))) ?? []), age(p)]);
    const rows = [...groups.entries()].filter(([, a]) => a.length >= 2).sort((a, b) => a[0] - b[0]);
    if (rows.length >= 2) {
      const avg = (a: number[]) => Math.round(a.reduce((s, x) => s + x, 0) / a.length);
      const first = rows[0], last = rows[rows.length - 1];
      out.push({ id: 'lifespan-trend', icon: '📈', title: `Lives grew ${avg(last[1]) - avg(first[1]) >= 0 ? 'longer' : 'shorter'} over time`, detail: `Relatives born ${first[0]}–${first[0] + 49} lived ${avg(first[1])} years on average; those born ${last[0]}–${last[0] + 49}, ${avg(last[1])} years.`, people: [], weight: 4 });
    }
  }

  // 6. Age at becoming a parent, then and now
  const parentAges: { y: number; a: number }[] = [];
  for (const p of people) for (const c of childrenOf(ix, p.id)) { const a = birthYear(by(c)) - birthYear(p); if (!isNaN(a) && a > 10 && a < 70) parentAges.push({ y: birthYear(by(c)), a }); }
  if (parentAges.length >= 8) {
    parentAges.sort((a, b) => a.y - b.y);
    const half = Math.floor(parentAges.length / 3);
    const avg = (xs: typeof parentAges) => Math.round(xs.reduce((s, x) => s + x.a, 0) / xs.length);
    const early = parentAges.slice(0, half), late = parentAges.slice(-half);
    out.push({ id: 'parent-age', icon: '👶', title: `Parents used to be ${Math.abs(avg(late) - avg(early))} years ${avg(late) >= avg(early) ? 'younger' : 'older'}`, detail: `Children born before ${early.at(-1)!.y} arrived when their parents were ${avg(early)} on average; since ${late[0].y}, at ${avg(late)}.`, people: [], weight: 3 });
  }

  // 7. Spouses who were already related (one card)
  const seen = new Set<string>();
  const kin: { a: Person; b: Person; t: string }[] = [];
  for (const p of people) for (const sp of p.spouseIds) {
    const k = [p.id, sp].sort().join('+'); if (seen.has(k) || !ix.byId.has(sp)) continue; seen.add(k);
    const t = bloodTerm(ix, p.id, sp);
    if (t && t !== 'self') kin.push({ a: p, b: by(sp), t });
  }
  if (kin.length) out.push({ id: 'kin-marriages', icon: '💞', title: kin.length === 1 ? `${kin[0].a.given} married a relative` : `${kin.length} couples were already related`, detail: kin.slice(0, 4).map((k) => `${k.b.given} was ${k.a.given}’s ${k.t}`).join('; ') + (kin.length > 4 ? `; and ${kin.length - 4} more` : '') + '.', people: kin.flatMap((k) => [k.a.id, k.b.id]), weight: 7 });

  // 8. Big families
  const big = people.map((p) => ({ p, n: childrenOf(ix, p.id).length })).filter((x) => x.n >= 4).sort((a, b) => b.n - a.n)[0];
  if (big) out.push({ id: `big-${big.p.id}`, icon: '👨‍👩‍👧‍👦', title: `${big.p.given} had ${big.n} children`, detail: `The largest family in the tree: ${names(childrenOf(ix, big.p.id).map(by))}.`, people: [big.p.id, ...childrenOf(ix, big.p.id)], weight: 3 + big.n / 2 });

  // dedupe by id and rank
  const uniq = new Map(out.map((e) => [e.id, e]));
  return [...uniq.values()].sort((a, b) => b.weight - a.weight);
}
