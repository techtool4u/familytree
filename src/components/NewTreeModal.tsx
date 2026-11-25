import { useState } from 'react';
import { useStore, newPerson } from '../store';
import { PlaceInput } from './PlaceInput';
import { uid } from '../lib/graph';
import { X, Sprout } from 'lucide-react';
import type { Person, Gender } from '../types';

const born = (date: string, place: string) => {
  const y = date ? +date.slice(0, 4) : NaN;
  return isNaN(y) ? [] : [{ id: uid(), year: y, type: 'birth' as const, title: 'Born', place: place || undefined }];
};

/** Start a brand-new tree: you, plus (optionally) your parents and partner. */
export default function NewTreeModal() {
  const { set, createTree, notify } = useStore.getState();
  const [me, setMe] = useState({ given: '', surname: '', gender: 'U' as Gender, birthDate: '', birthPlace: '' });
  const [dad, setDad] = useState('');
  const [mom, setMom] = useState('');
  const [partner, setPartner] = useState('');
  const [treeName, setTreeName] = useState('');
  const close = () => set({ newTreeOpen: false });

  const split = (full: string, fallbackSurname: string) => {
    const parts = full.trim().split(/\s+/);
    return parts.length > 1 ? { given: parts.slice(0, -1).join(' '), surname: parts.at(-1)! } : { given: parts[0], surname: fallbackSurname };
  };

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    if (!me.given.trim()) return;
    const you: Person = newPerson({ given: me.given.trim(), surname: me.surname.trim(), gender: me.gender, birthDate: me.birthDate || undefined, birthPlace: me.birthPlace || undefined, events: born(me.birthDate, me.birthPlace) });
    const people: Person[] = [you];
    let father: Person | undefined, mother: Person | undefined;
    if (dad.trim()) { father = newPerson({ ...split(dad, you.surname), gender: 'M' }); people.push(father); you.fatherId = father.id; }
    if (mom.trim()) { mother = newPerson({ ...split(mom, ''), gender: 'F' }); people.push(mother); you.motherId = mother.id; }
    if (father && mother) { father.spouseIds = [mother.id]; mother.spouseIds = [father.id]; }
    if (partner.trim()) { const pt = newPerson({ ...split(partner, ''), gender: me.gender === 'M' ? 'F' : me.gender === 'F' ? 'M' : 'U', spouseIds: [you.id] }); people.push(pt); you.spouseIds = [pt.id]; }
    const name = treeName.trim() || `${you.surname || you.given} family`;
    createTree(name, people, you.id);
    set({ newTreeOpen: false, view: 'tree', selectedId: you.id });
    notify(`“${name}” created — click Add on your profile to keep growing it`);
  };

  return (
    <div className="modal-bg" onClick={close}>
      <form className="modal edit" role="dialog" aria-label="New family tree" onClick={(e) => e.stopPropagation()} onSubmit={create}>
        <div className="modal-head"><Sprout size={20} /><h3>Start a new family tree</h3><span className="grow" /><button type="button" className="icon-btn" onClick={close} aria-label="Close"><X size={18} /></button></div>
        <p className="muted" style={{ marginTop: -6 }}>Start with yourself — you’ll be the center of the tree. Everything else is optional and can be added later. Your other trees stay saved; switch between them from the menu next to the logo.</p>

        <div className="f-label" style={{ marginTop: 14 }}>You</div>
        <div className="form-grid">
          <label>First name<input autoFocus required value={me.given} onChange={(e) => setMe({ ...me, given: e.target.value })} /></label>
          <label>Surname<input value={me.surname} onChange={(e) => setMe({ ...me, surname: e.target.value })} /></label>
          <label>Gender
            <select value={me.gender} onChange={(e) => setMe({ ...me, gender: e.target.value as Gender })}>
              <option value="U">Prefer not to say</option><option value="F">Female</option><option value="M">Male</option>
            </select>
          </label>
          <label>Birth date <span className="muted">YYYY-MM-DD</span><input pattern="\d{4}(-\d{2}-\d{2})?" placeholder="1990-04-15" value={me.birthDate} onChange={(e) => setMe({ ...me, birthDate: e.target.value })} /></label>
          <label className="span2">Birthplace<PlaceInput value={me.birthPlace} onChange={(v) => setMe({ ...me, birthPlace: v })} /></label>
        </div>

        <div className="f-label" style={{ marginTop: 18 }}>Close family <span className="muted">(optional — full names)</span></div>
        <div className="form-grid">
          <label>Father<input value={dad} onChange={(e) => setDad(e.target.value)} placeholder="e.g. Ramesh Kumar" /></label>
          <label>Mother<input value={mom} onChange={(e) => setMom(e.target.value)} placeholder="e.g. Lakshmi Kumar" /></label>
          <label>Spouse / partner<input value={partner} onChange={(e) => setPartner(e.target.value)} /></label>
          <label>Tree name<input value={treeName} onChange={(e) => setTreeName(e.target.value)} placeholder={`${me.surname || me.given || 'Your'} family`} /></label>
        </div>
        <div className="row end">
          <button type="button" className="btn" onClick={close}>Cancel</button>
          <button type="submit" className="btn primary"><Sprout size={15} /> Create tree</button>
        </div>
      </form>
    </div>
  );
}
