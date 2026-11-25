import { useRef, useState } from 'react';
import { useStore, useDerived, type Relation } from '../store';
import { fullName, lifeSpan, isLiving, age, relationship, possessive, parentsOf, childrenOf, spousesOf, siblingsOf, birthYear, uid, placeIn, CURRENT_YEAR } from '../lib/graph';
import { flagOf, findPlace } from '../data/places';
import EventEditor from './EventEditor';
import { Avatar } from './Avatar';
import { StoryAudio } from './StoryAudio';
import { deleteBlob } from '../lib/idb';
import { X, Crosshair, GitFork, Pencil, UserPlus, Camera, Trash2, FileText, Image as ImageIcon, Mic, BookOpen, Upload } from 'lucide-react';
import type { MediaItem } from '../types';

const EV_ICON: Record<string, string> = { birth: '👶', marriage: '💍', migration: '✈️', education: '🎓', career: '💼', military: '🎖️', residence: '🏠', death: '🕯️', other: '•' };

export default function ProfileDrawer() {
  const { ix, colorer, focusId, branch } = useDerived();
  const selectedId = useStore((s) => s.selectedId);
  const { select, setFocus, set, upsert, remove, notify } = useStore.getState();
  const [tab, setTab] = useState<'overview' | 'life' | 'family' | 'media'>('overview');
  const [addingEvent, setAddingEvent] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [viewer, setViewer] = useState<MediaItem | null>(null);
  const photoIn = useRef<HTMLInputElement>(null);
  const mediaIn = useRef<HTMLInputElement>(null);
  const p = selectedId ? ix.byId.get(selectedId) : undefined;
  if (!p) return null;
  const col = colorer.color(p.id);
  const focus = ix.byId.get(focusId);
  const rel = p.id === focusId ? 'Focus person' : focus ? `${possessive(focus.given)} ${relationship(ix, focusId, p.id)}` : '';
  const bl = branch.branches.find((b) => b.key === branch.branchOf.get(p.id));

  const readImage = (file: File, cb: (url: string) => void) => {
    const r = new FileReader();
    r.onload = () => {
      // downscale large photos so local storage stays small
      const img = new Image();
      img.onload = () => {
        const max = 640, s = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = img.width * s; c.height = img.height * s;
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
        cb(c.toDataURL('image/jpeg', 0.82));
      };
      img.src = r.result as string;
    };
    r.readAsDataURL(file);
  };

  const Person = ({ id, label }: { id: string; label?: string }) => {
    const q = ix.byId.get(id)!;
    return (
      <button className="kin-chip" onClick={() => { select(id, true); setTab('overview'); }}>
        <Avatar p={q} color={colorer.color(id)} size={30} />
        <span><b>{fullName(q)}</b><br /><span className="muted">{label ? `${label} · ` : ''}{lifeSpan(q)}</span></span>
      </button>
    );
  };
  const addRel = (r: Relation) => { setAddOpen(false); set({ edit: { relativeOf: p.id, relation: r } }); };
  const by = birthYear(p);

  return (
    <aside className="drawer" aria-label={`Profile of ${fullName(p)}`}>
      <div className="dr-hero" style={{ ['--hero' as string]: col }}>
        <button className="icon-btn dr-close" onClick={() => select(null)} aria-label="Close profile"><X size={18} /></button>
        <div className="dr-photo" onClick={() => photoIn.current?.click()} title="Upload a photo">
          <Avatar p={p} color={col} size={88} />
          <span className="dr-cam"><Camera size={14} /></span>
        </div>
        <input ref={photoIn} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) readImage(f, (url) => { upsert({ ...p, photo: url, media: [...p.media, { id: uid(), kind: 'photo', title: 'Profile photo', src: url, year: new Date().getFullYear() }] }); notify('Photo added'); }); e.target.value = ''; }} />
        <h2>{fullName(p)}</h2>
        {p.birthSurname && p.birthSurname !== p.surname && <div className="muted">born {p.given} {p.birthSurname}</div>}
        {!isNaN(age(p)) && <div className="dr-meta">{lifeSpan(p)} · {isLiving(p) ? `age ${age(p)}` : `lived ${age(p)} years`}</div>}
        <div className="dr-tags">
          <span className="pill strong">{rel}</span>
          {bl && <span className="pill"><span className="dot" style={{ background: bl.color }} />{bl.label}</span>}
          {p.tags.map((t) => <span key={t} className="pill">{t}</span>)}
        </div>
        <div className="dr-actions">
          <button className="btn sm" onClick={() => setFocus(p.id)} disabled={p.id === focusId}><Crosshair size={14} /> Make focus</button>
          <button className="btn sm" onClick={() => useStore.getState().openRelation(p.id)}><GitFork size={14} /> How related?</button>
          <button className="btn sm" onClick={() => set({ capsuleUI: { mode: 'write', toId: p.id } })} title={`Write a letter that opens on a future day`}>✉️ Letter</button>
          <button className="btn sm" onClick={() => set({ edit: { personId: p.id } })}><Pencil size={14} /> Edit</button>
          <div className="menu-wrap click">
            <button className="btn sm" onClick={() => setAddOpen(!addOpen)}><UserPlus size={14} /> Add</button>
            {addOpen && (
              <div className="menu open">
                <button onClick={() => addRel('parent')}>Parent</button>
                <button onClick={() => addRel('spouse')}>Spouse / partner</button>
                <button onClick={() => addRel('child')}>Child</button>
                <button onClick={() => addRel('sibling')}>Sibling</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="tabs" role="tablist">
        {(['overview', 'life', 'family', 'media'] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>
            {t === 'overview' ? 'Overview' : t === 'life' ? `Life events (${p.events.length})` : t === 'family' ? 'Family' : `Media (${p.media.length})`}
          </button>
        ))}
      </div>

      <div className="dr-body">
        {tab === 'overview' && (
          <>
            {p.bio ? <p className="bio" style={{ whiteSpace: 'pre-line' }}>{p.bio}</p> : <p className="muted bio">No story yet. <button className="link" onClick={() => set({ edit: { personId: p.id } })}>Add one</button> — even a sentence helps future generations.</p>}
            <dl className="facts">
              <dt>Born</dt><dd>{p.birthDate ?? '—'}{p.birthPlace && <><br />{flagOf(p.birthPlace)} {p.birthPlace}</>}</dd>
              {!isLiving(p) && <><dt>Died</dt><dd>{p.deathDate ?? '—'}{p.deathPlace && <><br />{flagOf(p.deathPlace)} {p.deathPlace}</>}</dd></>}
              <dt>{isLiving(p) ? 'Lives in' : 'Last home'}</dt><dd>{placeIn(p, CURRENT_YEAR) ? <>{flagOf(placeIn(p, CURRENT_YEAR))} {placeIn(p, CURRENT_YEAR)}{!findPlace(placeIn(p, CURRENT_YEAR)) && <span className="muted small"> · not on map</span>}</> : <button className="link" onClick={() => set({ edit: { personId: p.id } })}>Add location</button>}</dd>
              {p.occupation && <><dt>Occupation</dt><dd>{p.occupation}</dd></>}
              <dt>Children</dt><dd>{childrenOf(ix, p.id).length}</dd>
            </dl>
          </>
        )}

        {tab === 'life' && (
          <>
          {addingEvent
            ? <EventEditor defaultFrom={placeIn({ ...p, residence: undefined }, CURRENT_YEAR)} onCancel={() => setAddingEvent(false)} onSave={(ev) => { upsert({ ...p, events: [...p.events, ev].sort((a, b) => a.year - b.year) }); setAddingEvent(false); notify(ev.type === 'migration' ? 'Move added — it now shows on the map' : 'Life event added'); }} />
            : <button className="btn sm add-ev" onClick={() => setAddingEvent(true)}>+ Add a move, home or life event</button>}
          <ol className="life">
            {p.events.map((e) => (
              <li key={e.id}>
                <span className="life-ic">{EV_ICON[e.type]}</span>
                {e.type !== 'birth' && e.type !== 'death' && <button className="x ev-del" title="Remove this event" onClick={() => upsert({ ...p, events: p.events.filter((x) => x.id !== e.id) })}>×</button>}
                <div>
                  <div><b>{e.year}</b> <span className="muted">{!isNaN(by) && e.year >= by ? `· age ${e.year - by}` : ''}</span></div>
                  <div>{e.title}</div>
                  {(e.place || e.toPlace) && <div className="muted small">{flagOf(e.place)} {e.place}{e.toPlace ? ` → ${flagOf(e.toPlace)} ${e.toPlace}` : ''}</div>}
                </div>
              </li>
            ))}
          </ol>
          </>
        )}

        {tab === 'family' && (
          <div className="fam-groups">
            {([['Parents', parentsOf(ix, p.id)], ['Spouses & partners', spousesOf(ix, p.id)], ['Siblings', siblingsOf(ix, p.id)], ['Children', childrenOf(ix, p.id)]] as [string, string[]][]).map(([title, ids]) => (
              <div key={title}>
                <div className="f-label">{title}</div>
                {ids.length ? ids.map((id) => <Person key={id} id={id} label={focus && id !== focusId ? relationship(ix, focusId, id) : id === focusId ? 'focus' : undefined} />) : <button className="kin-empty" onClick={() => addRel(title === 'Parents' ? 'parent' : title === 'Children' ? 'child' : title === 'Siblings' ? 'sibling' : 'spouse')}>+ Add {title.toLowerCase().replace(/s &.*|s$/, '')}</button>}
              </div>
            ))}
          </div>
        )}

        {tab === 'media' && (
          <>
            <div className="media-grid">
              {p.media.map((m) => (
                <button key={m.id} className={`media-tile ${m.kind}`} onClick={() => setViewer(m)}>
                  {m.src ? <img src={m.src} alt={m.title} /> : (
                    <div className="media-ph">{m.kind === 'document' ? <FileText size={28} /> : m.kind === 'story' ? <BookOpen size={28} /> : m.kind === 'audio' ? <Mic size={28} /> : <ImageIcon size={28} />}</div>
                  )}
                  <span className="media-cap">{m.title}{m.year ? ` · ${m.year}` : ''}</span>
                </button>
              ))}
              <button className="media-tile add" onClick={() => mediaIn.current?.click()}><Upload size={22} /><span className="media-cap">Upload photo</span></button>
            </div>
            <input ref={mediaIn} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) readImage(f, (url) => { upsert({ ...p, media: [...p.media, { id: uid(), kind: 'photo', title: f.name.replace(/\.[^.]+$/, ''), src: url }] }); notify('Photo uploaded'); }); e.target.value = ''; }} />
          </>
        )}
      </div>

      <div className="dr-foot">
        {confirmDel ? (
          <><span>Delete {p.given} from the tree?</span><button className="btn sm danger" onClick={() => { remove(p.id); notify('Person removed'); }}>Delete</button><button className="btn sm" onClick={() => setConfirmDel(false)}>Cancel</button></>
        ) : <button className="link danger" onClick={() => setConfirmDel(true)}><Trash2 size={13} /> Remove from tree</button>}
      </div>

      {viewer && (
        <div className="lightbox" onClick={() => setViewer(null)}>
          <div className="lb-card" onClick={(e) => e.stopPropagation()}>
            {viewer.audioKey ? <div className="doc-ph story"><Mic size={44} /><StoryAudio audioKey={viewer.audioKey} /></div> : viewer.src ? <img src={viewer.src} alt={viewer.title} /> : <div className={`doc-ph ${viewer.kind}`}>{viewer.kind === 'document' ? <FileText size={56} /> : viewer.kind === 'story' ? <BookOpen size={56} /> : <ImageIcon size={56} />}<p>{viewer.note && /^https?:/.test(viewer.note) ? 'Source reference for this person' : 'Placeholder — upload the scan or photo to replace this.'}</p></div>}
            <h3>{viewer.title}</h3>
            {viewer.note && !/^https?:/.test(viewer.note) && (viewer.audioKey || viewer.question) && <p className="transcript">{viewer.note}</p>}
            <p className="muted">{viewer.year}{viewer.note ? (/^https?:/.test(viewer.note) ? <> · <a href={viewer.note} target="_blank" rel="noreferrer">Open source ↗</a></> : ` · ${viewer.note}`) : ''}</p>
            <div className="row">
              {viewer.src && <button className="btn sm" onClick={() => { upsert({ ...p, photo: viewer.src }); setViewer(null); notify('Profile photo updated'); }}>Use as profile photo</button>}
              <button className="btn sm" onClick={() => { if (viewer.audioKey) deleteBlob(viewer.audioKey); upsert({ ...p, media: p.media.filter((m) => m.id !== viewer.id), photo: p.photo === viewer.src ? undefined : p.photo }); setViewer(null); }}>Remove</button>
              <button className="btn sm primary" onClick={() => setViewer(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
