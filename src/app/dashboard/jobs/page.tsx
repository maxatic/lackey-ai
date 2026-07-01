import Link from 'next/link';
import { listJobs } from '@/lib/db/jobs';
import { AddJobForm } from './AddJobForm';

export default async function JobsPage() {
  const jobs = await listJobs();
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Jobs</h1>
      <AddJobForm />
      {jobs.length === 0 ? (
        <p className="text-sm text-gray-500">No jobs yet — paste a job description above to get started.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {jobs.map((job) => (
            <li key={job.id}>
              <Link href={`/dashboard/jobs/${job.id}`} className="block rounded border p-3 hover:bg-gray-50">
                <span className="font-medium">{job.title}</span>
                {job.company && <span className="text-gray-500"> · {job.company}</span>}
                <span className="block text-xs text-gray-400">{new Date(job.created_at).toLocaleDateString()}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
