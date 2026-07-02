'use client';
import { useState, useTransition } from 'react';
import { JOB_STATUSES, JOB_STATUS_LABELS, type JobStatus } from '@/lib/db/job-status';
import { updateJobStatusAction } from './actions';

export function StatusSelect({ jobId, status }: { jobId: string; status: string }) {
  const [value, setValue] = useState(status);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onChange(next: string) {
    const prev = value;
    setValue(next); // optimistic
    setError(null);
    startTransition(async () => {
      const res = await updateJobStatusAction(jobId, next);
      if (res.error) {
        setValue(prev); // rollback
        setError(res.error);
      }
    });
  }

  return (
    <span className="inline-flex flex-col">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={isPending}
        aria-label="Application status"
        className="field !w-auto py-1 text-sm"
      >
        {JOB_STATUSES.map((s: JobStatus) => (
          <option key={s} value={s}>{JOB_STATUS_LABELS[s]}</option>
        ))}
      </select>
      {error && <span className="form-error mt-1 text-xs">{error}</span>}
    </span>
  );
}
