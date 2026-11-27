import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useStore, useDerived, DEFAULT_FILTERS } from './store';
import FilterPanel from './components/FilterPanel';
import ProfileDrawer from './components/ProfileDrawer';
import EditModal from './components/EditModal';
import CommandPalette from './components/CommandPalette';
import TreeView from './views/TreeView';
import FanView from './views/FanView';
import RadialView from './views/RadialView';
import TimelineView from './views/TimelineView';
import InsightsView from './views/InsightsView';
import TodayView from './views/TodayView';
import StoriesView from './views/StoriesView';
import TimeMachineView from './views/TimeMachineView';
import InterviewModal from './components/InterviewModal';
import TreeSwitcher from './components/TreeSwitcher';
import NewTreeModal from './components/NewTreeModal';
import CapsuleModal from './components/CapsuleModal';

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'family-tree';
import { parseGedcom, toGedcom } from './lib/gedcom';
import { activeFilterCount, parentsOf, childrenOf, siblingsOf, spousesOf, fullName } from './lib/graph';
import type { ViewId, Person } from './types';
import type { Place } from './data/places';
import { Network, Sun, Moon, Search, GitFork, SlidersHorizontal, UserPlus, MoreHorizontal, CircleDot, Orbit, CalendarRange, Globe2, BarChart3, X, Download, Sparkles, Hourglass, Mic } from 'lucide-react';
import { saveFile } from './lib/native';

const MapView = lazy(() => import('./views/MapView'));

const VIEWS: { id: ViewId; label: string; icon: typeof Network; secondary?: boolean; mobile?: boolean }[] = [
  { id: 'today', label: 'Today', icon: Sparkles, mobile: true },
  { id: 'tree', label: 'Tree', icon: Network, mobile: true },
  { id: 'fan', label: 'Fan', icon: CircleDot, secondary: true },
  { id: 'radial', label: 'Wheel', icon: Orbit, secondary: true },
  { id: 'timeline', label: 'Timeline', icon: CalendarRange, secondary: true },
  { id: 'map', label: 'Map', icon: Globe2, secondary: true },
  { id: 'time', label: 'Time machine', icon: Hourglass, mobile: true },
  { id: 'stories', label: 'Stories', icon: Mic, mobile: true },
  { id: 'insights', label: 'Insights', icon: BarChart3, secondary: true },
];
const PAGE_VIEWS: ViewId[] = ['today', 'stories', 'time', 'insights'];

interface BIPEvent extends Event { prompt: () => void }

