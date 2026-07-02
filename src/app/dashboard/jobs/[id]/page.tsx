import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react/dist/ssr';
import { getJob } from '@/lib/db/jobs';
import { listTracks } from '@/lib/db/tracks';
import { listCvDocumentsByJob } from '@/lib/db/cv-documents';
import { listCoverLettersByJob } from '@/lib/db/cover-letters';
import { validateParsedJd } from '@/lib/jd/parse';
import type { LetterPoint } from '@/lib/letter/types';
import { TailorCv } from './TailorCv';
import { CoverLetter } from './CoverLetter';
import { JobHeader } from './JobHeader';
import { TrackerCard } from './TrackerCard';

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await getJob(id);
  if (!job) notFound();
  const parsed = validateParsedJd(job.parsed);
  const [tracks, existingDocs, letters] = await Promise.all([listTracks(), listCvDocumentsByJob(id), listCoverLettersByJob(id)]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/dashboard/jobs"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)]"
        >
          <ArrowLeft className="h-4 w-4" />
          All jobs
        </Link>
      </div>

      <JobHeader jobId={job.id} title={job.title} company={job.company} />

      <TrackerCard jobId={job.id} status={job.status} appliedAt={job.applied_at} notes={job.notes} />

      {parsed && (
        <section className="app-card p-5">
          <h2 className="section-title">Parsed job description</h2>
          {parsed.location && (
            <p className="mt-2 text-sm text-[var(--ink-soft)]">
              Location: {parsed.location}
            </p>
          )}
          {parsed.requirements.length > 0 && (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-relaxed text-[var(--ink)]">
              {parsed.requirements.map((r) => <li key={r}>{r}</li>)}
            </ul>
          )}
          {parsed.keywords.length > 0 && (
            <p className="mt-4 flex flex-wrap gap-1.5">
              {parsed.keywords.map((k) => (
                <span key={k} className="chip chip-quiet">{k}</span>
              ))}
            </p>
          )}
        </section>
      )}

      {tracks.length === 0 ? (
        <div className="empty-state">
          You need a Career Track to tailor from —{' '}
          <Link href="/dashboard/tracks/new" className="action-link">
            create one
          </Link>
          .
        </div>
      ) : (
        <>
          <TailorCv
            jobId={job.id}
            tracks={tracks.map((t) => ({ id: t.id, name: t.name }))}
            existingDocs={existingDocs.map((d) => ({ locale: d.locale, track_id: d.track_id, storage_path: d.storage_path, updated_at: d.updated_at }))}
          />
          <CoverLetter
            jobId={job.id}
            tracks={tracks.map((t) => ({ id: t.id, name: t.name }))}
            existingLetters={letters.map((l) => ({
              track_id: l.track_id,
              points: Array.isArray(l.points)
                ? (l.points as unknown[]).filter(
                    (p): p is LetterPoint =>
                      !!p && typeof p === 'object' &&
                      typeof (p as { entry_id?: unknown }).entry_id === 'string' &&
                      typeof (p as { text?: unknown }).text === 'string' &&
                      typeof (p as { reason?: unknown }).reason === 'string',
                  )
                : [],
              body: l.body,
            }))}
          />
        </>
      )}
    </div>
  );
}
