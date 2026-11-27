# OurFamilyTree (web, Android and iPhone)

An interactive family tree built with React, TypeScript and D3. It runs in any modern browser, and the same build can be installed on a phone or desktop as a PWA. It comes loaded with a fictional five-generation, multi-country sample family (the Rossi, O'Brien, Chen and Wong lines), so every feature has something to show.

## Quick start

| What | How |
|---|---|
| **Just try it** | Double-click `OurFamilyTree.html`. It's one self-contained file and works offline. |
| Develop | `npm install`, then `npm run dev`, then open http://localhost:5173 |
| Build for hosting (PWA) | `npm run build`. Deploy the `dist/` folder to any static host (Netlify, Vercel, GitHub Pages, S3). Over HTTPS, browsers offer **Install app**. |
| Rebuild the single file | `npm run build:single` writes `dist-single/index.html` |
| **Android / iPhone apps** | `npm run android` or `npm run ios` opens the native project. A test Android APK is built by GitHub Actions on every push. See [MOBILE.md](MOBILE.md). |

**Start your own tree:** click the tree name next to the logo, then **+ New family tree**. Enter yourself (plus, optionally, your parents and partner). The new tree opens with your profile ready. Use **Add** on any profile to add parents, children, siblings or spouses. Every tree stays saved, so you can switch between them (or rename or delete them) from the same menu. Importing a JSON or GEDCOM file also creates a new tree instead of replacing one.

**Add where someone lives or lived:** open their profile and click **Edit**. Fill in *Birthplace*, *Place of death* and *Lives in* (their current or last home). For each move, go to the profile's **Life events → + Add a move, home or life event**: choose *Moved*, give the year and from/to places, and the move appears as an arc on the Map and in the Time machine. A place the app doesn't know yet shows **Not on the map yet**. Click **Find it** to look it up on OpenStreetMap (needs internet), or **Pick on map** to click the spot yourself. You only need to do this once per place name, and the location is saved with your trees.

Your edits are saved automatically in the browser's local storage. Use **⋯ → Export tree as JSON / GEDCOM** to back them up.

## Share with family

Several relatives can build the same tree together, on the web and in the phone apps.

1. Tap the **people icon** in the top bar and sign in with your name and email. You get a 6-digit code (or a link) by email; there are no passwords.
2. Open the tree you want to share and tap **Share this tree online**. You become its owner, and it keeps working offline.
3. Create an invite link **for editors** (can add and change people) or **for viewers** (can only look) and send it by WhatsApp, email or the phone's share sheet.
4. Relatives open the link, sign in, and the tree appears for them. In the phone apps they can paste the link under **Got an invite link?**

Changes show up for everyone within a second ("Ravi added Meera"). Edits made without a signal are kept on the device and sent when it reconnects. The dot on the people icon shows the state: green is up to date, amber is saving, grey is offline, red needs attention. As the owner you can switch members between *Can edit* and *Can view*, remove them, or turn an invite link off. Anyone else can leave a tree from the tree menu; the owner can delete it for everyone.

Voice recordings, time capsules and "asked" questions still stay on the device that made them.

## Extra data sets

- `data/rama-family-tree.json` / `.ged` is the family tree of Lord Rama (Ikshvaku dynasty) compiled from the Valmiki Ramayana. Load it with **⋯ → Import JSON or GEDCOM file**. Sources and research notes are in `data/rama-family-tree-sources.md`. To regenerate it, run `npx esbuild scripts/rama-family.ts --bundle --platform=node --outfile=/tmp/rama.cjs && node /tmp/rama.cjs`.

## Reasons to come back

- **Today** is the home screen. It shows:
  - a **Story of the day** (one per calendar day, so the whole family sees the same one);
  - **On this day** birthdays and remembrance days;
  - **At your age…**, where a slider shows what relatives were doing at any age;
  - this week's question for an elder, upcoming dates, and a teaser for tomorrow.
  - **Add family dates to my calendar** downloads a yearly `.ics` file of every birthday and remembrance day for Google, Apple or Outlook Calendar.
- **Stories (Ask the elders)** gives each older relative one question a week, tailored to their own life ("What do you remember about the day you left Hong Kong for San Francisco in 1957?"). Send it on WhatsApp or by email, or copy it. Then use **Record answer** to record their voice in the app (with live transcription in Chrome or Edge) or paste in the transcript of the voice note they sent back. Stories are saved to the person's profile and collected in a searchable library.
- **Time machine**: pick any year (or press **Travel**) to see who was alive, how old everyone was, where they lived, what happened in the family that year, and what was happening in the world. **Show on the tree** filters the tree to that year.

- **Time capsules** let you write a letter, with an optional voice message, to anyone in the tree, sealed until a future day: their 18th birthday, "10 years from now", or any date. Sealed letters show only the envelope and a countdown. When the day comes, the letter appears on **Today** and opens with an envelope animation. Find them under **Stories → Time capsules** or the **✉️ Letter** button on a profile. The sample family includes one already unlocked, from Antonio to Maya. The seal is a promise kept by the app, not encryption: the text is stored in the browser.
- **Family echoes** (top of **Insights**, plus a daily "Did you know?" on Today) are patterns found automatically across generations: names handed down, jobs passed from parent to child, generations born in the same town, shared birthdays and twins, someone born on a relative's remembrance day, long lives, how many people moved, changes in lifespan and in the age of becoming a parent, couples who were already related, and the biggest family. **Show on tree** highlights the people involved.

Voice recordings are stored in the browser's IndexedDB on that device. JSON export includes the transcripts but not the audio files.

- `data/hindu-gods-family-tree.ged` / `.json` covers the major Hindu deities and the epic dynasties: 263 people, including the Rama tree, with sources and notes in `data/hindu-gods-family-tree-sources.md`. To regenerate it, run `npx esbuild scripts/hindu-gods.ts --bundle --platform=node --outfile=/tmp/gods.cjs && node /tmp/gods.cjs`.

## Interactive tree tools

- **Grow the tree on the canvas:** hover over a card (or tap it once on a phone) and press a **+** handle: top adds a parent, bottom a child, right a partner, left a brother or sister. A small card opens right there. Type the name, pick F or M, optionally give a birth year, and press Enter. **Add + more details** opens the full form.
- **Undo anything:** every add, edit and delete can be undone with the **Undo** link in the message or **Ctrl+Z**.
- **Ask your tree** in plain English, using the box at the top of the tree. For example: *my cousins*, *Lily's grandchildren*, *born in Naples*, *living women and born in Boston*, *nurses*, *born before 1900*, *oldest living*, *how is Maya related to Sofia*. Matching people light up, the view zooms to them, and relationship questions draw the connecting path.
- **Relations lens:** label every card with how that person is related to the focus person (grandmother, 1st cousin once removed, sister-in-law…).
- **Nearby:** shrink a big tree to the people within 1–6 family steps of one person, with a slider. **Center on…** moves the circle to whoever you selected.
- **Journey:** a guided, cinematic walk from your earliest known ancestor down each generation to you. The camera flies card to card with a short story for each person, and you can play, pause, skip or end it. Select someone first to walk the path between them and the focus person.
- **How are they related?** (from a profile, the toolbar fork icon or the **R** key) opens a bar docked at the bottom of the tree instead of a pop-up. The connecting line is drawn on the tree, with the answer in plain words, each step labelled (father, son, wife…) and the shared ancestor named. Click any card on the tree to compare with someone else.
- **Hover cards:** rest the pointer on a card to preview the person's relationship to you, places, job and key life events without opening the profile.

## Views

1. **Tree**: an hourglass family graph with couples side by side and generation bands. Pan, zoom, fit and center-on-focus. **Semantic zoom** turns cards into colored initials when you zoom out. Includes a **minimap**, hover highlighting of immediate kin, animated re-layout, and PNG/SVG export and print.
2. **Fan chart**: ancestors in concentric arcs, 2–7 generations. Empty slots appear as "+ father / + mother", so research gaps are easy to spot and you can click one to add the person.
3. **Wheel**: a radial descendant tree for any founding couple.
4. **Timeline**: lifespan bars grouped by family line or generation, with marriage, migration, service, school and career markers. World-event bands are in the background, and hovering any year shows **how many relatives were alive then**.
5. **Map**: birthplaces sized by count and migration arcs colored by family line. **Play history** animates the family spreading across the world year by year. Click a place to see who was born, moved or died there.
6. **Insights**: stat tiles, births by decade, family-line, surname and country breakdowns, upcoming birthdays, records, and a research to-do list.

## Visual filters

- **Highlight or hide**: non-matches either fade out or are removed, and the tree re-lays itself out.
- **Color by**: family line (the four grandparent lines plus immediate family and married-in), birth surname, birth country, generation, age reached, or gender. Click a legend entry to filter by it.
- **Quick views**: Living relatives, Immigrants, Direct line, Paternal side, Maternal side, Born before 1920, Women of the family, Served in the military.
- **Scope relative to the focus person**: Everyone, Hourglass, Ancestors, Descendants, or Direct line + siblings.
- Range sliders for **generations** and **birth years**; status (living or deceased); gender; chips for family line, surname (including maiden names), birth country and tags; plus free-text search across names, places, occupations and tags.
- All filters apply across every view, including the Insights statistics.

## People and relationships

- **Profile drawer** with Overview (story and facts), Life events (with age at each event), Family (clickable parents, spouses, siblings and children, each labeled with their relationship to you) and Media (photo uploads, a lightbox, and "use as profile photo").
- **Relationship finder**: pick any two people to get the exact term ("2nd cousin once removed", "great-grandmother", "sister-in-law"), the reverse term, and the connection path. **Show path on tree** draws an animated trail through the tree.
- Add a parent, spouse, child or sibling straight from a profile. You can edit or remove anyone.
- **Focus person**: double-click anyone to re-center the whole app (relationships, family lines, fan chart) on them.

## Power-user features

- `⌘K` / `Ctrl+K` or `/` opens the **command palette** for people search, views and actions.
- `1`–`6` switch views, `F` toggles filters, `R` opens the relationship finder, the arrow keys walk the tree (up = parent, down = child, left/right = siblings), `Enter` makes the selected person the focus, and `Esc` closes things.
- Light and dark themes, a reduced-motion setting, and a print stylesheet.
- **Import and export** in JSON or GEDCOM 5.5 (works with Ancestry, FamilySearch, MyHeritage, Gramps exports).

## Mobile app layout

Under 900 px wide, the views move to a bottom tab bar (Today, Tree, Time, Stories, More), filters open as a bottom sheet, and profiles open full-screen. On the tree, tap a card once to show its + handles and tap again to open the profile. Buttons are sized for thumbs, text fields use 16 px text so iOS does not zoom in, messages sit above the tab bar, and touch pan and pinch-zoom work in every view. Tested at 390×844 (iPhone 14 size) with no sideways scrolling on any screen.

- **Wheel on a phone:** the rings fill the screen and people show as initials. Tap anyone to zoom in to their branch with full names, and use **Show whole wheel** to zoom back out.
- **Timeline on a phone:** opens with the whole family history fitted to the screen (first names, decade labels thinned out). Use the Zoom slider to spread it out, and tap any year to see how many relatives were alive then.
- **Map:** a row of **jump-to chips** (🌍 World, Boston 19, Naples 18…) flies to each family place and opens its list of people. On a phone the map starts zoomed in on where most of the family lived.

## Project structure

```
src/
  App.tsx                 shell, top bar, shortcuts, import/export
  store.ts                Zustand state + derived graph data (useDerived)
  types.ts
  data/sample.ts          fictional sample family
  data/places.ts          gazetteer used by the map (add your own towns here)
  lib/graph.ts            indexes, generations, relationship engine, family lines, filters, colors
  lib/layout.ts           layered couple layout (barycenter ordering + isotonic placement)
  lib/gedcom.ts           GEDCOM import/export
  components/             FilterPanel, ProfileDrawer, RelFinder, EditModal, CommandPalette, Avatar
  views/                  TreeView, FanView, RadialView, TimelineView, MapView, InsightsView
public/                   PWA manifest, service worker, icons
android/, ios/            native app projects (Capacitor), see MOBILE.md
```

## Ideas for a next step

- Sharing next steps: change history with undo, suggestions from viewers with an approval queue, shared voice recordings and photos.
- Publish the Android and iPhone apps to Google Play and the App Store (see [MOBILE.md](MOBILE.md)).
- DNA match import, source citations per fact, and auto-suggested record hints.
- Geocoding for any place name (the map currently uses the built-in gazetteer in `data/places.ts`).
