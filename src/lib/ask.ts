import type { Person } from '../types';
import type { Index } from './graph';
import { relationship, isLiving, birthYear, age, fullName, findPath, ancestorsOf, descendantsOf } from './graph';
import { countryOf } from '../data/places';

/** The answer to a plain-English question about the tree. */
export interface Answer {
  ids: string[];
  label: string;
  path?: string[]; // set when the question was "how is A related to B"
  understood: boolean;
}

const RELS: [RegExp, RegExp][] = [
  // [words the user types, relationship terms that count]
  [/^(parents?|mum|mom|mother|dad|father)s?$/, /^(father|mother|parent)$/],
  [/^(mothers?|moms?|mums?)$/, /^mother$/],
  [/^(fathers?|dads?)$/, /^father$/],
  [/^(children|kids?|child)$/, /^(son|daughter|child)$/],
  [/^sons?$/, /^son$/],
  [/^daughters?$/, /^daughter$/],
  [/^(siblings?|brothers? and sisters?)$/, /(brother|sister|sibling)$/],
  [/^brothers?$/, /brother$/],
  [/^sisters?$/, /sister$/],
  [/^grandparents?$/, /^(grandfather|grandmother|grandparent)$/],
  [/^grand(children|kids?|child)$/, /^(grandson|granddaughter|grandchild)$/],
  [/^great[- ]?grandparents?$/, /great-grandfather|great-grandmother|great-grandparent/],
  [/^(aunts? and uncles?|uncles? and aunts?)$/, /^(uncle|aunt)( \(by marriage\))?$/],
  [/^aunts?$/, /^aunt( \(by marriage\))?$/],
  [/^uncles?$/, /^uncle( \(by marriage\))?$/],
  [/^great[- ]?(aunts?|uncles?)$/, /(grand-uncle|grand-aunt)/],
  [/^(nieces? and nephews?|nephews? and nieces?)$/, /^(niece|nephew)$/],
  [/^nieces?$/, /^niece$/],
  [/^nephews?$/, /^nephew$/],
  [/^(first |1st )?cousins?$/, /^1st cousin$/],
  [/^(second |2nd )cousins?$/, /^2nd cousin$/],
  [/^(all )?cousins?$/, /cousin/],
  [/^(spouses?|wife|husband|partners?)$/, /^(husband|wife|spouse)$/],
  [/^in[- ]?laws?$/, /-in-law|spouse’s/],
  [/^(step ?(parents?|mothers?|fathers?))$/, /^step/],
];

