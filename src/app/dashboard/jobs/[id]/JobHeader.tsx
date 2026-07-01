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
        <input name="title" defaultValue={title} required className="rounded border px-2 py-1 text-lg font-bold" />
        <input name="company" defaultValue={company ?? ''} placeholder="Company" className="rounded border px-2 py-1 text-sm" />
        <button type="submit" disabled={isPending} className="rounded bg-blue-600 px-3 py-1 text-sm text-white disabled:opacity-50">Save</button>
        <button type="button" onClick={() => setEditing(false)} className="text-sm underline">Cancel</button>
        {error && <p className="w-full text-sm text-red-600">{error}</p>}
      </form>
    );
  }

  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {company && <p className="text-gray-500">{company}</p>}
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={() => setEditing(true)} className="text-sm text-blue-600 underline">Edit</button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            if (window.confirm('Delete this job and its tailored CVs?')) {
              startTransition(() => deleteJobAction(jobId));
            }
          }}
          className="text-sm text-red-600 underline disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
