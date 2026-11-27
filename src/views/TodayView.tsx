import { useMemo, useState } from 'react';
import { useStore, useDerived } from '../store';
import { onThisDay, upcoming, remembranceThisMonth, storyOfDay, atAge, toICS } from '../lib/daily';
import { weeklyQuestion, isoWeek } from '../lib/questions';
import { age, isLiving, fullName, birthYear, inkOn } from '../lib/graph';
import { flagOf } from '../data/places';
import { Avatar } from '../components/Avatar';
import { CapsuleToday } from '../components/CapsuleList';
import { EchoCard, useEchoes } from '../components/EchoCards';
import { dayIndex } from '../lib/daily';
import { CalendarPlus, Shuffle, Hourglass, Mic, ArrowRight, Sparkles } from 'lucide-react';
import { saveFile, isNativeApp } from '../lib/native';

const greet = (h: number) => (h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening');
const ago = (n?: number) => (n === undefined ? '' : n === 0 ? 'This year' : n === 1 ? '1 year ago' : `${n} years ago`);

export default function TodayView() {
  const { people, ix, colorer, focusId } = useDerived();
  const { select, set, notify } = useStore.getState();
  const asked = useStore((s) => s.asked);
  const now = useMemo(() => new Date(), []);
  const focus = ix.byId.get(focusId);
  const [shift, setShift] = useState(0);
  const focusAge = focus && isLiving(focus) ? age(focus) : 30;
  const [ageSel, setAgeSel] = useState(Number.isFinite(focusAge) ? focusAge : 30);

  const story = useMemo(() => storyOfDay(people, now, shift), [people, now, shift]);
  const today = useMemo(() => onThisDay(people, now), [people, now]);
  const tomorrow = useMemo(() => onThisDay(people, now, 1), [people, now]);
  const soon = useMemo(() => upcoming(people, now, 21).filter((u) => u.living || u.kind === 'death').slice(0, 6), [people, now]);
  const remember = useMemo(() => remembranceThisMonth(people, now), [people, now]);
  const moments = useMemo(() => atAge(people, ix, ageSel, focusId), [people, ix, ageSel, focusId]);
  const elder = useMemo(() => {
    const week = isoWeek(now);
    return people.filter((p) => isLiving(p) && age(p) >= 50).sort((a, b) => birthYear(a) - birthYear(b))
      .map((p) => ({ p, q: weeklyQuestion(p, ix, asked[p.id] ?? [], week) })).find((x) => x.q);
  }, [people, ix, asked, now]);

  const meetRandom = () => {
    const pool = people.filter((p) => !isLiving(p) && (p.bio || p.events.length > 1));
    const p = (pool.length ? pool : people)[Math.floor(Math.random() * (pool.length || people.length))];
    if (p) { select(p.id); notify(`Meet ${fullName(p)}`); }
  };
  const downloadICS = () => {
    saveFile('family-birthdays.ics', toICS(people), 'text/calendar')
      .then(() => notify(isNativeApp() ? 'Calendar file ready — open it to add every birthday & anniversary' : 'Calendar file downloaded — open it to add every birthday & anniversary'))
      .catch(() => notify('Could not save the calendar file'));
  };
  const col = story ? colorer.color(story.p.id) : 'var(--accent)';
  const echoes = useEchoes();
  const echo = echoes.length ? echoes[dayIndex(now) % Math.min(echoes.length, 12)] : undefined;
  const noDates = !people.some((p) => p.birthDate && p.birthDate.length >= 10);
  const noYears = !people.some((p) => !isNaN(birthYear(p)));

  return (
    <div className="view today-view">
      <div className="today">
        <header className="today-head">
          <div>
            <div className="muted">{now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
            <h1>{greet(now.getHours())}{focus ? `, ${focus.given}` : ''} 🌿</h1>
          </div>
          <div className="row" style={{ marginTop: 0 }}>
            <button className="btn sm" onClick={meetRandom}><Shuffle size={14} /> Meet a random ancestor</button>
            <button className="btn sm" onClick={downloadICS} title="Download an .ics file with every birthday and remembrance day, repeating yearly"><CalendarPlus size={14} /> Add family dates to my calendar</button>
          </div>
        </header>

        <CapsuleToday />

        {story && (
          <section className="story-hero" style={{ ['--hero' as string]: col }}>
            <div className="sh-eyebrow"><Sparkles size={14} /> Story of the day{story.yearsAgo !== undefined ? ` · ${ago(story.yearsAgo)}` : ''}</div>
            <div className="sh-body">
              <button className="sh-avatar" onClick={() => select(story.p.id)} aria-label={`Open ${fullName(story.p)}`}><Avatar p={story.p} color={col} size={76} /></button>
              <div>
                <p className="sh-text">{story.year && story.type !== 'bio' ? <><b>{story.year}.</b> </> : story.type === 'bio' ? <><b>Meet {fullName(story.p)}.</b> </> : null}{story.text}</p>
                {(story.place || story.toPlace) && <div className="sh-place">{flagOf(story.place)} {story.place}{story.toPlace ? <> &nbsp;→&nbsp; {flagOf(story.toPlace)} {story.toPlace}</> : ''}</div>}
                <div className="row">
                  <button className="btn sm primary" style={{ background: col, color: inkOn(col) }} onClick={() => select(story.p.id)}>Read {story.p.given}’s story <ArrowRight size={14} /></button>
                  {story.year && <button className="btn sm" onClick={() => set({ view: 'time', timeYear: story.year! })}><Hourglass size={14} /> See the family in {story.year}</button>}
                  <button className="btn sm ghost" onClick={() => setShift(shift + 1)}><Shuffle size={14} /> Another story</button>
                </div>
              </div>
            </div>
          </section>
        )}

        <div className="today-grid">
          <section className="card-box">
            <h3>On this day · {now.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}</h3>
            {today.length === 0 && <p className="muted">{noDates ? 'Add full birth dates (YYYY-MM-DD) to people to unlock daily anniversaries.' : 'Nothing recorded on this exact day — yet.'}</p>}
            {today.map((it) => (
              <button key={it.p.id + it.kind} className="row-btn" onClick={() => select(it.p.id)}>
                <Avatar p={it.p} color={colorer.color(it.p.id)} size={34} />
                <span className="grow">
                  {it.kind === 'birth' && it.living && <><b>{it.p.given} turns {it.years} today</b> 🎂<br /><span className="muted">Send some love</span></>}
                  {it.kind === 'birth' && !it.living && <><b>{fullName(it.p)}</b> was born on this day in {it.date.slice(0, 4)}<br /><span className="muted">{it.years} years ago{it.p.birthPlace ? ` · ${it.p.birthPlace}` : ''}</span></>}
                  {it.kind === 'death' && <><b>Remembering {fullName(it.p)}</b> 🕯️<br /><span className="muted">{it.years} year{it.years === 1 ? '' : 's'} ago today</span></>}
                </span>
              </button>
            ))}
          </section>

          {!noYears && <section className="card-box at-age">
            <h3>At {ageSel}, your family was…</h3>
            <div className="age-row">
              <input type="range" min={5} max={95} value={ageSel} onChange={(e) => setAgeSel(+e.target.value)} aria-label="Age" />
              <span className="pill">{focus && isLiving(focus) && ageSel === focusAge ? `your age now` : `age ${ageSel}`}</span>
            </div>
            {moments.length === 0 && <p className="muted">No recorded moments around age {ageSel}. Try another age — or add life events to relatives.</p>}
            {moments.map((m) => (
              <button key={m.p.id + m.year} className="row-btn" onClick={() => select(m.p.id)}>
                <Avatar p={m.p} color={colorer.color(m.p.id)} size={34} />
                <span className="grow"><b>{m.text}</b><br /><span className="muted">{m.year}{m.exact ? '' : ' · around that age'}</span></span>
              </button>
            ))}
          </section>}

          {echo && (
            <section className="card-box did-you-know">
              <h3>💡 Did you know?</h3>
              <EchoCard e={echo} compact />
              <button className="link" onClick={() => set({ view: 'insights' })}>See all family echoes →</button>
            </section>
          )}

          {elder?.q && (
            <section className="card-box ask-mini">
              <h3><Mic size={15} /> This week, ask {elder.p.given}</h3>
              <div className="row-btn static">
                <Avatar p={elder.p} color={colorer.color(elder.p.id)} size={40} />
                <span className="grow quote">“{elder.q.text}”</span>
              </div>
              <div className="row">
                <button className="btn sm primary" onClick={() => set({ view: 'stories' })}>Ask or record the answer <ArrowRight size={14} /></button>
              </div>
              <p className="muted small">Their voice, saved forever in the tree. One question a week is plenty.</p>
            </section>
          )}

          {!noDates && <section className="card-box">
            <h3>Coming up</h3>
            {soon.length === 0 && <p className="muted">Nothing in the next three weeks.</p>}
            {soon.map((u) => (
              <button key={u.p.id + u.kind} className="row-btn" onClick={() => select(u.p.id)}>
                <Avatar p={u.p} color={colorer.color(u.p.id)} size={30} />
                <span className="grow">{u.kind === 'birth' ? <><b>{u.p.given}</b> turns {u.years}</> : <>Remembering <b>{u.p.given}</b> · {u.years} yrs</>}</span>
                <span className="pill">{u.inDays === 1 ? 'tomorrow' : `in ${u.inDays} days`}</span>
              </button>
            ))}
          </section>}

          {remember.length > 0 && (
            <section className="card-box">
              <h3>Remembering this month 🕯️</h3>
              {remember.map((r) => (
                <button key={r.p.id} className="row-btn" onClick={() => select(r.p.id)}>
                  <Avatar p={r.p} color={colorer.color(r.p.id)} size={30} />
                  <span className="grow"><b>{fullName(r.p)}</b><br /><span className="muted">{now.toLocaleDateString(undefined, { month: 'short' })} {r.day} · {r.years} years</span></span>
                </button>
              ))}
            </section>
          )}
        </div>

        <p className="tomorrow">🌙 {tomorrow.length ? `Tomorrow: ${tomorrow.length} family anniversar${tomorrow.length === 1 ? 'y' : 'ies'} and a new story.` : 'Tomorrow brings a new story from the family.'} See you then.</p>
      </div>
    </div>
  );
}
