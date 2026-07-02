'use client';
import { useState, useTransition } from 'react';
import { StatusSelect } from '../StatusSelect';
import { updateJobNotesAction } from '../actions';

export function TrackerCard({ jobId, status, appliedAt, notes }: {
  jobId: string; status: string; appliedAt: string | null; notes: string;
}) {
  const [value, setValue] = useState(notes);
  const [saved, setSaved] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await updateJobNotesAction(jobId, value);
      if (res.error) setError(res.error);
      else setSaved(true);
    });
  }

  return (
    <section className="app-card flex flex-col gap-4 p-5">
      <h2 className="section-title">Tracker</h2>
      <div className="flex flex-wrap items-center gap-3">
        <span className="field-label !mb-0">Status</span>
        <StatusSelect jobId={jobId} status={status} />
        {appliedAt && (
          <span className="text-sm text-[var(--ink-soft)]">
            Applied {new Date(appliedAt).toLocaleDateString()}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="job-notes" className="field-label !mb-0">Notes</label>
        <textarea
          id="job-notes"
          value={value}
          maxLength={5000}
          onChange={(e) => { setValue(e.target.value); setSaved(false); }}
          rows={4}
          placeholder="Recruiter contacts, interview dates, follow-ups…"
          className="field leading-relaxed"
        />
        <div className="flex items-center gap-3">
          <button type="button" onClick={save} disabled={isPending || saved} className="btn btn-primary">
            {saved ? 'Saved' : isPending ? 'Saving…' : 'Save notes'}
          </button>
          {error && <p className="form-error">{error}</p>}
        </div>
      </div>
    </section>
  );
}
