import { notFound } from 'next/navigation';
import Link from 'next/link';
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
      <JobHeader jobId={job.id} title={job.title} company={job.company} />

      {parsed && (
        <section className="rounded border p-4">
          <h2 className="mb-2 text-lg font-semibold">Parsed job description</h2>
          {parsed.location && <p className="text-sm text-gray-600">Location: {parsed.location}</p>}
          {parsed.requirements.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-sm">
              {parsed.requirements.map((r) => <li key={r}>{r}</li>)}
            </ul>
          )}
          {parsed.keywords.length > 0 && (
            <p className="mt-2 flex flex-wrap gap-1">
              {parsed.keywords.map((k) => (
                <span key={k} className="rounded bg-gray-100 px-2 py-0.5 text-xs">{k}</span>
              ))}
            </p>
          )}
        </section>
      )}

      {tracks.length === 0 ? (
        <p className="text-sm">
          You need a Career Track to tailor from — <Link href="/dashboard/tracks/new" className="text-blue-600 underline">create one</Link>.
        </p>
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
