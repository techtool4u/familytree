import { useState } from 'react';
import { PlaceInput } from './PlaceInput';
import { uid } from '../lib/graph';
import type { LifeEvent } from '../types';

const TYPES: [LifeEvent['type'], string, string][] = [
  ['migration', '✈️ Moved', 'Moved to'],
  ['residence', '🏠 Lived in', 'Lived in'],
  ['marriage', '💍 Married', 'Married'],
  ['education', '🎓 Education', 'Graduated'],
  ['career', '💼 Work', 'Started working at'],
  ['military', '🎖️ Service', 'Served in'],
  ['other', '• Other', ''],
];

/** Small form for adding a life event (a move, a home, a job…) with map-aware places. */
export default function EventEditor({ defaultFrom, onSave, onCancel }: { defaultFrom?: string; onSave: (e: LifeEvent) => void; onCancel: () => void }) {
  const [type, setType] = useState<LifeEvent['type']>('migration');
  const [year, setYear] = useState('');
  const [place, setPlace] = useState(defaultFrom ?? '');
  const [toPlace, setToPlace] = useState('');
  const [title, setTitle] = useState('');
  const moved = type === 'migration';
  const city = (s: string) => s.split(',')[0].trim();
  const auto = moved ? (toPlace ? `Moved to ${city(toPlace)}` : '') : type === 'residence' ? (place ? `Lived in ${city(place)}` : '') : '';
  const ok = /^\d{3,4}$/.test(year.trim()) && (moved ? !!toPlace.trim() : !!(title.trim() || auto));

  return (
    <form className="event-editor" onSubmit={(e) => {
      e.preventDefault(); if (!ok) return;
      onSave({ id: uid(), type, year: +year, title: title.trim() || auto || TYPES.find((t) => t[0] === type)![2], place: place.trim() || undefined, toPlace: moved ? toPlace.trim() : undefined });
    }}>
      <div className="seg ev-types">{TYPES.map(([t, l]) => <button type="button" key={t} className={type === t ? 'on' : ''} onClick={() => setType(t)}>{l}</button>)}</div>
      <div className="form-grid">
        <label>Year<input required inputMode="numeric" pattern="\d{3,4}" value={year} onChange={(e) => setYear(e.target.value)} placeholder="1987" /></label>
        <label>{moved ? 'Moved from' : 'Place'}<PlaceInput value={place} onChange={setPlace} /></label>
        {moved && <label className="span2">Moved to<PlaceInput value={toPlace} onChange={setToPlace} /></label>}
        <label className="span2">What happened <span className="muted">{auto ? `(optional — default “${auto}”)` : ''}</span><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={moved ? 'e.g. Moved to Hyderabad for a job at the railways' : 'Describe the event'} /></label>
      </div>
      <div className="row end">
        <button type="button" className="btn sm" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn sm primary" disabled={!ok}>Add event</button>
      </div>
    </form>
  );
}
