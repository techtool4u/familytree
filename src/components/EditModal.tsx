import { useState } from 'react';
import { useStore, useDerived, newPerson } from '../store';
import { PlaceInput } from './PlaceInput';
import { fullName, uid } from '../lib/graph';
import { X } from 'lucide-react';
import type { Person, Gender } from '../types';

export default function EditModal() {
  const edit = useStore((s) => s.edit)!;
  const { ix } = useDerived();
  const { set, upsert, addRelative, notify } = useStore.getState();
  const existing = edit.personId ? ix.byId.get(edit.personId) : undefined;
  const base = edit.relativeOf ? ix.byId.get(edit.relativeOf) : undefined;
  const [p, setP] = useState<Person>(() => existing ? structuredClone(existing) : newPerson({
    surname: edit.relation === 'child' || edit.relation === 'sibling' ? base?.surname ?? '' : edit.relation === 'parent' ? base?.surname ?? '' : '',
  }));
  const [tags, setTags] = useState(p.tags.join(', '));
  const up = (k: keyof Person, v: string) => setP({ ...p, [k]: v || undefined });
  const title = existing ? `Edit ${fullName(existing)}` : base ? `Add ${edit.relation} of ${base.given}` : 'Add person';

  const save = () => {
    if (!p.given.trim()) return;
    const out: Person = { ...p, given: p.given.trim(), surname: (p.surname ?? '').trim(), tags: tags.split(',').map((t) => t.trim()).filter(Boolean) };
    // keep birth/death events in sync with the fields
    const by = out.birthDate ? +out.birthDate.slice(0, 4) : NaN, dy = out.deathDate ? +out.deathDate.slice(0, 4) : NaN;
    out.events = out.events.filter((e) => e.type !== 'birth' && e.type !== 'death');
    if (!isNaN(by)) out.events.push({ id: uid(), year: by, type: 'birth', title: 'Born', place: out.birthPlace });
    if (!isNaN(dy)) out.events.push({ id: uid(), year: dy, type: 'death', title: 'Died', place: out.deathPlace });
    out.events.sort((a, b) => a.year - b.year);
    if (existing) { upsert(out); notify('Saved'); }
    else if (base && edit.relation) addRelative(base.id, edit.relation, out);
    else { upsert(out); useStore.getState().select(out.id, true); notify(`Added ${out.given}`); }
    set({ edit: null });
  };

  return (
    <div className="modal-bg" onClick={() => set({ edit: null })}>
      <form className="modal edit" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); save(); }}>
        <div className="modal-head"><h3>{title}</h3><span className="grow" /><button type="button" className="icon-btn" onClick={() => set({ edit: null })} aria-label="Close"><X size={18} /></button></div>
        <div className="form-grid">
          <label>First & middle names<input autoFocus required value={p.given} onChange={(e) => up('given', e.target.value)} /></label>
          <label>Surname<input value={p.surname} onChange={(e) => setP({ ...p, surname: e.target.value })} /></label>
          <label>Birth surname <span className="muted">(if different)</span><input value={p.birthSurname ?? ''} onChange={(e) => up('birthSurname', e.target.value)} /></label>
          <label>Gender
            <select value={p.gender} onChange={(e) => setP({ ...p, gender: e.target.value as Gender })}>
              <option value="F">Female</option><option value="M">Male</option><option value="U">Unknown / other</option>
            </select>
          </label>
          <label>Birth date <span className="muted">YYYY or YYYY-MM-DD</span><input pattern="\d{4}(-\d{2}-\d{2})?" value={p.birthDate ?? ''} onChange={(e) => up('birthDate', e.target.value)} placeholder="1950-06-01" /></label>
          <label>Birthplace<PlaceInput value={p.birthPlace ?? ''} onChange={(v) => up('birthPlace', v)} /></label>
          <label>Death date<input pattern="\d{4}(-\d{2}-\d{2})?" value={p.deathDate ?? ''} onChange={(e) => up('deathDate', e.target.value)} placeholder="Leave blank if living" /></label>
          <label>Place of death<PlaceInput value={p.deathPlace ?? ''} onChange={(v) => up('deathPlace', v)} placeholder="Leave blank if living" /></label>
          <label className="span2">Lives in <span className="muted">(current home — or last home, if deceased)</span><PlaceInput value={p.residence ?? ''} onChange={(v) => up('residence', v)} /></label>
          <label>Occupation<input value={p.occupation ?? ''} onChange={(e) => up('occupation', e.target.value)} /></label>
          <label>Tags <span className="muted">comma separated</span><input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Immigrant, Military" /></label>
          <label className="span2">Story / biography<textarea rows={4} value={p.bio ?? ''} onChange={(e) => up('bio', e.target.value)} placeholder="What do you remember about them? Where did they live, what did they love?" /></label>
        </div>
        <div className="row end">
          <button type="button" className="btn" onClick={() => set({ edit: null })}>Cancel</button>
          <button type="submit" className="btn primary">{existing ? 'Save changes' : 'Add to tree'}</button>
        </div>
      </form>
    </div>
  );
}
