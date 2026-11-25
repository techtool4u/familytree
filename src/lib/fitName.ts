import type { Person } from '../types';

// Measures text the way the tree cards draw it, so long names are shortened by real width, not letter count.
let ctx: CanvasRenderingContext2D | null = null;
const cache = new Map<string, number>();
const FONT = 'bold 14px Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
export function textWidth(s: string, font = FONT) {
  const key = font + '|' + s;
  const hit = cache.get(key); if (hit !== undefined) return hit;
  if (!ctx) ctx = document.createElement('canvas').getContext('2d');
  let w = s.length * 8.2; // fallback if canvas is unavailable
  if (ctx) { ctx.font = font; w = ctx.measureText(s).width; }
  cache.set(key, w);
  return w;
}

/**
 * The longest form of a name that fits in `maxW` pixels:
 * "Sarat Babu Chevuri" → "Sarat Babu C." → "Sarat B. C." → "Sarat B…"
 */
export function fitName(p: Pick<Person, 'given' | 'surname'>, maxW: number, font = FONT): string {
  const given = p.given.trim().split(/\s+/).filter(Boolean);
  const sur = p.surname.trim();
  const ini = (s: string) => (s ? s[0].toUpperCase() + '.' : '');
  const options = [
    [...given, sur].join(' '),
    given.length && sur ? [...given, ini(sur)].join(' ') : '',
    given.length > 1 ? [given[0], ...given.slice(1).map(ini), ini(sur)].filter(Boolean).join(' ') : '',
    given.length > 1 ? [given[0], ini(sur)].filter(Boolean).join(' ') : '',
  ].map((s) => s.trim()).filter(Boolean);
  for (const o of options) if (textWidth(o, font) <= maxW) return o;
  // still too wide (one very long word): cut it and add an ellipsis
  const base = options[options.length - 1] ?? '';
  let lo = 1, hi = base.length;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (textWidth(base.slice(0, mid) + '…', font) <= maxW) lo = mid; else hi = mid - 1; }
  return base.slice(0, lo).trimEnd() + '…';
}

/** Shorten one line of text to `maxW`: later words become initials first, then it is cut with an ellipsis. */
export function fitText(s: string, maxW: number, font = FONT): string {
  const words = s.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '';
  const tries = [words.join(' '), words.length > 1 ? [words[0], ...words.slice(1).map((w) => w[0].toUpperCase() + '.')].join(' ') : '', words[0]].filter(Boolean);
  for (const t of tries) if (textWidth(t, font) <= maxW) return t;
  const base = words[0];
  let lo = 1, hi = base.length;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (textWidth(base.slice(0, mid) + '…', font) <= maxW) lo = mid; else hi = mid - 1; }
  return base.slice(0, lo) + '…';
}
export const fanFont = (px: number) => `bold ${px}px Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
