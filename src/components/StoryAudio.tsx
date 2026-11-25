import { useEffect, useState } from 'react';
import { getBlob } from '../lib/idb';

/** Plays a voice recording stored in IndexedDB. */
export function StoryAudio({ audioKey }: { audioKey: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    let u: string | null = null;
    getBlob(audioKey).then((b) => { if (b) { u = URL.createObjectURL(b); setUrl(u); } else setMissing(true); });
    return () => { if (u) URL.revokeObjectURL(u); };
  }, [audioKey]);
  if (missing) return <p className="muted small">🎙️ Recording saved on another device or browser.</p>;
  return url ? <audio className="story-audio" controls src={url} preload="metadata" /> : <p className="muted small">Loading recording…</p>;
}
