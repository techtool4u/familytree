# OurFamilyTree: project guide for Claude

Read this first. It explains what this project is, how it is built, where everything lives, and the conventions to follow, so you can continue the work without the original conversation.

## 1. What it is

**OurFamilyTree** is an interactive family tree app built with React 19, TypeScript, D3 and Vite. It runs in any browser and can be installed as a PWA. It ships with a fictional sample family across five generations and four lines (Rossi, O'Brien, Chen, Wong), plus extra data sets for Lord Rama's family and the Hindu deities.

The owner (Anil Chevuri) uses it for his own family, the Chevuri tree. Trees are stored on the device; a tree can also be shared online (Supabase) so family members edit it together.

**Goals that shaped the design:**

- Great visual filters and many ways to view one family.
- Reasons to come back daily: Today, Stories, Time machine, Time capsules, Family echoes.
- Easy growth: + handles on cards, plain-English "Ask your tree", undo.
- Works well on phones.

## 2. Run and build

| Command | What it does |
|---|---|
| `npm install` | install dependencies (Node 22+) |
| `npm run dev` | dev server at http://localhost:5173 |
| `npm run build` | type-check (`tsc -b`) + PWA build into `dist/` (deploy to Netlify, Vercel, GitHub Pages…) |
| `npm run build:single` | one self-contained HTML file in `dist-single/index.html` |
| `npm run cap:sync` | web build + copy into the native `android/` and `ios/` projects (Capacitor) |
| `npm run android` / `npm run ios` | sync, then open Android Studio / Xcode |

**After every change:**

1. Run `npx tsc -b`.
2. Run `npm run build:single`.
3. Copy `dist-single/index.html` to `OurFamilyTree.html` in the project root. That file is what the owner double-clicks to use the app.

`tsconfig` is not strict, but `noUnusedLocals` is on, so remove unused imports. Lint uses `oxlint`.

## 3. Tech stack

- **React 19 + TypeScript**, bundled with **Vite 8**. `vite-plugin-singlefile` is used for the one-file build (`--mode single`, see `vite.config.ts`).
- **zustand** for state (`src/store.ts`). The `useDerived()` hook gives computed graph data.
- **d3**: zoom, hierarchy, arc, geo. **topojson-client** with **world-atlas** (countries-110m) for the map.
- **lucide-react** for icons.
- **Supabase** (`@supabase/supabase-js`) for sharing: email-code sign-in, Postgres with row-level security, Realtime. Project URL and publishable key are in `src/cloud.config.ts` (public by design). Database setup: `supabase/schema.sql` (run in the SQL Editor; safe to re-run).
- **Capacitor 8** wraps the web build as native apps (`capacitor.config.ts`, appId `com.techtool4u.ourfamilytree`, `android/`, `ios/` with Swift Package Manager). Plugins: `@capacitor/filesystem`, `@capacitor/share`. See `MOBILE.md`.
- No CSS framework. All styles are in `src/index.css`, which uses CSS variables for light and dark themes. The mobile breakpoint is `@media (max-width: 900px)`.

## 4. Storage

- **localStorage** key `kindred-tree-v1` (original app name, kept so saved trees still load; same for IndexedDB `kindred-media`) holds `{ trees: TreeDoc[], activeTreeId, theme, customPlaces }`.
  - `TreeDoc` = `{ id, name, people, focusId, asked, capsules?, updatedAt }`.
  - An old single-tree format is migrated automatically.
- **IndexedDB** (`src/lib/idb.ts`) holds voice recordings, referenced by `MediaItem.audioKey` and `Capsule.audioKey`.
- JSON export includes transcripts and custom places but not audio.
- **Shared trees:** `TreeDoc.cloud = { id, role }` marks a tree as shared. The local copy stays in `trees` (offline cache). Pending edits for shared trees are queued in localStorage `oft-sync-queue`; a pending invite token in `oft-join`; the Supabase session in `sb-<ref>-auth-token`.
- **Database tables:** `trees`, `tree_members (role owner|editor|viewer)`, `people (tree_id, id, data jsonb, deleted, updated_by)`, `invites (token, role, revoked)`. Functions `create_tree`, `accept_invite`, `set_my_name`, `tree_role`. People are soft-deleted so live updates carry removals.
- **GEDCOM 5.5.1** import and export: `src/lib/gedcom.ts`, which supports CONC/CONT and SOUR.

## 5. Data model (`src/types.ts`)

```ts
Person {
  id, given, surname, birthSurname?, gender: 'M'|'F'|'U',
  birthDate?, birthPlace?, deathDate?, deathPlace?, residence?,   // dates are 'YYYY' or 'YYYY-MM-DD'
  fatherId?, motherId?, spouseIds: string[],
  occupation?, bio?, photo?, tags: string[], events: LifeEvent[], media: MediaItem[]
}
LifeEvent { id, year, type: 'birth'|'marriage'|'migration'|'education'|'career'|'military'|'residence'|'death'|'other', title, place?, toPlace? }
MediaItem { id, kind: 'photo'|'document'|'story'|'audio', title, year?, src?, note? (text/transcript/URL), audioKey?, question?, questionId?, recordedAt? }
Capsule   { id, toId, fromId?, fromName, title, message, audioKey?, unlockDate, unlockLabel, createdAt, openedAt? }
ViewId    = 'today'|'tree'|'fan'|'radial'|'timeline'|'map'|'time'|'stories'|'insights'
Filters   include scope, generations, birth-year range, status, gender, branches, surnames, countries, tags, text, mode ('highlight'|'hide'), aliveIn
```

Relationships are stored only as `fatherId`, `motherId` and `spouseIds`. Siblings, cousins and so on are derived.

## 6. File map

```
src/
  main.tsx, App.tsx       shell: top bar, desktop view tabs, phone bottom nav + "More" sheet, keyboard shortcuts,
                          import/export, toast with Undo, modals
  store.ts                zustand store (see §7)
  types.ts
  index.css               all styles
  data/sample.ts          buildSample(), SAMPLE_FOCUS='maya', SAMPLE_CAPSULES
  data/places.ts          built-in gazetteer (~58 cities) + custom places registry
                          (setCustomPlaces, allPlaces, findPlace, flagOf, countryOf)
  lib/graph.ts            buildIndex, parentsOf/childrenOf/spousesOf/siblingsOf, ancestorsOf/descendantsOf,
                          generations, relationship() (English kinship terms incl. in-laws, step, removed cousins),
                          findPath, computeBranches (grandparent lines), scopeSet, matchSet, makeColorer, inkOn,
                          aliveIn, placeIn, isLiving, lifeSpan, fullName, possessive
  lib/layout.ts           layered couple layout (barycenter ordering + PAVA placement). NODE_W 184, NODE_H 64, ROW_H 150
  lib/fitName.ts          measures real text width (canvas) to fit names on cards: fitName, fitText, textWidth, fanFont
  lib/ask.ts              plain-English "Ask your tree" parser → { ids, label, path?, understood }
  lib/journey.ts          journeyRoute (parents-only chain from earliest ancestor) + narrate()
  lib/echoes.ts           findEchoes(): cross-generation patterns (names, jobs, towns, birthdays, twins, lifespans…)
  lib/daily.ts            onThisDay, upcoming, storyOfDay, atAge, toICS (calendar export), dayIndex
  lib/questions.ts        weekly "Ask the elders" questions tailored to each person, share text
  lib/history.ts          world-event bands for the timeline / time machine
  lib/idb.ts              IndexedDB audio store
  lib/gedcom.ts           GEDCOM import/export
  lib/cloud.ts            Supabase calls: sendCode/verifyCode, trees, people, members, invites, inviteUrl, tokenFrom
  lib/sync.ts             sync engine: per-person diff against a server shadow, offline queue, Realtime apply (outside undo), refreshTreeList, shareActiveTree
  cloud.config.ts         Supabase URL + publishable key, appUrl for invite links
  lib/native.ts           web/native bridge: saveFile() (download on web, share sheet in apps), openExternal(), isNativeApp()
  views/
    TodayView.tsx         home: story of the day, on this day, at your age, capsule unlocked, echo "did you know"
    TreeView.tsx          main canvas (see §8)
    FanView.tsx           ancestor fan chart (2–7 gens, empty slots = "+ father/mother")
    RadialView.tsx        "Wheel": radial descendants of a founding couple (phone: initials + tap to zoom)
    TimelineView.tsx      lifespan bars, world events, tap or hover a year to see who was alive (phone: fit to screen)
    MapView.tsx           birthplaces + migration arcs, Play history, jump-to-place chips (phone: starts zoomed in)
    TimeMachineView.tsx   pick a year: who was alive, ages, where, family and world events
    StoriesView.tsx       Ask the elders + story library + time capsules
    InsightsView.tsx      stats, family echoes, research to-do
  components/
    TreeTools.tsx         AskBar, QuickAdd (inline add card from + handles), HoverCard, JourneyCaption
    RelationBar.tsx       docked "How are they related?" bar (replaced the old pop-up)
    RelFinder.tsx         empty stub (old pop-up, no longer used, safe to delete)
    ProfileDrawer.tsx     profile: overview, life events, family, media, Letter, How related?
    EditModal.tsx, EventEditor.tsx, PlaceInput.tsx (+ map picker, OpenStreetMap lookup)
    FilterPanel.tsx, CommandPalette.tsx, TreeSwitcher.tsx, NewTreeModal.tsx
    CapsuleModal.tsx, CapsuleList.tsx, EchoCards.tsx, InterviewModal.tsx, StoryAudio.tsx, Avatar.tsx
    SharePanel.tsx        docked "Share with family" panel: sign-in, share tree, invite links, members/roles, join
scripts/rama-family.ts, scripts/hindu-gods.ts   generators for the data sets
supabase/schema.sql       database tables, row-level security, functions, realtime (run once in Supabase)
data/                     rama-family-tree.{json,ged}, hindu-gods-family-tree.{json,ged}, *-sources.md
public/                   PWA manifest, service worker, icons
OurFamilyTree.html        latest single-file build (what the owner opens)
android/, ios/            Capacitor native projects; assets/ holds icon + splash sources
.github/workflows/        ci.yml (check + build), pages.yml (GitHub Pages from main), mobile.yml (Android APK + iOS compile)
```

## 7. Store (`src/store.ts`)

**State:**

- `people`, `focusId`, `selectedId`, `view` (default `'today'`), `colorMode`, `filters`, `theme`
- `path` (highlighted trail on the tree)
- UI flags: `filtersOpen`, `paletteOpen`, `edit`, `newTreeOpen`, `capsuleUI`, `interview`
- `toast`, `toastUndo`, `past[]` (undo stack)
- `centerReq`, `spotlight`, `timeYear`
- `trees`, `activeTreeId`, `customPlaces`, `capsules`, `asked`
- `relPair {a, b|null} | null` and `relSlot 'a'|'b'` for the relation bar
- Sharing: `user {id,email,name} | null`, `shareOpen`, `sync {status, pending, error}`, `readOnly()` (active tree shared with you as viewer)

**Actions:**

- People: `upsert`, `addRelative` (notifies with Undo), `remove`, `addMedia`
- Undo and messages: `undo`, `notify(msg, {undo})`
- Trees: `importPeople` (creates a new tree), `createTree`, `switchTree`, `renameTree`, `deleteTree`, `resetSample`
- Places: `addPlace`
- Stories and capsules: `markAsked`, `addCapsule`, `openCapsule`, `deleteCapsule`
- Relations: `openRelation(b?)` sets relPair `{a: focusId, b}`, switches to the tree and clears the selection
- Selection: `select(id, center?)`, `setFocus`, `setFilters`, `set(partial)`

Any change that should be undoable calls the internal `remember()` first. Editing actions call `blocked()` first, which stops viewers (and hides the caller's follow-up "Saved" toast). `snapshot()` merges the working copy back into `trees`, and a subscribe callback persists to localStorage.

## 8. Tree view behaviour

- Cards: color bar for family line, avatar or initials, and name sized by `fitName`. If the name doesn't fit, given names go on line 1 and the surname on line 2. Below that are the life span and flag.
- **Semantic zoom:** when zoomed out, cards become colored initials.
- **+ handles** appear on hover, on the selected card, or after the first tap on touch: top adds a parent, bottom a child, right a partner, left a sibling. They open **QuickAdd**: name, F/M/? and year, then Enter. "Add + more details" opens EditModal.
- **Clicks:** a click while the relation bar is open fills a slot. On touch, the first tap arms the card and the second opens the profile. A double click makes that person the focus.
- **Tools at the top:** AskBar, Relations lens (kin labels on every card), Nearby (1–6 steps slider) and Journey (cinematic walk from the earliest ancestor).
- **Other features:** hover card (450 ms delay), minimap, generation bands, PNG/SVG export, and spotlight dimming.
- **Keyboard:** Ctrl+K palette, Ctrl+Z undo, F filters, R relations, 1–6 views, arrow keys walk the tree, Enter makes focus, Esc closes things.

## 9. Mobile (under 900 px)

- Navigation: a bottom nav (Today, Tree, Time, Stories, More), a filters bottom sheet and a full-screen profile.
- Touch: targets of at least 32–38 px, and inputs at 16 px so iOS doesn't zoom. The toast sits above the tab bar.
- Views: Wheel shows initials and taps zoom in; Timeline fits the whole history to the screen and taps a year; Map starts zoomed in and has jump-to chips.
- Tested with Playwright at 390×844 (`isMobile`, `hasTouch`): no horizontal overflow on any screen.

## 10. Conventions

- Plain, friendly English in the UI. Every action should be possible on touch.
- Prefer docked bars and inline cards over pop-up modals. The owner disliked the pop-up relationship finder.
- Every add, edit or delete should be undoable and show a toast with an Undo button.
- Keep new features filter-aware: use `matched` and `visible` from `useDerived()`.
- Verify UI changes with Playwright screenshots on desktop (1440×900) and phone (390×844 with touch). Chromium can open `file://…/dist-single/index.html` directly. Test data can be injected into localStorage under `kindred-tree-v1` with `addInitScript`.
- Update `README.md` (the user-facing feature guide) when features change.
- Never create files with `<a download>` directly: use `saveFile()` from `lib/native.ts` so it also works in the native apps. Use `openExternal()` for outside links. Respect `env(safe-area-inset-*)` for anything fixed to the screen edges.

## 11. History of what was built (in order)

1. Base app: tree, fan, wheel, timeline, map and insights views, filters, profiles, relationship finder, PWA, GEDCOM.
2. Lord Rama family tree data set with sources (Valmiki Ramayana), then a Hindu deities and epics GEDCOM (263 people).
3. Daily-return features: Today, Ask the elders (voice recording and transcription), Time machine, calendar export.
4. Multiple trees (create, switch, rename, delete), and imports create a new tree.
5. Places: "Lives in", life-event moves, custom places via OpenStreetMap lookup or map picker.
6. Time-capsule letters and Family echoes.
7. Interactive tree: + handles with QuickAdd, Ask your tree, Relations lens, Nearby, Journey, hover cards, undo.
8. Replaced the relationship pop-up with the docked RelationBar.
9. Mobile pass: search icon, toast position, tap sizes, iOS input zoom, and phone layouts for Wheel, Timeline and Map.
10. Long-name fix: names are measured and shortened or wrapped to fit (`lib/fitName.ts`), in both the tree and the fan chart.
11. GitHub repo `techtool4u/familytree` with Actions (CI, Pages deploy). Android and iOS apps via Capacitor, with share-sheet file saving, mic/photo permissions, safe-area insets, icons and splash.
12. Renamed from Kindred to OurFamilyTree (app ID `com.techtool4u.ourfamilytree`, `OurFamilyTree.html`). Storage keys keep the old name on purpose.
13. Family sharing with Supabase: email-code sign-in, Share panel, invite links (editor/viewer), live sync with offline queue, owner role management. Tested end to end (32 database-rule checks, 15 in-app checks with owner/editor/viewer browsers). Also fixed top-bar overflow on phone and desktop.

## 12. Known gaps and ideas

- Sharing gaps: no change history / suggestions queue yet; voice recordings, capsules and `asked` stay per device; photos are stored as data URLs inside person JSON (large). Supabase's built-in email only reaches the project's team, so family sign-in needs custom SMTP (Authentication → Emails → SMTP).
- Native apps exist (Capacitor) but are not yet signed or published to Google Play / the App Store (see `MOBILE.md`).
- Place lookup needs internet (Nominatim). The built-in gazetteer is small.
- Flag emoji show as letters ("IN") on Windows, which is a Windows font limitation.
- Possible next features: DNA match import, source citations per fact, record hints, and printing a poster-size tree.
