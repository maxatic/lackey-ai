import { listJobs } from '@/lib/db/jobs';
import { listCvDocumentJobIds } from '@/lib/db/cv-documents';
import { listCoverLetterJobIds } from '@/lib/db/cover-letters';
import { AddJobForm } from './AddJobForm';
import { JobsTable } from './JobsTable';

export default async function JobsPage() {
  const [jobs, cvJobIds, letterJobIds] = await Promise.all([
    listJobs(),
    listCvDocumentJobIds(),
    listCoverLetterJobIds(),
  ]);
  const cvSet = new Set(cvJobIds);
  const letterSet = new Set(letterJobIds);

  return (
    <div className="max-w-5xl">
      <p className="kicker">Applications</p>
      <h1 className="app-title mt-2">Jobs</h1>
      <p className="app-subtitle">
        Your application pipeline — paste a job description to add one, then track it from saved to offer.
      </p>

      <div className="app-card mt-8 max-w-2xl p-5">
        <AddJobForm />
      </div>

      <div className="mt-8">
        {jobs.length === 0 ? (
          <div className="empty-state">No jobs yet — paste a job description above to get started.</div>
        ) : (
          <JobsTable
            rows={jobs.map((j) => ({
              id: j.id,
              title: j.title,
              company: j.company,
              status: j.status,
              applied_at: j.applied_at,
              notes: j.notes,
              created_at: j.created_at,
              hasCv: cvSet.has(j.id),
              hasLetter: letterSet.has(j.id),
            }))}
          />
        )}
      </div>
    </div>
  );
}
