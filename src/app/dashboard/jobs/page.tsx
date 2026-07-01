import Link from 'next/link';
import { ArrowRight } from '@phosphor-icons/react/dist/ssr';
import { listJobs } from '@/lib/db/jobs';
import { AddJobForm } from './AddJobForm';

export default async function JobsPage() {
  const jobs = await listJobs();
  return (
    <div className="max-w-2xl">
      <p className="kicker">Applications</p>
      <h1 className="app-title mt-2">Jobs</h1>
      <p className="app-subtitle">
        Paste a job description and Lackey reads what the role actually needs —
        then tailors your CV to it.
      </p>

      <div className="app-card mt-8 p-5">
        <AddJobForm />
      </div>

      <div className="mt-8">
        {jobs.length === 0 ? (
          <div className="empty-state">
            No jobs yet — paste a job description above to get started.
          </div>
        ) : (
          <ul className="app-card overflow-hidden">
            {jobs.map((job) => (
              <li key={job.id}>
                <Link
                  href={`/dashboard/jobs/${job.id}`}
                  className="app-row group transition-colors hover:bg-[var(--paper-2)]/50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--ink)]">
                      {job.title}
                    </p>
                    <p className="truncate text-sm text-[var(--ink-soft)]">
                      {job.company ? `${job.company} · ` : ''}
                      <span className="tabular">
                        {new Date(job.created_at).toLocaleDateString()}
                      </span>
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-[var(--ink-soft)] transition-transform duration-200 group-hover:translate-x-1" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
