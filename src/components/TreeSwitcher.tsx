import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { ChevronDown, Plus, Pencil, Trash2, Check, Upload } from 'lucide-react';

/** Top-bar menu listing every family tree saved in this browser. */
export default function TreeSwitcher({ onImport }: { onImport: () => void }) {
  const trees = useStore((s) => s.trees);
  const active = useStore((s) => s.activeTreeId);
  const count = useStore((s) => s.people.length);
  const { switchTree, renameTree, deleteTree, set, notify } = useStore.getState();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [confirm, setConfirm] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const cur = trees.find((t) => t.id === active);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) { setOpen(false); setEditing(null); setConfirm(null); } };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  return (
    <div className="tree-switch" ref={ref}>
      <button className="ts-btn" onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open} title="Switch or create family trees">
        <span className="ts-name">{cur?.name ?? 'Family tree'}</span><ChevronDown size={14} />
      </button>
      {open && (
        <div className="ts-menu" role="menu">
          <div className="f-label" style={{ padding: '6px 8px 2px' }}>Your family trees</div>
          {trees.map((t) => (
            <div key={t.id} className={`ts-item ${t.id === active ? 'on' : ''}`}>
              {editing === t.id ? (
                <form className="ts-rename" onSubmit={(e) => { e.preventDefault(); if (name.trim()) renameTree(t.id, name.trim()); setEditing(null); }}>
                  <input autoFocus value={name} onChange={(e) => setName(e.target.value)} />
                  <button className="icon-btn" type="submit" aria-label="Save name"><Check size={15} /></button>
                </form>
              ) : confirm === t.id ? (
                <div className="ts-confirm">
                  <span>Delete “{t.name}” for good?</span>
                  <button className="btn sm danger" onClick={() => { deleteTree(t.id); setConfirm(null); notify('Tree deleted'); }}>Delete</button>
                  <button className="btn sm" onClick={() => setConfirm(null)}>Keep</button>
                </div>
              ) : (
                <>
                  <button className="ts-open" onClick={() => { switchTree(t.id); setOpen(false); }}>
                    {t.id === active ? <Check size={14} /> : <span style={{ width: 14 }} />}
                    <span className="grow"><b>{t.name}</b><br /><span className="muted small">{t.id === active ? count : t.people.length} people</span></span>
                  </button>
                  <button className="icon-btn" onClick={() => { setEditing(t.id); setName(t.name); }} title="Rename"><Pencil size={14} /></button>
                  <button className="icon-btn" onClick={() => setConfirm(t.id)} title="Delete"><Trash2 size={14} /></button>
                </>
              )}
            </div>
          ))}
          <div className="ts-actions">
            <button className="btn sm primary" onClick={() => { set({ newTreeOpen: true }); setOpen(false); }}><Plus size={14} /> New family tree</button>
            <button className="btn sm" onClick={() => { onImport(); setOpen(false); }}><Upload size={14} /> Import file</button>
          </div>
        </div>
      )}
    </div>
  );
}
