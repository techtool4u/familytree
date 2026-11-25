import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore, useDerived } from '../store';
import { questionsFor } from '../lib/questions';
import { putBlob } from '../lib/idb';
import { uid, fullName } from '../lib/graph';
import { Avatar } from './Avatar';
import { X, Mic, Square, RotateCcw } from 'lucide-react';

type SR = { start: () => void; stop: () => void; onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null; onend: (() => void) | null; continuous: boolean; interimResults: boolean; lang: string };

export default function InterviewModal() {
  const iv = useStore((s) => s.interview)!;
  const { ix, colorer } = useDerived();
  const { set, addMedia, markAsked, notify } = useStore.getState();
  const p = ix.byId.get(iv.personId)!;
  const qs = useMemo(() => questionsFor(p, ix), [p, ix]);
  const [qid, setQid] = useState(iv.questionId);
  const [qText, setQText] = useState(iv.question);
  const [rec, setRec] = useState<'idle' | 'recording' | 'done'>('idle');
  const [secs, setSecs] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [interim, setInterim] = useState('');
  const [err, setErr] = useState('');
  const mr = useRef<MediaRecorder | null>(null);
  const sr = useRef<SR | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const SpeechRec = (window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR }).SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: new () => SR }).webkitSpeechRecognition;

  useEffect(() => () => { mr.current?.stream.getTracks().forEach((t) => t.stop()); sr.current?.stop(); if (timer.current) clearInterval(timer.current); }, []);

  const start = async () => {
    setErr('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: Blob[] = [];
      const m = new MediaRecorder(stream);
      m.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      m.onstop = () => {
        const b = new Blob(chunks, { type: m.mimeType || 'audio/webm' });
        setBlob(b); setPreview(URL.createObjectURL(b)); setRec('done');
        stream.getTracks().forEach((t) => t.stop());
      };
      m.start(); mr.current = m; setRec('recording'); setSecs(0);
      timer.current = setInterval(() => setSecs((s) => s + 1), 1000);
      if (SpeechRec) {
        const r = new SpeechRec(); r.continuous = true; r.interimResults = true; r.lang = navigator.language || 'en-US';
        r.onresult = (e) => {
          let fin = '', mid = '';
          for (let i = e.resultIndex; i < e.results.length; i++) (e.results[i].isFinal ? (fin += e.results[i][0].transcript) : (mid += e.results[i][0].transcript));
          if (fin) setText((t) => (t ? t.trimEnd() + ' ' : '') + fin.trim());
          setInterim(mid);
        };
        r.onend = () => setInterim('');
        try { r.start(); sr.current = r; } catch { /* transcription optional */ }
      }
    } catch {
      setErr('Microphone not available or blocked. You can still type their answer below.');
    }
  };
  const stop = () => { mr.current?.stop(); sr.current?.stop(); if (timer.current) clearInterval(timer.current); };
  const reset = () => { setBlob(null); setPreview(null); setRec('idle'); setSecs(0); };

  const save = async () => {
    if (!blob && !text.trim()) return;
    let audioKey: string | undefined;
    if (blob) { audioKey = 'rec-' + uid(); try { await putBlob(audioKey, blob); } catch { audioKey = undefined; notify('Could not store the audio in this browser — saved the text only'); } }
    addMedia(p.id, { id: uid(), kind: audioKey ? 'audio' : 'story', title: qText, question: qText, questionId: qid, note: text.trim() || undefined, audioKey, year: new Date().getFullYear(), recordedAt: new Date().toISOString() });
    markAsked(p.id, qid);
    notify(`Story saved to ${p.given}’s profile 💛`);
    set({ interview: null });
  };
  const mmss = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;

  return (
    <div className="modal-bg" onClick={() => rec !== 'recording' && set({ interview: null })}>
      <div className="modal interview" role="dialog" aria-label="Record a story" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <Avatar p={p} color={colorer.color(p.id)} size={36} />
          <h3>Interview with {fullName(p)}</h3><span className="grow" />
          <button className="icon-btn" onClick={() => { stop(); set({ interview: null }); }} aria-label="Close"><X size={18} /></button>
        </div>
        <label className="f-label">Question</label>
        <select className="full" value={qid} onChange={(e) => { const q = qs.find((x) => x.id === e.target.value)!; setQid(q.id); setQText(q.text); }}>
          {!qs.some((q) => q.id === qid) && <option value={qid}>{qText}</option>}
          <optgroup label={`About ${p.given}’s life`}>{qs.filter((q) => q.personal).map((q) => <option key={q.id} value={q.id}>{q.text}</option>)}</optgroup>
          <optgroup label="Good questions for anyone">{qs.filter((q) => !q.personal).map((q) => <option key={q.id} value={q.id}>{q.text}</option>)}</optgroup>
        </select>
        <p className="iv-question">“{qText}”</p>

        <div className={`rec-box ${rec}`}>
          {rec === 'idle' && <button className="rec-btn" onClick={start} aria-label="Start recording"><Mic size={28} /></button>}
          {rec === 'recording' && <button className="rec-btn live" onClick={stop} aria-label="Stop recording"><Square size={24} /></button>}
          {rec === 'done' && preview && <audio controls src={preview} className="story-audio" />}
          <div className="rec-meta">
            {rec === 'idle' && <><b>Tap to record</b><br /><span className="muted">Hold the phone between you. Let them talk — follow-up questions are gold.</span></>}
            {rec === 'recording' && <><b className="rec-dot">● Recording {mmss}</b><br /><span className="muted">{SpeechRec ? 'Transcribing as they speak…' : 'Tap stop when they’re done.'}</span></>}
            {rec === 'done' && <><b>Recorded {mmss}</b> <button className="link" onClick={reset}><RotateCcw size={13} /> Re-record</button></>}
          </div>
        </div>
        {err && <p className="err">{err}</p>}

        <label className="f-label" style={{ marginTop: 14 }}>What they said {SpeechRec ? '(auto-transcribed — edit freely)' : '(transcript or notes)'}</label>
        <textarea className="iv-text" rows={5} value={text + (interim ? (text ? ' ' : '') + interim : '')} onChange={(e) => setText(e.target.value)} placeholder="Type their answer, or paste a voice-note transcript they sent you…" />
        <div className="row end">
          <button className="btn" onClick={() => set({ interview: null })} disabled={rec === 'recording'}>Cancel</button>
          <button className="btn primary" onClick={save} disabled={rec === 'recording' || (!blob && !text.trim())}>Save to {p.given}’s story</button>
        </div>
      </div>
    </div>
  );
}
