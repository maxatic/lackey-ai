'use client';
import { useMemo, useState, useTransition } from 'react';
import { Check, X, Sparkle, FilePdf } from '@phosphor-icons/react';
import { CV_LOCALES, type CvLocale } from '@/lib/cv/types';
import type { CvSuggestions } from '@/lib/cv/suggest';
import type { TrackSnapshot } from '@/lib/cv/data';
import { suggestTailoringAction, generateNodeCvAction } from './tailor/actions';
import { getSignedDownloadUrl } from '../../tracks/[id]/generate-cv/actions'; // server actions are importable across routes

interface Props {
  jobId: string;
  tracks: { id: string; name: string }[];
  existingDocs: { locale: string; track_id: string; storage_path: string; updated_at: string }[];
}

type Card =
  | { key: string; type: 'ordering'; label: string; reason: string }
  | { key: string; type: 'exclude'; label: string; reason: string }
  | { key: string; type: 'rewrite'; label: string; before: string; after: string; reason: string };

function buildCards(s: CvSuggestions, snap: TrackSnapshot): Card[] {
  const entryTitle = new Map(snap.entries.map((e) => [e.id, e.title]));
  const skillName = new Map(snap.skills.map((sk) => [sk.id, sk.name]));
  const bulletText = new Map(snap.entries.flatMap((e) => e.bullets.map((b) => [b.id, b.text] as const)));
  const cards: Card[] = [];
  if (s.entry_order.length > 0) {
    cards.push({ key: 'entry_order', type: 'ordering', reason: 'Most JD-relevant first', label: `Reorder entries: ${s.entry_order.map((id) => entryTitle.get(id) ?? id).join(' → ')}` });
  }
  for (const id of s.entry_exclude) {
    cards.push({ key: `entry_exclude:${id}`, type: 'exclude', reason: 'Not relevant to this job', label: `Drop entry “${entryTitle.get(id) ?? id}”` });
  }
  if (s.skill_order.length > 0) {
    cards.push({ key: 'skill_order', type: 'ordering', reason: 'Most JD-relevant first', label: `Reorder skills: ${s.skill_order.map((id) => skillName.get(id) ?? id).join(', ')}` });
  }
  for (const id of s.skill_exclude) {
    cards.push({ key: `skill_exclude:${id}`, type: 'exclude', reason: 'Not relevant to this job', label: `Drop skill “${skillName.get(id) ?? id}”` });
  }
  for (const r of s.bullet_rewrites) {
    cards.push({ key: `rewrite:${r.bullet_id}`, type: 'rewrite', label: 'Reword bullet', before: bulletText.get(r.bullet_id) ?? '', after: r.suggested_text, reason: r.reason });
  }
  if (s.summary_rewrite) cards.push({ key: 'summary', type: 'rewrite', label: 'Reword summary', before: snap.track.summary ?? '', after: s.summary_rewrite.suggested_text, reason: s.summary_rewrite.reason });
  if (s.headline_rewrite) cards.push({ key: 'headline', type: 'rewrite', label: 'Reword headline', before: snap.profile.headline ?? '', after: s.headline_rewrite.suggested_text, reason: s.headline_rewrite.reason });
  return cards;
}

function toOverrides(s: CvSuggestions, accepted: Set<string>) {
  return {
    ...(accepted.has('entry_order') ? { entry_order: s.entry_order } : {}),
    entry_exclude: s.entry_exclude.filter((id) => accepted.has(`entry_exclude:${id}`)),
    ...(accepted.has('skill_order') ? { skill_order: s.skill_order } : {}),
    skill_exclude: s.skill_exclude.filter((id) => accepted.has(`skill_exclude:${id}`)),
    bullet_rewrites: s.bullet_rewrites.filter((r) => accepted.has(`rewrite:${r.bullet_id}`)),
    ...(s.summary_rewrite && accepted.has('summary') ? { summary_rewrite: s.summary_rewrite } : {}),
    ...(s.headline_rewrite && accepted.has('headline') ? { headline_rewrite: s.headline_rewrite } : {}),
  };
}

function RedownloadButton({ storagePath }: { storagePath: string }) {
  const [isPending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        start(async () => {
          const { url } = await getSignedDownloadUrl(storagePath);
          window.open(url, '_blank');
        })
      }
      className="action-link disabled:opacity-50"
    >
      {isPending ? 'Signing…' : 'Download'}
    </button>
  );
}

