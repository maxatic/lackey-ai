import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react/dist/ssr';
import { getJob } from '@/lib/db/jobs';
import { listTracks } from '@/lib/db/tracks';
import { listCvDocumentsByJob } from '@/lib/db/cv-documents';
import { validateParsedJd } from '@/lib/jd/parse';
import { TailorCv } from './TailorCv';
import { JobHeader } from './JobHeader';

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await getJob(id);
  if (!job) notFound();
  const parsed = validateParsedJd(job.parsed);
  const [tracks, existingDocs] = await Promise.all([listTracks(), listCvDocumentsByJob(id)]);

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
        <TailorCv
          jobId={job.id}
          tracks={tracks.map((t) => ({ id: t.id, name: t.name }))}
          existingDocs={existingDocs.map((d) => ({ locale: d.locale, track_id: d.track_id, storage_path: d.storage_path, updated_at: d.updated_at }))}
        />
      )}
    </div>
  );
}
