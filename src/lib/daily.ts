import type { Person, LifeEvent } from '../types';
import type { Index } from './graph';
import { birthYear, deathYear, isLiving, fullName, childrenOf, lifeSpan } from './graph';

const city = (place?: string) => (place ? place.split(',')[0].trim() : '');
const mmdd = (iso?: string) => (iso && iso.length >= 10 ? iso.slice(5, 10) : '');
const hasDay = (iso?: string) => !!iso && /^\d{4}-\d{2}-\d{2}$/.test(iso);
const pad = (n: number) => String(n).padStart(2, '0');
export const dayKey = (d: Date) => `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const dayIndex = (d: Date) => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5);

/** Turn an event title into a sentence about the person. */
const VERB = /^(married|sailed|left|moved|crossed|arrived|opened|joined|bought|graduated|served|began|returned|relocated|emigrated|founded|shipped|conscripted|started|won|built|became|retired|learned)\b/i;
export function phrase(p: Person, e: LifeEvent) {
  const name = p.given;
  if (VERB.test(e.title)) return `${name} ${e.title[0].toLowerCase()}${e.title.slice(1)}`;
  if (e.type === 'education') return `${name} completed: ${e.title}`;
  if (e.type === 'career') return `${name} started a new chapter: ${e.title}`;
  if (e.type === 'military') return `${name}: ${e.title}`;
  return `${name}: ${e.title}`;
}

export interface DayItem { p: Person; kind: 'birth' | 'death'; years: number; date: string; living: boolean }

/** Births and deaths that happened on this calendar day in earlier years. */
export function onThisDay(people: Person[], d: Date, offsetDays = 0): DayItem[] {
  const t = new Date(d); t.setDate(t.getDate() + offsetDays);
  const key = dayKey(t), y = t.getFullYear();
  const out: DayItem[] = [];
  for (const p of people) {
    if (hasDay(p.birthDate) && mmdd(p.birthDate) === key) out.push({ p, kind: 'birth', years: y - birthYear(p), date: p.birthDate!, living: isLiving(p) });
    if (hasDay(p.deathDate) && mmdd(p.deathDate) === key) out.push({ p, kind: 'death', years: y - deathYear(p), date: p.deathDate!, living: false });
  }
  return out.sort((a, b) => a.years - b.years);
}

export function upcoming(people: Person[], d: Date, days: number) {
  const out: (DayItem & { inDays: number })[] = [];
  for (let i = 1; i <= days; i++) for (const it of onThisDay(people, d, i)) out.push({ ...it, inDays: i });
  return out;
}

export function remembranceThisMonth(people: Person[], d: Date) {
  const m = pad(d.getMonth() + 1);
  return people
    .filter((p) => hasDay(p.deathDate) && p.deathDate!.slice(5, 7) === m)
    .map((p) => ({ p, day: +p.deathDate!.slice(8, 10), years: d.getFullYear() - deathYear(p) }))
    .sort((a, b) => a.day - b.day);
}

export interface Story { p: Person; text: string; year?: number; place?: string; toPlace?: string; yearsAgo?: number; type: string }

/** One deterministic story per calendar day, so everyone in the family sees the same one. */
export function storyOfDay(people: Person[], d: Date, shift = 0): Story | null {
  const events: Story[] = [];
  for (const p of people) for (const e of p.events) {
    if (e.type === 'birth' || e.type === 'death') continue;
    events.push({ p, text: phrase(p, e), year: e.year, place: e.place, toPlace: e.toPlace, yearsAgo: d.getFullYear() - e.year, type: e.type });
  }
  const bios: Story[] = people.filter((p) => p.bio && firstSentences(p.bio).length > 40).map((p) => ({ p, text: firstSentences(p.bio!), type: 'bio' }));
  const pool = events.length >= 3 ? events.concat(bios) : bios.length ? bios : events;
  if (!pool.length) return null;
  const i = ((dayIndex(d) + shift) * 2654435761) >>> 0;
  return pool[i % pool.length];
}

export function firstSentences(text: string, n = 2) {
  const clean = text.split('\n\nSources:')[0].replace(/\s+/g, ' ').trim();
  const parts = clean.split(/(?<=[.!?])\s+(?=[A-Z“"(])/);
  return parts.slice(0, n).join(' ').trim();
}

export interface AgeMoment { p: Person; year: number; text: string; exact: boolean }

/** What relatives were doing at a given age. */
export function atAge(people: Person[], ix: Index, ageYears: number, excludeId?: string): AgeMoment[] {
  const out: AgeMoment[] = [];
  for (const p of people) {
    if (p.id === excludeId) continue;
    const b = birthYear(p);
    if (isNaN(b)) continue;
    for (const e of p.events) {
      if (e.type === 'birth' || e.type === 'death') continue;
      const a = e.year - b;
      if (Math.abs(a - ageYears) <= 1) out.push({ p, year: e.year, text: phrase(p, e) + (e.toPlace ? '' : e.place ? ` (${city(e.place)})` : ''), exact: a === ageYears });
    }
    for (const c of childrenOf(ix, p.id)) {
      const C = ix.byId.get(c)!; const a = birthYear(C) - b;
      if (Math.abs(a - ageYears) <= 1) out.push({ p, year: birthYear(C), text: `${p.given} welcomed a baby, ${C.given}`, exact: a === ageYears });
    }
  }
  // exact matches first, then older generations first (they make the best stories)
  const baby = (m: AgeMoment) => Number(m.text.includes('welcomed a baby'));
  out.sort((x, y) => baby(x) - baby(y) || Number(y.exact) - Number(x.exact) || x.year - y.year);
  const per = new Map<string, number>();
  return out.filter((m) => { const n = per.get(m.p.id) ?? 0; per.set(m.p.id, n + 1); return n < 1; }).slice(0, 8);
}

/** A yearly calendar of family birthdays and remembrance days (.ics) people can subscribe to in any calendar app. */
export function toICS(people: Person[]) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Kindred//Family Tree//EN', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Family birthdays & remembrance'];
  const esc = (s: string) => s.replace(/[\\,;]/g, (m) => '\\' + m).replace(/\n/g, '\\n');
  const add = (uid: string, date: string, summary: string, desc: string) => {
    const ymd = date.replace(/-/g, '');
    lines.push('BEGIN:VEVENT', `UID:${uid}@kindred`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`, `DTSTART;VALUE=DATE:${ymd}`, 'RRULE:FREQ=YEARLY', `SUMMARY:${esc(summary)}`, `DESCRIPTION:${esc(desc)}`, 'TRANSP:TRANSPARENT', 'END:VEVENT');
  };
  for (const p of people) {
    if (hasDay(p.birthDate)) add(`b-${p.id}`, p.birthDate!, isLiving(p) ? `🎂 ${fullName(p)}’s birthday` : `🌱 ${fullName(p)} was born on this day`, `${fullName(p)} (${lifeSpan(p)})${p.birthPlace ? ' · born in ' + p.birthPlace : ''}`);
    if (hasDay(p.deathDate)) add(`d-${p.id}`, p.deathDate!, `🕯️ Remembering ${fullName(p)}`, `${fullName(p)} (${lifeSpan(p)})`);
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
