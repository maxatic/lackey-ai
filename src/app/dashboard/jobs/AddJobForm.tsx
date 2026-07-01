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
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label htmlFor="jd-text" className="field-label !mb-0">
        Add a job — paste the job description
      </label>
      <textarea
        id="jd-text"
        name="raw_text"
        rows={6}
        maxLength={20000}
        required
        placeholder="Paste the full job posting text here…"
        className="field"
      />
      <div className="flex items-center gap-3">
        <button type="submit" disabled={isPending} className="btn btn-primary self-start">
          {isPending ? 'Parsing…' : 'Add job'}
        </button>
        {error && <p className="form-error">{error}</p>}
      </div>
    </form>
  );
}
