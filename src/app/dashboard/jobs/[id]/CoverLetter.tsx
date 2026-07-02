'use client';
import { useMemo, useState, useTransition } from 'react';
import { Sparkle, Check, X, CopySimple, FloppyDisk } from '@phosphor-icons/react';
import type { LetterPoint } from '@/lib/letter/types';
import { suggestLetterPointsAction, generateLetterAction, saveCoverLetterAction } from './letter/actions';

interface Props {
  jobId: string;
  tracks: { id: string; name: string }[];
  existingLetters: { track_id: string; points: LetterPoint[]; body: string }[];
}

export function CoverLetter({ jobId, tracks, existingLetters }: Props) {
  const savedByTrack = useMemo(
    () => new Map(existingLetters.map((l) => [l.track_id, l])),
    [existingLetters],
  );

  const [trackId, setTrackId] = useState(tracks[0]?.id ?? '');
  const [points, setPoints] = useState<LetterPoint[] | null>(savedByTrack.get(tracks[0]?.id ?? '')?.points ?? null);
  const [accepted, setAccepted] = useState<boolean[]>(() => (points ?? []).map(() => true));
  const [body, setBody] = useState(savedByTrack.get(tracks[0]?.id ?? '')?.body ?? '');
  const [cleanBody, setCleanBody] = useState(body); // last generated/saved body — dirty check
  const [status, setStatus] = useState<'idle' | 'copied' | 'saved'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function selectTrack(id: string) {
    setTrackId(id);
    setError(null);
    setStatus('idle');
    const saved = savedByTrack.get(id);
    setPoints(saved?.points ?? null);
    setAccepted((saved?.points ?? []).map(() => true));
    setBody(saved?.body ?? '');
    setCleanBody(saved?.body ?? '');
  }

  const acceptedPoints = (points ?? []).filter((_, i) => accepted[i]);

  function suggest() {
    setError(null); setStatus('idle');
    startTransition(async () => {
      const res = await suggestLetterPointsAction(jobId, trackId);
      if ('error' in res) { setError(res.error); return; }
      setPoints(res.points);
      setAccepted(res.points.map(() => true));
    });
  }

  function generate() {
    if (body.trim() && body !== cleanBody) {
      if (!window.confirm('Overwrite your unsaved edits with a new letter?')) return;
    }
    setError(null); setStatus('idle');
    startTransition(async () => {
      const res = await generateLetterAction(jobId, trackId, JSON.stringify(acceptedPoints));
      if ('error' in res) { setError(res.error); return; }
      setBody(res.body);
      setCleanBody(res.body);
    });
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await saveCoverLetterAction(jobId, trackId, JSON.stringify(acceptedPoints), body);
      if ('error' in res) { setError(res.error); return; }
      setCleanBody(body);
      setStatus('saved');
    });
  }

  async function copy() {
    await navigator.clipboard.writeText(body);
    setStatus('copied');
  }

  return (
    <section className="app-card flex flex-col gap-5 p-5">
      <h2 className="section-title">Cover letter</h2>

      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="letter-track" className="field-label !mb-0">Track</label>
        <select id="letter-track" value={trackId} onChange={(e) => selectTrack(e.target.value)} className="field !w-auto">
          {tracks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <button type="button" onClick={suggest} disabled={isPending || !trackId} className="btn btn-primary">
          <Sparkle className="h-4 w-4" weight="fill" />
          {isPending && !points ? 'Thinking…' : 'Suggest points'}
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}

      {points && points.length === 0 && (
        <div className="empty-state">No grounded talking points found for this track — add entries or curate the track first.</div>
      )}

      {points && points.length > 0 && (
        <>
          <ul className="flex flex-col gap-3">
            {points.map((p, i) => (
              <li
                key={`${p.entry_id}:${i}`}
                className={`rounded-2xl border p-4 text-sm transition-all duration-200 ${
                  accepted[i]
                    ? 'border-[var(--accent)]/40 bg-[var(--accent-tint)]/35'
                    : 'border-[var(--line)] opacity-55'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[var(--ink)]">{p.text}</p>
                    <p className="mt-2 text-xs text-[var(--ink-soft)]">{p.reason}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAccepted((prev) => prev.map((v, j) => (j === i ? !v : v)))}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                      accepted[i]
                        ? 'bg-[var(--accent)] text-white'
                        : 'border border-[var(--line)] text-[var(--ink-soft)] hover:text-[var(--ink)]'
                    }`}
                  >
                    {accepted[i] ? (<><Check className="h-3.5 w-3.5" weight="bold" /> Accepted</>) : (<><X className="h-3.5 w-3.5" weight="bold" /> Rejected</>)}
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center gap-3 border-t border-[var(--line)]/60 pt-4">
            <button type="button" onClick={generate} disabled={isPending || acceptedPoints.length === 0} className="btn btn-primary">
              {isPending ? 'Writing…' : 'Generate letter'}
            </button>
          </div>
        </>
      )}

      {(body || cleanBody) && (
        <div className="flex flex-col gap-3">
          <textarea
            value={body}
            onChange={(e) => { setBody(e.target.value); setStatus('idle'); }}
            rows={16}
            className="field leading-relaxed"
            aria-label="Cover letter text"
          />
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={save} disabled={isPending || !body.trim()} className="btn btn-primary">
              <FloppyDisk className="h-4 w-4" />
              {status === 'saved' ? 'Saved' : 'Save'}
            </button>
            <button type="button" onClick={copy} disabled={!body.trim()} className="action-link inline-flex items-center gap-1.5 disabled:opacity-50">
              <CopySimple className="h-4 w-4" />
              {status === 'copied' ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