export function TailorCv({ jobId, tracks, existingDocs }: Props) {
  const [trackId, setTrackId] = useState(tracks[0]?.id ?? '');
  const [locale, setLocale] = useState<CvLocale>('uk');
  const [result, setResult] = useState<{ suggestions: CvSuggestions; snapshot: TrackSnapshot } | null>(null);
  const [accepted, setAccepted] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const cards = useMemo(
    () => (result ? buildCards(result.suggestions, result.snapshot) : []),
    [result],
  );

  function suggest() {
    setError(null); setResult(null); setDownloadUrl(null);
    startTransition(async () => {
      const res = await suggestTailoringAction(jobId, trackId);
      if ('error' in res) { setError(res.error); return; }
      setResult(res);
      setAccepted(new Set(buildCards(res.suggestions, res.snapshot).map((c) => c.key))); // default: all accepted
    });
  }

  function generate() {
    if (!result) return;
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set('job_id', jobId);
        fd.set('track_id', trackId);
        fd.set('locale', locale);
        fd.set('overrides', JSON.stringify(toOverrides(result.suggestions, accepted)));
        const { url } = await generateNodeCvAction(fd);
        setDownloadUrl(url);
        window.open(url, '_blank');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Generation failed');
      }
    });
  }

  return (
    <section className="app-card flex flex-col gap-5 p-5">
      <h2 className="section-title">Tailor CV</h2>
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="tailor-track" className="field-label !mb-0">Track</label>
        <select id="tailor-track" value={trackId} onChange={(e) => setTrackId(e.target.value)} className="field !w-auto">
          {tracks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <button type="button" onClick={suggest} disabled={isPending || !trackId} className="btn btn-primary">
          <Sparkle className="h-4 w-4" weight="fill" />
          {isPending && !result ? 'Thinking…' : 'Suggest tailoring'}
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}

      {result && (
        <>
          {cards.length === 0 ? (
            <div className="empty-state">
              No changes suggested — your track already fits this job well.
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {cards.map((card) => {
                const on = accepted.has(card.key);
                return (
                  <li
                    key={card.key}
                    className={`rounded-2xl border p-4 text-sm transition-all duration-200 ${
                      on
                        ? 'border-[var(--accent)]/40 bg-[var(--accent-tint)]/35'
                        : 'border-[var(--line)] opacity-55'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-[var(--ink)]">{card.label}</p>
                        {card.type === 'rewrite' && (
                          <div className="mt-2 space-y-1">
                            <p className="text-[var(--ink-soft)] line-through decoration-[var(--ink-soft)]/50">
                              {card.before}
                            </p>
                            <p className="text-[var(--ink)]">{card.after}</p>
                          </div>
                        )}
                        <p className="mt-2 text-xs text-[var(--ink-soft)]">{card.reason}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAccepted((prev) => {
                          const next = new Set(prev);
                          if (next.has(card.key)) next.delete(card.key); else next.add(card.key);
                          return next;
                        })}
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                          on
                            ? 'bg-[var(--accent)] text-white'
                            : 'border border-[var(--line)] text-[var(--ink-soft)] hover:text-[var(--ink)]'
                        }`}
                      >
                        {on ? (
                          <>
                            <Check className="h-3.5 w-3.5" weight="bold" /> Accepted
                          </>
                        ) : (
                          <>
                            <X className="h-3.5 w-3.5" weight="bold" /> Rejected
                          </>
                        )}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="flex flex-wrap items-center gap-3 border-t border-[var(--line)]/60 pt-4">
            <label htmlFor="node-locale" className="field-label !mb-0">Locale</label>
            <select id="node-locale" value={locale} onChange={(e) => setLocale(e.target.value as CvLocale)} className="field !w-auto">
              {CV_LOCALES.map((l) => <option key={l} value={l}>{l.toUpperCase()}</option>)}
            </select>
            <button type="button" onClick={generate} disabled={isPending} className="btn btn-primary">
              <FilePdf className="h-4 w-4" weight="bold" />
              {isPending ? 'Generating…' : 'Save & generate PDF'}
            </button>
            {downloadUrl && (
              <a href={downloadUrl} target="_blank" rel="noreferrer" className="action-link">
                Download (valid 10 min)
              </a>
            )}
          </div>
        </>
      )}

      {existingDocs.length > 0 && (
        <div>
          <h3 className="field-label">Generated tailored CVs</h3>
          <ul className="mt-1 flex flex-col divide-y divide-[var(--line)]/60">
            {existingDocs.map((doc) => {
              const trackName = tracks.find((t) => t.id === doc.track_id)?.name ?? 'Unknown track';
              return (
                <li key={`${doc.track_id}-${doc.locale}`} className="flex items-center gap-3 py-2.5 text-sm">
                  <span className="chip uppercase">{doc.locale}</span>
                  <span className="font-medium text-[var(--ink)]">{trackName}</span>
                  <span className="tabular text-xs text-[var(--ink-soft)]">
                    {new Date(doc.updated_at).toLocaleString()}
                  </span>
                  <RedownloadButton storagePath={doc.storage_path} />
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