export default function App() {
  const s = useStore();
  const { matched, people, colorer, ix, focusId, filters, branch } = useDerived();
  const fileIn = useRef<HTMLInputElement>(null);
  const [installEvt, setInstallEvt] = useState<BIPEvent | null>(null);
  const [legendOpen, setLegendOpen] = useState(() => window.innerWidth > 900);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => { document.documentElement.dataset.theme = s.theme; }, [s.theme]);
  useEffect(() => {
    const h = (e: Event) => { e.preventDefault(); setInstallEvt(e as BIPEvent); };
    window.addEventListener('beforeinstallprompt', h);
    return () => window.removeEventListener('beforeinstallprompt', h);
  }, []);

  const download = (name: string, text: string, type = 'application/json') => {
    saveFile(name, text, type).catch(() => s.notify('Could not save the file'));
  };
  const actions = useMemo(() => [
    { label: 'Find how two people are related', run: () => s.openRelation() },
    { label: 'Add a person', run: () => s.set({ edit: {} }) },
    { label: 'Write a time-capsule letter', run: () => s.set({ capsuleUI: { mode: 'write' } }) },
    { label: 'Toggle dark mode', run: () => s.set({ theme: useStore.getState().theme === 'dark' ? 'light' : 'dark' }) },
    { label: 'Clear all filters', run: () => s.setFilters(DEFAULT_FILTERS) },
    { label: 'Start a new family tree…', run: () => s.set({ newTreeOpen: true }) },
    { label: 'Export this tree as JSON', run: () => { const st = useStore.getState(); const nm = st.trees.find((t) => t.id === st.activeTreeId)?.name ?? 'family-tree'; download(`${slug(nm)}.json`, JSON.stringify({ title: nm, focusId: st.focusId, people: st.people, places: st.customPlaces.filter((pl) => st.people.some((p) => [p.birthPlace, p.deathPlace, p.residence, ...p.events.flatMap((e) => [e.place, e.toPlace])].some((n) => n && n.toLowerCase().trim() === pl.name.toLowerCase().trim()))) }, null, 2)); } },
    { label: 'Export this tree as GEDCOM', run: () => { const st = useStore.getState(); download(`${slug(st.trees.find((t) => t.id === st.activeTreeId)?.name ?? 'family-tree')}.ged`, toGedcom(st.people), 'text/plain'); } },
    { label: 'Import a tree (JSON or GEDCOM)', run: () => fileIn.current?.click() },
    { label: 'Open the sample family', run: () => s.resetSample() },
  ], []); // eslint-disable-line react-hooks/exhaustive-deps

  // keyboard shortcuts
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const st = useStore.getState();
      const typing = /INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement).tagName);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !/INPUT|TEXTAREA/.test((e.target as HTMLElement).tagName)) { e.preventDefault(); st.undo(); return; }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); st.set({ paletteOpen: !st.paletteOpen }); return; }
      if (e.key === 'Escape') { if (st.paletteOpen) st.set({ paletteOpen: false }); else if (st.capsuleUI) st.set({ capsuleUI: null }); else if (st.newTreeOpen) st.set({ newTreeOpen: false }); else if (st.interview) st.set({ interview: null }); else if (st.edit) st.set({ edit: null }); else if (st.relPair) st.set({ relPair: null, path: null }); else if (st.path) st.set({ path: null }); else st.select(null); return; }
      if (typing || st.edit || st.paletteOpen || st.interview || st.newTreeOpen || st.capsuleUI) return;
      if (e.key === '/') { e.preventDefault(); st.set({ paletteOpen: true }); return; }
      const n = +e.key; if (n >= 1 && n <= VIEWS.length) { st.set({ view: VIEWS[n - 1].id }); return; }
      if (e.key === 'r') { st.openRelation(st.selectedId ?? undefined); return; }
      if (e.key === 'f' && !e.metaKey) { st.set({ filtersOpen: !st.filtersOpen }); return; }
      if (!['tree', 'fan', 'radial'].includes(st.view)) return;
      const cur = st.selectedId ?? st.focusId;
      const go = (id?: string) => id && st.select(id, true);
      if (e.key === 'ArrowUp') { e.preventDefault(); go(parentsOf(ix, cur)[0]); }
      if (e.key === 'ArrowDown') { e.preventDefault(); go(childrenOf(ix, cur)[0]); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const sibs = [...siblingsOf(ix, cur), cur].sort((a, b) => (ix.byId.get(a)!.birthDate ?? '').localeCompare(ix.byId.get(b)!.birthDate ?? ''));
        const i = sibs.indexOf(cur) + (e.key === 'ArrowRight' ? 1 : -1);
        go(sibs[i] ?? spousesOf(ix, cur)[0]);
      }
      if (e.key === 'Enter' && st.selectedId) st.setFocus(st.selectedId);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [ix]);

  const onImport = async (f: File) => {
    const text = await f.text();
    try {
      if (/\.ged$/i.test(f.name) || text.startsWith('0 HEAD')) {
        const ps = parseGedcom(text);
        if (!ps.length) throw new Error('no people');
        s.importPeople(ps, ps[0].id, f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '));
        s.notify(`Imported ${ps.length} people from GEDCOM`);
      } else {
        const j = JSON.parse(text) as { people: Person[]; focusId?: string; title?: string; places?: Place[] } | Person[];
        if (!Array.isArray(j) && Array.isArray(j.places)) j.places.forEach((pl) => s.addPlace(pl));
        const ps = Array.isArray(j) ? j : j.people;
        if (!Array.isArray(ps) || !ps.length) throw new Error('no people');
        s.importPeople(ps, Array.isArray(j) ? undefined : j.focusId, (!Array.isArray(j) && j.title) || f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '));
        s.notify(`Imported ${ps.length} people`);
      }
    } catch { s.notify('Could not read that file — use JSON exported from this app or a GEDCOM (.ged) file'); }
  };

  const nf = activeFilterCount(filters, DEFAULT_FILTERS);
  const focus = ix.byId.get(focusId);
  const legendClick = (label: string) => {
    if (s.colorMode === 'branch') {
      const b = branch.branches.find((x) => x.label === label); if (!b) return;
      s.setFilters({ branches: filters.branches.includes(b.key) ? filters.branches.filter((k) => k !== b.key) : [...filters.branches, b.key] });
    } else if (s.colorMode === 'surname' && label !== 'Other') {
      s.setFilters({ surnames: filters.surnames.includes(label) ? filters.surnames.filter((k) => k !== label) : [...filters.surnames, label] });
    } else if (s.colorMode === 'country' && label !== 'Other') {
      s.setFilters({ countries: filters.countries.includes(label) ? filters.countries.filter((k) => k !== label) : [...filters.countries, label] });
    }
  };
  const legendOn = (label: string) => s.colorMode === 'branch' ? filters.branches.includes(branch.branches.find((x) => x.label === label)?.key ?? '') : s.colorMode === 'surname' ? filters.surnames.includes(label) : s.colorMode === 'country' ? filters.countries.includes(label) : false;

  return (
    <div className={`app ${s.filtersOpen ? 'with-filters' : ''} ${s.selectedId ? 'with-drawer' : ''}`}>
      <header className="topbar">
        <div className="brand"><span className="logo">🌳</span><span className="brand-name">Kindred</span></div>
        <TreeSwitcher onImport={() => fileIn.current?.click()} />
        <nav className="views" aria-label="Views">
          {VIEWS.map((v, i) => (
            <button key={v.id} className={`${s.view === v.id ? 'on' : ''} ${v.secondary ? 'secondary' : ''} ${i === 1 || i === 6 ? 'sep' : ''}`} onClick={() => s.set({ view: v.id })} title={`${v.label} (${i + 1})`}>
              <v.icon size={16} /><span>{v.label}</span>
            </button>
          ))}
        </nav>
        <span className="grow" />
        <button className="search-trigger" onClick={() => s.set({ paletteOpen: true })}><Search size={15} /><span>Search people…</span><kbd>⌘K</kbd></button>
        <button className={`icon-btn ${s.filtersOpen ? 'on' : ''}`} onClick={() => s.set({ filtersOpen: !s.filtersOpen })} title="Filters (F)">
          <SlidersHorizontal size={18} />{nf > 0 && <span className="dot-badge">{nf}</span>}
        </button>
        <button className="icon-btn" onClick={() => s.openRelation(s.selectedId ?? undefined)} title="How are two people related? (R)"><GitFork size={18} /></button>
        <button className="icon-btn hide-sm" onClick={() => s.set({ edit: {} })} title="Add person"><UserPlus size={18} /></button>
        <button className="icon-btn" onClick={() => s.set({ theme: s.theme === 'dark' ? 'light' : 'dark' })} title="Toggle theme">{s.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>
        <div className="menu-wrap">
          <button className="icon-btn" title="More"><MoreHorizontal size={18} /></button>
          <div className="menu right">
            {installEvt && <button onClick={() => installEvt.prompt()}><Download size={14} /> Install app</button>}
            {actions.slice(5).map((a) => <button key={a.label} onClick={a.run}>{a.label}</button>)}
          </div>
        </div>
        <input ref={fileIn} type="file" accept=".json,.ged,application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = ''; }} />
      </header>

      <div className="body">
        {s.filtersOpen && <FilterPanel />}
        {s.filtersOpen && <div className="scrim only-mobile" onClick={() => s.set({ filtersOpen: false })} />}
        <main className={`stage ${PAGE_VIEWS.includes(s.view) ? 'page' : ''}`}>
          <div className="stage-bar">
            {focus && <span className="focus-chip" title="Everything is measured from this person. Double-click anyone to change.">◉ Focus: <b>{fullName(focus)}</b></span>}
            {nf > 0 && <span className="pill">{matched.size} of {people.length} match · <button className="link" onClick={() => s.setFilters({ ...DEFAULT_FILTERS, mode: filters.mode })}>clear</button></span>}
            {s.spotlight && <span className="pill path-pill">✨ {s.spotlight.label} <button className="x" onClick={() => s.set({ spotlight: null })} aria-label="Clear spotlight"><X size={13} /></button></span>}
            {s.path && <span className="pill path-pill">Showing path: {s.path.map((id) => ix.byId.get(id)?.given).join(' → ')} <button className="x" onClick={() => s.set({ path: null })} aria-label="Clear path"><X size={13} /></button></span>}
          </div>
          {s.view === 'tree' && <TreeView />}
          {s.view === 'fan' && <FanView />}
          {s.view === 'radial' && <RadialView />}
          {s.view === 'timeline' && <TimelineView />}
          {s.view === 'map' && <Suspense fallback={<div className="loading">Loading map…</div>}><MapView /></Suspense>}
          {s.view === 'insights' && <InsightsView />}
          {s.view === 'today' && <TodayView />}
          {s.view === 'stories' && <StoriesView />}
          {s.view === 'time' && <TimeMachineView />}
          {!PAGE_VIEWS.includes(s.view) && s.view !== 'timeline' && colorer.legend.length > 0 && (
            <div className="legend">
              <div className="lg-title" onClick={() => setLegendOpen(!legendOpen)}>{colorer.title}<span>{legendOpen ? '–' : '+'}</span></div>
              {legendOpen && colorer.legend.map((l) => (
                <button key={l.label} className={`lg-item ${legendOn(l.label) ? 'on' : ''}`} onClick={() => legendClick(l.label)} title={['branch', 'surname', 'country'].includes(s.colorMode) ? 'Click to filter' : undefined}>
                  <span className="dot" style={{ background: l.color }} />{l.label}
                </button>
              ))}
            </div>
          )}
        </main>
        {s.selectedId && <ProfileDrawer />}
      </div>

      <nav className="bottom-nav" aria-label="Views">
        {VIEWS.filter((v) => v.mobile).map((v) => <button key={v.id} className={s.view === v.id ? 'on' : ''} onClick={() => { s.set({ view: v.id }); setMoreOpen(false); }}><v.icon size={20} /><span>{v.id === 'time' ? 'Time' : v.label}</span></button>)}
        <button className={!VIEWS.find((v) => v.id === s.view)?.mobile ? 'on' : ''} onClick={() => setMoreOpen(!moreOpen)}><MoreHorizontal size={20} /><span>More</span></button>
      </nav>
      {moreOpen && (
        <div className="more-sheet" onClick={() => setMoreOpen(false)}>
          <div className="more-card" onClick={(e) => e.stopPropagation()}>
            {VIEWS.filter((v) => !v.mobile).map((v) => <button key={v.id} className={s.view === v.id ? 'on' : ''} onClick={() => { s.set({ view: v.id }); setMoreOpen(false); }}><v.icon size={22} /><span>{v.label}</span></button>)}
          </div>
        </div>
      )}

      {s.edit && <EditModal />}
      {s.paletteOpen && <CommandPalette actions={actions} />}
      {s.interview && <InterviewModal />}
      {s.newTreeOpen && <NewTreeModal />}
      {s.capsuleUI && <CapsuleModal />}
      {s.toast && <div className="toast" role="status">{s.toast}{s.toastUndo && <button className="toast-undo" onClick={() => s.undo()}>Undo</button>}</div>}
    </div>
  );
}
