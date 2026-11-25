import type { Person } from '../types';
import type { Index } from './graph';
import { childrenOf, parentsOf, isLiving } from './graph';

export interface Question { id: string; text: string; personal: boolean }

const city = (place?: string) => (place ? place.split(',')[0].trim() : '');

export const GENERIC: [string, string][] = [
  ['g-home', 'What was the house you grew up in like? Walk me through it room by room.'],
  ['g-food', 'What dish from your childhood can you still taste? Who made it?'],
  ['g-festival', 'How did your family celebrate festivals and holidays when you were young?'],
  ['g-grandparents', 'What do you remember about your own grandparents?'],
  ['g-advice', 'What is the best advice anyone ever gave you?'],
  ['g-proud', 'What are you most proud of in your life?'],
  ['g-hard', 'What was the hardest time you lived through, and how did you get through it?'],
  ['g-recipe', 'Is there a family recipe we should never lose? How is it made?'],
  ['g-song', 'Which songs or lullabies did your parents sing to you?'],
  ['g-firstjob', 'What was your very first job, and what did you do with your first pay?'],
  ['g-teacher', 'Which teacher or mentor changed your life?'],
  ['g-prices', 'What did things cost when you were young — a bus ride, a cinema ticket, a loaf of bread?'],
  ['g-change', 'What is the biggest change you have seen in the world during your life?'],
  ['g-remember', 'What do you hope your great-grandchildren will know about you?'],
  ['g-saying', 'Was there a saying or phrase your family always used? What did it mean?'],
  ['g-mischief', 'What is the most mischievous thing you did as a child?'],
  ['g-origins', 'What do you know about where our family lived before that — and who told you?'],
  ['g-heirloom', 'Is there an object in the family with a story behind it?'],
  ['g-firsttech', 'Do you remember the first time you saw a television, a telephone or an airplane?'],
  ['g-place', 'Where is your favourite place in the world, and why?'],
  ['g-laugh', 'What is the funniest thing that ever happened at a family gathering?'],
  ['g-letter', 'If you could say one thing to a family member born 100 years from now, what would it be?'],
  ['g-friends', 'Who was your best friend growing up? What did you do together?'],
  ['g-love', 'How did you know you were in love for the first time?'],
];

/** Questions tailored to this person's own story first, then good general prompts. */
export function questionsFor(p: Person, ix: Index): Question[] {
  const out: Question[] = [];
  const add = (id: string, text: string) => out.push({ id, text, personal: true });
  for (const e of p.events) {
    if (e.type === 'migration') {
      add(`mig-${e.id}`, `What do you remember about the day you left ${city(e.place) || 'home'} for ${city(e.toPlace) || 'a new country'} in ${e.year}?`);
      add(`arr-${e.id}`, `What surprised you most when you first arrived in ${city(e.toPlace) || 'your new home'}?`);
    }
    if (e.type === 'military') add(`mil-${e.id}`, `What do you remember from this part of your life: “${e.title}” (${e.year})?`);
    if (e.type === 'education') add(`edu-${e.id}`, `Tell me about ${e.title.replace(/^[A-Z]/, (c) => c.toLowerCase())} (${e.year}). What was that time like?`);
    if (e.type === 'career') add(`car-${e.id}`, `How did it come about: “${e.title}” in ${e.year}? Who helped you?`);
  }
  for (const s of p.spouseIds) {
    const S = ix.byId.get(s); if (!S) continue;
    const m = p.events.find((e) => e.type === 'marriage' && e.title.includes(S.given));
    add(`met-${s}`, `How did you and ${S.given} meet? What was your first impression?`);
    if (m) add(`wed-${s}`, `What do you remember about your wedding day in ${m.year}${m.place ? ` in ${city(m.place)}` : ''}?`);
  }
  if (p.occupation) add('job', `How did you become a ${p.occupation.toLowerCase()}? What was an ordinary working day like?`);
  if (p.birthPlace) add('street', `Describe the street you grew up on in ${city(p.birthPlace)}. What did it sound and smell like?`);
  for (const c of childrenOf(ix, p.id)) { const C = ix.byId.get(c)!; add(`kid-${c}`, `What was ${C.given} like as a little child? Tell me one story.`); }
  for (const par of parentsOf(ix, p.id)) {
    const P = ix.byId.get(par)!;
    if (!isLiving(P)) add(`par-${par}`, `What do you remember most about your ${P.gender === 'F' ? 'mother' : P.gender === 'M' ? 'father' : 'parent'}, ${P.given}?`);
  }
  return [...out, ...GENERIC.map(([id, text]) => ({ id, text, personal: false }))];
}

export function isoWeek(d: Date) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return t.getUTCFullYear() * 100 + Math.ceil(((+t - +y0) / 864e5 + 1) / 7);
}
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/** This week's question for a person: personal questions first, never repeating one already answered or sent. */
export function weeklyQuestion(p: Person, ix: Index, asked: string[], week: number, shuffle = 0): Question | null {
  const answered = new Set(p.media.map((m) => m.questionId).filter(Boolean));
  const all = questionsFor(p, ix).filter((q) => !answered.has(q.id) && !asked.includes(q.id));
  if (!all.length) return null;
  const personal = all.filter((q) => q.personal);
  const pool = shuffle === 0 && personal.length ? personal : all;
  return pool[(week + shuffle + hash(p.id)) % pool.length];
}

export function shareText(p: Person, q: Question, from?: string) {
  return `Hi ${p.given}! 🌳 ${from ? `It's ${from} — ` : ''}I'm putting together our family story and I'd love to hear from you.\n\nThis week's question:\n“${q.text}”\n\nYou can just reply with a voice note — I'll save it in our family tree so the grandkids can hear it one day. ❤️`;
}
