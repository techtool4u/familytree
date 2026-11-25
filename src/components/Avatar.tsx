import type { Person } from '../types';
import { inkOn } from '../lib/graph';

export function initials(p: Person) {
  return ((p.given[0] ?? '') + (p.surname[0] ?? '')).toUpperCase() || '?';
}

export function Avatar({ p, color, size = 40, ring }: { p: Person; color: string; size?: number; ring?: boolean }) {
  return (
    <div
      className="avatar"
      style={{ width: size, height: size, fontSize: size * 0.38, background: p.photo ? `center/cover url(${p.photo})` : color, color: inkOn(color), boxShadow: ring ? `0 0 0 3px var(--surface), 0 0 0 5px ${color}` : undefined }}
      aria-hidden
    >
      {!p.photo && initials(p)}
    </div>
  );
}
