'use client';
import { useState, useTransition } from 'react';
import { createJobAction } from './actions';

export function AddJobForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createJobAction(fd); // redirects on success
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <label htmlFor="jd-text" className="text-sm font-medium">Add a job — paste the job description</label>
      <textarea
        id="jd-text"
        name="raw_text"
        rows={6}
        maxLength={20000}
        required
        placeholder="Paste the full job posting text here…"
        className="rounded border p-2 text-sm"
      />
      <div className="flex items-center gap-3">
        <button type="submit" disabled={isPending} className="self-start rounded bg-blue-600 px-4 py-1 text-sm text-white disabled:opacity-50">
          {isPending ? 'Parsing…' : 'Add job'}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </form>
  );
}
