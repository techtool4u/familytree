import type { Person } from '../types';
import type { Index } from './graph';
import { findPath, birthYear, deathYear, isLiving, childrenOf, parentsOf } from './graph';
import { firstSentences } from './daily';

const city = (s?: string) => (s ? s.split(',')[0].trim() : '');

/**
 * The route for "Play the journey": from `from` (or, by default, the earliest known
 * direct ancestor of `to`) down the generations to `to`.
 */
export function journeyRoute(ix: Index, to: string, from?: string): string[] {
  // walk up through parents only, remembering which child led to each ancestor
  const down = new Map<string, string | null>([[to, null]]);
  const depth = new Map<string, number>([[to, 0]]);
  const q = [to];
  while (q.length) {
    const cur = q.shift()!;
    for (const par of parentsOf(ix, cur)) if (!down.has(par)) { down.set(par, cur); depth.set(par, depth.get(cur)! + 1); q.push(par); }
  }
  const chainFrom = (start: string) => { const r: string[] = []; for (let c: string | null = start; c; c = down.get(c) ?? null) r.push(c); return r; };
  if (from && from !== to) return down.has(from) ? chainFrom(from) : findPath(ix, from, to) ?? [to];
  const rich = (id: string) => { const p = ix.byId.get(id)!; return (p.bio ? 2 : 0) + p.events.length; };
  let best = to;
  for (const [id, d] of depth) if (d > depth.get(best)! || (d === depth.get(best)! && rich(id) > rich(best))) best = id;
  return chainFrom(best);
}

/** One or two sentences that introduce a person during the journey. */
export function narrate(p: Person, ix: Index): string {
  const bits: string[] = [];
  const by = birthYear(p);
  if (!isNaN(by)) bits.push(`Born ${by}${p.birthPlace ? ` in ${city(p.birthPlace)}` : ''}.`);
  else if (p.birthPlace) bits.push(`Born in ${city(p.birthPlace)}.`);
  if (p.bio) bits.push(firstSentences(p.bio, 1));
  else {
    if (p.occupation) bits.push(`${p.occupation}.`);
    const ev = p.events.filter((e) => e.type !== 'birth' && e.type !== 'death').slice(0, 2);
    for (const e of ev) bits.push(`${e.year}: ${e.title}${e.toPlace ? '' : e.place ? ` (${city(e.place)})` : ''}.`);
  }
  const kids = childrenOf(ix, p.id).length;
  if (!p.bio && kids) bits.push(`${kids} child${kids === 1 ? '' : 'ren'}.`);
  if (!isLiving(p) && !isNaN(deathYear(p))) bits.push(`Died ${deathYear(p)}${p.deathPlace && city(p.deathPlace) !== city(p.birthPlace) ? ` in ${city(p.deathPlace)}` : ''}.`);
  return bits.join(' ');
}
