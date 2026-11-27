import type { Person, Gender } from '../types';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function parseDate(s?: string): string | undefined {
  if (!s) return undefined;
  const m = s.toUpperCase().match(/(?:(\d{1,2})\s+)?(?:([A-Z]{3})\s+)?(\d{4})/);
  if (!m) return undefined;
  const [, d, mon, y] = m;
  const mi = mon ? MONTHS.indexOf(mon) : -1;
  if (mi >= 0 && d) return `${y}-${String(mi + 1).padStart(2, '0')}-${d.padStart(2, '0')}`;
  return y;
}
function fmtDate(s?: string) {
  if (!s) return '';
  const [y, m, d] = s.split('-');
  return [d ? +d : '', m ? MONTHS[+m - 1] : '', y].filter(Boolean).join(' ');
}

/** Minimal GEDCOM 5.5 importer: INDI (NAME, SEX, BIRT, DEAT, OCCU, NOTE) and FAM (HUSB, WIFE, CHIL, MARR). */
export function parseGedcom(text: string): Person[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const people = new Map<string, Person>();
  const fams: { husb?: string; wife?: string; chil: string[]; marr?: string; marrPlace?: string }[] = [];
  let cur: Person | null = null; let fam: (typeof fams)[number] | null = null; let ctx = '';
  for (const line of lines) {
    const m = line.match(/^(\d+)\s+(@[^@]+@\s+)?(\S+)\s?(.*)$/);
    if (!m) continue;
    const level = +m[1]; const xref = m[2]?.trim(); const tag = m[3]; const val = m[4];
    if (level === 0) {
      cur = null; fam = null; ctx = '';
      if (tag === 'INDI' && xref) { cur = { id: xref.replace(/@/g, ''), given: '', surname: '', gender: 'U', spouseIds: [], tags: [], events: [], media: [] }; people.set(cur.id, cur); }
      if (tag === 'FAM') { fam = { chil: [] }; fams.push(fam); }
      continue;
    }
    if (cur) {
      if (level === 1) ctx = tag;
      if (tag === 'NAME' && level === 1) { const nm = val.match(/^(.*?)\/(.*?)\//); cur.given = (nm ? nm[1] : val).trim(); cur.surname = (nm ? nm[2] : '').trim(); }
      else if (tag === 'GIVN' && !cur.given) cur.given = val;
      else if (tag === 'SURN' && !cur.surname) cur.surname = val;
      else if (tag === 'SEX') cur.gender = (val[0] === 'M' ? 'M' : val[0] === 'F' ? 'F' : 'U') as Gender;
      else if (tag === 'OCCU') cur.occupation = val;
      else if (tag === 'NOTE') cur.bio = (cur.bio ? cur.bio + ' ' : '') + val;
      else if ((tag === 'CONC' || tag === 'CONT') && ctx === 'NOTE') cur.bio = (cur.bio ?? '') + (tag === 'CONT' ? '\n' : '') + val;
      else if (tag === 'DATE' && ctx === 'BIRT') cur.birthDate = parseDate(val);
      else if (tag === 'PLAC' && ctx === 'BIRT') cur.birthPlace = val;
      else if (tag === 'DATE' && ctx === 'DEAT') cur.deathDate = parseDate(val);
      else if (tag === 'PLAC' && ctx === 'DEAT') cur.deathPlace = val;
    } else if (fam) {
      if (level === 1) ctx = tag;
      const id = val.replace(/@/g, '');
      if (tag === 'HUSB') fam.husb = id; else if (tag === 'WIFE') fam.wife = id; else if (tag === 'CHIL') fam.chil.push(id);
      else if (tag === 'DATE' && ctx === 'MARR') fam.marr = parseDate(val);
      else if (tag === 'PLAC' && ctx === 'MARR') fam.marrPlace = val;
    }
  }
  for (const f of fams) {
    const H = f.husb ? people.get(f.husb) : undefined, W = f.wife ? people.get(f.wife) : undefined;
    if (H && W) {
      H.spouseIds.push(W.id); W.spouseIds.push(H.id);
      const y = f.marr ? +f.marr.slice(0, 4) : NaN;
      if (!isNaN(y)) {
        H.events.push({ id: H.id + '-m-' + W.id, year: y, type: 'marriage', title: `Married ${W.given} ${W.surname}`, place: f.marrPlace });
        W.events.push({ id: W.id + '-m-' + H.id, year: y, type: 'marriage', title: `Married ${H.given} ${H.surname}`, place: f.marrPlace });
      }
    }
    for (const c of f.chil) { const C = people.get(c); if (C) { if (H) C.fatherId = H.id; if (W) C.motherId = W.id; } }
  }
  for (const p of people.values()) {
    const by = p.birthDate ? +p.birthDate.slice(0, 4) : NaN;
    if (!isNaN(by)) p.events.unshift({ id: p.id + '-b', year: by, type: 'birth', title: 'Born', place: p.birthPlace });
    const dy = p.deathDate ? +p.deathDate.slice(0, 4) : NaN;
    if (!isNaN(dy)) p.events.push({ id: p.id + '-d', year: dy, type: 'death', title: 'Died', place: p.deathPlace });
    p.events.sort((a, b) => a.year - b.year);
  }
  return [...people.values()];
}

export function toGedcom(people: Person[]): string {
  const out = ['0 HEAD', '1 SOUR OurFamilyTree', '1 GEDC', '2 VERS 5.5.1', '1 CHAR UTF-8'];
  const famKey = new Map<string, { id: string; h?: string; w?: string; c: string[] }>();
  const keyFor = (a?: string, b?: string) => `${a ?? ''}|${b ?? ''}`;
  let fi = 1;
  const getFam = (h?: string, w?: string) => {
    const k = keyFor(h, w);
    if (!famKey.has(k)) famKey.set(k, { id: `F${fi++}`, h, w, c: [] });
    return famKey.get(k)!;
  };
  const byId = new Map(people.map((p) => [p.id, p]));
  for (const p of people) {
    for (const s of p.spouseIds) { const S = byId.get(s); if (!S) continue; const [h, w] = p.gender === 'F' ? [s, p.id] : [p.id, s]; getFam(h, w); }
    if (p.fatherId || p.motherId) getFam(p.fatherId, p.motherId).c.push(p.id);
  }
  for (const p of people) {
    out.push(`0 @${p.id}@ INDI`, `1 NAME ${p.given} /${p.surname}/`, `1 SEX ${p.gender}`);
    if (p.birthDate || p.birthPlace) { out.push('1 BIRT'); if (p.birthDate) out.push(`2 DATE ${fmtDate(p.birthDate)}`); if (p.birthPlace) out.push(`2 PLAC ${p.birthPlace}`); }
    if (p.deathDate || p.deathPlace) { out.push('1 DEAT'); if (p.deathDate) out.push(`2 DATE ${fmtDate(p.deathDate)}`); if (p.deathPlace) out.push(`2 PLAC ${p.deathPlace}`); }
    if (p.occupation) out.push(`1 OCCU ${p.occupation}`);
    if (p.bio) out.push(`1 NOTE ${p.bio.replace(/\n/g, ' ')}`);
  }
  for (const f of famKey.values()) {
    out.push(`0 @${f.id}@ FAM`);
    if (f.h) out.push(`1 HUSB @${f.h}@`);
    if (f.w) out.push(`1 WIFE @${f.w}@`);
    f.c.forEach((c) => out.push(`1 CHIL @${c}@`));
  }
  out.push('0 TRLR');
  return out.join('\n');
}
