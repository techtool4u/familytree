import { useMemo, useState } from 'react';
import { useStore, useDerived } from '../store';
import { weeklyQuestion, questionsFor, isoWeek, shareText, type Question } from '../lib/questions';
import { age, isLiving, birthYear, fullName, relationship, possessive } from '../lib/graph';
import { Avatar } from '../components/Avatar';
import { StoryAudio } from '../components/StoryAudio';
import { CapsuleSection } from '../components/CapsuleList';
import { Mic, Send, Mail, Copy, Shuffle, Check, Search } from 'lucide-react';
import type { Person } from '../types';
import { openExternal } from '../lib/native';

export default function StoriesView() {
  const { people, ix, colorer, focusId } = useDerived();
  const asked = useStore((s) => s.asked);
  const { set, select, markAsked, notify } = useStore.getState();
  const [shuffles, setShuffles] = useState<Record<string, number>>({});
  const [showAll, setShowAll] = useState(false);
  const [q, setQ] = useState('');
  const week = useMemo(() => isoWeek(new Date()), []);
  const focus = ix.byId.get(focusId);

  const elders = useMemo(() => {
    const living = people.filter(isLiving).filter((p) => p.id !== focusId).sort((a, b) => birthYear(a) - birthYear(b));
    const older = living.filter((p) => age(p) >= 50);
    return older.length >= 3 ? older : living;
  }, [people, focusId]);

  /** A question already sent but not yet answered stays on the card until it's answered. */
  const cardFor = (p: Person): { q: Question | null; pending: boolean } => {
    const answered = new Set(p.media.map((m) => m.questionId));
    const all = questionsFor(p, ix);
    const pendingId = (asked[p.id] ?? []).filter((id) => !answered.has(id)).at(-1);
    const pq = pendingId ? all.find((x) => x.id === pendingId) : undefined;
    if (pq) return { q: pq, pending: true };
    return { q: weeklyQuestion(p, ix, asked[p.id] ?? [], week, shuffles[p.id] ?? 0), pending: false };
  };

  const stories = useMemo(() => people.flatMap((p) => p.media.filter((m) => m.kind === 'audio' || m.kind === 'story' || m.questionId).map((m) => ({ p, m })))
    .sort((a, b) => (b.m.recordedAt ?? String(b.m.year ?? 0)).localeCompare(a.m.recordedAt ?? String(a.m.year ?? 0))), [people]);
  const shown = stories.filter(({ p, m }) => !q || `${fullName(p)} ${m.title} ${m.note ?? ''}`.toLowerCase().includes(q.toLowerCase()));
  const voices = stories.filter((s) => s.m.audioKey).length;
  const eldersWithStory = new Set(stories.map((s) => s.p.id));
  const list = showAll ? elders : elders.slice(0, 6);

  const send = (p: Person, qq: Question, via: 'whatsapp' | 'email' | 'copy') => {
    const msg = shareText(p, qq, focus?.given);
    if (via === 'copy') { navigator.clipboard?.writeText(msg).then(() => notify('Message copied — paste it anywhere')).catch(() => notify('Copy failed — select the text manually')); }
    else if (via === 'whatsapp') openExternal(`https://wa.me/?text=${encodeURIComponent(msg)}`);
    else openExternal(`mailto:?subject=${encodeURIComponent(`A question for you, ${p.given} 🌳`)}&body=${encodeURIComponent(msg)}`);
    markAsked(p.id, qq.id);
  };

  return (
    <div className="view stories-view">
      <div className="today">
        <header className="today-head">
          <div>
            <div className="muted">One question a week · their voice, saved forever</div>
            <h1>Ask the elders 🎙️</h1>
          </div>
        </header>

        <div className="tiles">
          <div className="tile"><div className="tv">{stories.length}</div><div className="tl">Stories collected</div></div>
          <div className="tile"><div className="tv">{voices}</div><div className="tl">Voices recorded</div></div>
          <div className="tile"><div className="tv">{elders.filter((e) => eldersWithStory.has(e.id)).length}/{elders.length}</div><div className="tl">Elders with a story</div></div>
        </div>

        <h2 className="sec-title">This week’s questions</h2>
        <div className="ask-grid">
          {list.map((p) => {
            const { q: qq, pending } = cardFor(p);
            return (
              <div key={p.id} className={`ask-card ${pending ? 'pending' : ''}`}>
                <div className="ask-top">
                  <div className="ask-who" onClick={() => select(p.id)}>
                    <Avatar p={p} color={colorer.color(p.id)} size={42} />
                    <div><b>{fullName(p)}</b><br /><span className="muted">{age(p)} · {focus ? `${possessive(focus.given)} ${relationship(ix, focusId, p.id)}` : ''}</span></div>
                  </div>
                  {qq && !pending && <button className="icon-btn" onClick={() => setShuffles({ ...shuffles, [p.id]: (shuffles[p.id] ?? 0) + 1 })} title="Different question"><Shuffle size={16} /></button>}
                </div>
                {qq ? <>
                  <p className="quote">“{qq.text}”</p>
                  {qq.personal && <span className="pill strong">Personal to {p.given}</span>}
                  {pending && <span className="pill"><Check size={12} /> Sent — waiting for the answer</span>}
                  <div className="ask-actions">
                    <button className="btn sm primary" onClick={() => set({ interview: { personId: p.id, question: qq.text, questionId: qq.id } })}><Mic size={14} /> Record answer</button>
                    {!pending && <>
                      <button className="btn sm" onClick={() => send(p, qq, 'whatsapp')} title="Send on WhatsApp — they can reply with a voice note"><Send size={14} /> Send</button>
                      <button className="icon-btn" onClick={() => send(p, qq, 'email')} title="Send by email"><Mail size={16} /></button>
                      <button className="icon-btn" onClick={() => send(p, qq, 'copy')} title="Copy message"><Copy size={16} /></button>
                    </>}
                  </div>
                </> : <p className="muted">Every question answered — what a treasure! 🎉</p>}
              </div>
            );
          })}
        </div>
        {elders.length > 6 && <button className="link" onClick={() => setShowAll(!showAll)}>{showAll ? 'Show fewer' : `Show all ${elders.length} relatives`}</button>}
        {elders.length === 0 && <p className="muted">Add living relatives with birth years to start asking questions.</p>}

        <CapsuleSection />

        <div className="lib-head">
          <h2 className="sec-title">Story library</h2>
          <div className="searchbox"><Search size={15} /><input placeholder="Search stories…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        </div>
        {shown.length === 0 && <p className="muted">No stories yet. Record the first one above — it takes two minutes and lasts forever.</p>}
        <div className="story-list">
          {shown.map(({ p, m }) => (
            <article key={m.id} className="story-card">
              <button className="ask-who" onClick={() => select(p.id)}>
                <Avatar p={p} color={colorer.color(p.id)} size={34} />
                <span><b>{fullName(p)}</b><br /><span className="muted">{m.recordedAt ? new Date(m.recordedAt).toLocaleDateString() : m.year}</span></span>
              </button>
              <h4>{m.question ?? m.title}</h4>
              {m.audioKey && <StoryAudio audioKey={m.audioKey} />}
              {m.note && !/^https?:/.test(m.note) && <p className="transcript">{m.note}</p>}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