const strip = (s: string) => s.toLowerCase().replace(/[’']s\b/g, '').replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();

export const EXAMPLES = ['my cousins', 'Lily’s grandchildren', 'born in Naples', 'living women', 'how is Maya related to Sofia', 'born before 1900', 'nurses', 'immigrants', 'oldest'];

/** Find a person by (part of) their name. Prefers exact first-name matches, then the focus person’s closest relatives. */
function findPerson(people: Person[], ix: Index, text: string, focusId: string, minScore = 1): Person | undefined {
  const t = strip(text);
  if (!t) return undefined;
  if (/^(me|my|i|myself)$/.test(t)) return ix.byId.get(focusId);
  const scored = people.map((p) => {
    const full = strip(fullName(p) + ' ' + (p.birthSurname ?? ''));
    const first = strip(p.given.split(/[\s(]/)[0]);
    let s = 0;
    if (full === t) s = 100; else if (strip(`${p.given} ${p.surname}`) === t) s = 95; else if (first === t) s = 80;
    else if (full.startsWith(t)) s = 60; else if (full.split(' ').includes(t)) s = 50; else if (full.includes(t)) s = 30;
    return { p, s };
  }).filter((x) => x.s >= minScore);
  if (!scored.length) return undefined;
  const near = ancestorsOf(ix, focusId), down = descendantsOf(ix, focusId);
  scored.sort((a, b) => b.s - a.s || Number(near.has(b.p.id) || down.has(b.p.id)) - Number(near.has(a.p.id) || down.has(a.p.id)));
  return scored[0].p;
}

/** Turn a question like “Maya’s cousins”, “born in Naples” or “how is Ava related to Leo” into a set of people. */
export function ask(question: string, people: Person[], ix: Index, focusId: string): Answer {
  const raw = question.trim();
  const q = raw.toLowerCase().replace(/[?!.]+$/, '').trim();
  if (!q) return { ids: [], label: '', understood: false };

  // "how is A related to B" / "A and B" / "connection between A and B"
  const rel = q.match(/^(?:how (?:is|are|am) |what is the (?:relation(?:ship)?|connection) between )?(.+?) (?:related to|and) (.+)$/);
  if (rel) {
    const loose = q.startsWith('how') || q.includes('related') || q.startsWith('what is');
    const A = findPerson(people, ix, rel[1].replace(/^(is|are) /, ''), focusId, loose ? 1 : 50), B = findPerson(people, ix, rel[2], focusId, loose ? 1 : 50);
    if (A && B && A.id !== B.id) {
      const path = findPath(ix, A.id, B.id);
      const term = relationship(ix, A.id, B.id);
      return { ids: path ?? [A.id, B.id], path: path ?? undefined, label: `${B.given} is ${A.given}’s ${term}`, understood: true };
    }
  }

  // split on "and"/"," into clauses that are intersected; "who are", "show me" etc. are dropped
  const clean = q.replace(/^(who (?:are|is|was|were)|show( me)?|find|list|all( the)?|the)\s+/g, '').replace(/^(the|all)\s+/, '');
  const clauses = clean.split(/\s*(?:,|\band\b(?! (?:sisters?|uncles?|aunts?|nephews?|nieces?)))\s*/).filter(Boolean);
  let set: Set<string> | null = null;
  const labels: string[] = [];
  let understood = true;
  const keep = (ids: Iterable<string>, label: string) => { const s = new Set(ids); set = set ? new Set([...set].filter((x) => s.has(x))) : s; labels.push(label); };

  for (const c of clauses) {
    let m: RegExpMatchArray | null;
    // "<name>'s <relation>", "<relation> of <name>", "my <relation>"
    const poss = c.match(/^(.+?)(?:[’']s| s)\s+(.+)$/) ?? (c.match(/^(my)\s+(.+)$/));
    const ofm = c.match(/^(.+?)\s+of\s+(.+)$/);
    const pair = poss ? [poss[1], poss[2]] : ofm ? [ofm[2], ofm[1]] : null;
    if (pair) {
      const who = findPerson(people, ix, pair[0], focusId);
      const word = strip(pair[1]);
      const relSpec = RELS.find(([w]) => w.test(word));
      if (who && (relSpec || /^(ancestors?|descendants?|family|relatives)$/.test(word))) {
        let ids: string[];
        if (/^ancestors?$/.test(word)) ids = [...ancestorsOf(ix, who.id).keys()].filter((x) => x !== who.id);
        else if (/^descendants?$/.test(word)) ids = [...descendantsOf(ix, who.id).keys()].filter((x) => x !== who.id);
        else if (/^(family|relatives)$/.test(word)) ids = people.filter((p) => p.id !== who.id && !/not connected/.test(relationship(ix, who.id, p.id))).map((p) => p.id);
        else ids = people.filter((p) => p.id !== who.id && relSpec![1].test(relationship(ix, who.id, p.id))).map((p) => p.id);
        keep(ids, `${who.id === focusId && /^my$/.test(pair[0]) ? 'Your' : `${who.given}’s`} ${pair[1]}`);
        continue;
      }
    }
    if ((m = c.match(/^(?:born |living |lived |from |who live[sd]? )?in (?:the )?(\d{3})0s$/))) { const d = +m[1] * 10; keep(people.filter((p) => birthYear(p) >= d && birthYear(p) < d + 10).map((p) => p.id), `born in the ${d}s`); continue; }
    if ((m = c.match(/^born (before|after|in) (\d{3,4})$/))) {
      const y = +m[2]; const op = m[1];
      keep(people.filter((p) => !isNaN(birthYear(p)) && (op === 'before' ? birthYear(p) < y : op === 'after' ? birthYear(p) > y : birthYear(p) === y)).map((p) => p.id), `born ${op} ${y}`); continue;
    }
    if ((m = c.match(/^(born|died|living|lives|lived|from|who live[sd]?) in (.+)$/)) || (m = c.match(/^(from) (.+)$/))) {
      const where = strip(m[2]);
      const hit = (pl?: string) => !!pl && (strip(pl).includes(where) || strip(countryOf(pl) ?? '') === where);
      const kind = m[1];
      const place = m[2].replace(/\b\w/g, (ch) => ch.toUpperCase());
      keep(people.filter((p) => kind === 'born' ? hit(p.birthPlace) : kind === 'died' ? hit(p.deathPlace)
        : kind === 'from' ? hit(p.birthPlace) || strip(countryOf(p.birthPlace) ?? '').includes(where)
        : hit(p.residence) || p.events.some((e) => (e.type === 'migration' && hit(e.toPlace)) || (e.type === 'residence' && hit(e.place))) || hit(p.birthPlace)).map((p) => p.id), kind === 'from' ? `from ${place}` : `${kind} in ${place}`);
      continue;
    }
    if (/^(living|alive|still alive)( people| relatives)?$/.test(c)) { keep(people.filter(isLiving).map((p) => p.id), 'living'); continue; }
    if (/^(deceased|dead|passed away|ancestors who died)$/.test(c)) { keep(people.filter((p) => !isLiving(p)).map((p) => p.id), 'deceased'); continue; }
    if ((m = c.match(/^(living |deceased )?(women|woman|females?|girls?|ladies|men|man|males?|boys?)$/))) {
      const f = /wom|fem|girl|lad/.test(m[2]);
      keep(people.filter((p) => p.gender === (f ? 'F' : 'M') && (!m![1] || (m![1].trim() === 'living') === isLiving(p))).map((p) => p.id), `${m[1] ?? ''}${f ? 'women' : 'men'}`.trim()); continue;
    }
    if (/^(immigrants?|emigrants?|movers|people who moved|who moved|migrants?)$/.test(c)) { keep(people.filter((p) => p.events.some((e) => e.type === 'migration') || p.tags.includes('Immigrant')).map((p) => p.id), 'moved countries or cities'); continue; }
    if (/^(veterans?|soldiers?|military|served)$/.test(c)) { keep(people.filter((p) => p.tags.includes('Military') || p.events.some((e) => e.type === 'military')).map((p) => p.id), 'served in the military'); continue; }
    if (/^(with )?(photos?|pictures?)$/.test(c)) { keep(people.filter((p) => p.photo || p.media.some((m2) => m2.kind === 'photo')).map((p) => p.id), 'with photos'); continue; }
    if (/^(with )?(stories|voices?|recordings?)$/.test(c)) { keep(people.filter((p) => p.media.some((m2) => m2.questionId || m2.kind === 'audio')).map((p) => p.id), 'with recorded stories'); continue; }
    if ((m = c.match(/^(oldest|youngest|longest lived)( (?:person|relative|ancestor|living))?$/))) {
      const cur = set as Set<string> | null;
      const pool: Person[] = (cur ? people.filter((p) => cur.has(p.id)) : people).filter((p) => !isNaN(birthYear(p)) && (m![2]?.includes('living') ? isLiving(p) : true));
      const sorted: Person[] = m[1] === 'longest lived' ? pool.filter((p) => !isLiving(p)).sort((a, b) => age(b) - age(a)) : pool.sort((a, b) => birthYear(a) - birthYear(b));
      const pick: Person | undefined = m[1] === 'youngest' ? sorted.at(-1) : sorted[0];
      set = new Set(pick ? [pick.id] : []); labels.push(`${m[1]}${m[2] ?? ''}`); continue;
    }
    if ((m = c.match(/^(?:named|called) (.+)$/))) { const n = strip(m[1]); keep(people.filter((p) => strip(fullName(p) + ' ' + (p.birthSurname ?? '')).split(' ').includes(n)).map((p) => p.id), `named ${m[1]}`); continue; }
    if ((m = c.match(/^tagged (.+)$/))) { const tg = strip(m[1]); keep(people.filter((p) => p.tags.some((x) => strip(x) === tg)).map((p) => p.id), `tagged ${m[1]}`); continue; }
    // occupations ("nurses", "teachers") and surnames ("the Rossis")
    const sing = strip(c).replace(/(ies)$/, 'y').replace(/(men)$/, 'man').replace(/s$/, '');
    const byJob = people.filter((p) => p.occupation && strip(p.occupation).includes(sing));
    if (byJob.length && sing.length >= 3) { keep(byJob.map((p) => p.id), c); continue; }
    const bySurname = people.filter((p) => [p.surname, p.birthSurname].some((s) => s && strip(s) === sing));
    if (bySurname.length) { keep(bySurname.map((p) => p.id), `the ${bySurname[0].birthSurname && strip(bySurname[0].birthSurname) === sing ? bySurname[0].birthSurname : bySurname[0].surname} family`); continue; }
    const tagHit = people.filter((p) => p.tags.some((x) => strip(x) === strip(c) || strip(x) === sing));
    if (tagHit.length) { keep(tagHit.map((p) => p.id), c); continue; }
    const one = findPerson(people, ix, c, focusId);
    if (one && clauses.length === 1) { keep([one.id], fullName(one)); continue; }
    understood = false;
  }
  const ids: string[] = set ? [...(set as Set<string>)] : [];
  return { ids, label: labels.join(' · '), understood: understood && labels.length > 0 };
}
