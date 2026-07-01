'use client';
import { useState, useTransition } from 'react';
import { updateJobAction, deleteJobAction } from '../actions';

export function JobHeader({ jobId, title, company }: { jobId: string; title: string; company: string | null }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateJobAction(jobId, {
        title: String(fd.get('title') ?? ''),
        company: String(fd.get('company') ?? '') || null,
      });
      if (res.error) setError(res.error);
      else setEditing(false);
    });
  }

  if (editing) {
    return (
      <form onSubmit={save} className="flex flex-wrap items-center gap-2">
        <input name="title" defaultValue={title} required className="field !w-64 font-semibold" />
        <input name="company" defaultValue={company ?? ''} placeholder="Company" className="field !w-48" />
        <button type="submit" disabled={isPending} className="btn btn-primary !px-4 !py-2">
          Save
        </button>
        <button type="button" onClick={() => setEditing(false)} className="btn btn-quiet !px-4 !py-2">
          Cancel
        </button>
        {error && <p className="form-error w-full">{error}</p>}
      </form>
    );
  }

  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h1 className="app-title">{title}</h1>
        {company && <p className="mt-1 text-[var(--ink-soft)]">{company}</p>}
      </div>
      <div className="flex shrink-0 gap-3 pt-2">
        <button type="button" onClick={() => setEditing(true)} className="action-link">
          Edit
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            if (window.confirm('Delete this job and its tailored CVs?')) {
              startTransition(() => deleteJobAction(jobId));
            }
          }}
          className="action-link action-link-danger disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
