'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { JOB_STATUSES, JOB_STATUS_LABELS, type JobStatus } from '@/lib/db/job-status';
import { StatusSelect } from './StatusSelect';

export type JobRow = {
  id: string;
  title: string;
  company: string | null;
  status: string;
  applied_at: string | null;
  notes: string;
  created_at: string;
  hasCv: boolean;
  hasLetter: boolean;
};

const truncate = (s: string, n = 60) => (s.length > n ? `${s.slice(0, n)}…` : s);

export function JobsTable({ rows }: { rows: JobRow[] }) {
  const [filter, setFilter] = useState<'all' | JobStatus>('all');

  const counts = useMemo(() => {
    const c = new Map<string, number>();
    rows.forEach((r) => c.set(r.status, (c.get(r.status) ?? 0) + 1));
    return c;
  }, [rows]);

  const visible = filter === 'all' ? rows : rows.filter((r) => r.status === filter);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`chip ${filter === 'all' ? '' : 'chip-quiet'}`}
        >
          All · {rows.length}
        </button>
        {JOB_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`chip ${filter === s ? '' : 'chip-quiet'}`}
          >
            {JOB_STATUS_LABELS[s]} · {counts.get(s) ?? 0}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="empty-state">No jobs in this stage.</div>
      ) : (
        <div className="app-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-left text-xs uppercase tracking-wide text-[var(--ink-soft)]">
                <th className="px-4 py-3 font-semibold">Job</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Applied</th>
                <th className="px-4 py-3 font-semibold">CV</th>
                <th className="px-4 py-3 font-semibold">Letter</th>
                <th className="px-4 py-3 font-semibold">Notes</th>
                <th className="px-4 py-3 font-semibold">Added</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id} className="border-b border-[var(--line)]/50 last:border-b-0 align-top">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/jobs/${r.id}`} className="font-semibold text-[var(--ink)] hover:underline">
                      {r.title}
                    </Link>
                    {r.company && <p className="text-[var(--ink-soft)]">{r.company}</p>}
                  </td>
                  <td className="px-4 py-3"><StatusSelect jobId={r.id} status={r.status} /></td>
                  <td className="px-4 py-3 tabular text-[var(--ink-soft)]">
                    {r.applied_at ? new Date(r.applied_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">{r.hasCv ? '●' : <span className="text-[var(--ink-soft)]/40">○</span>}</td>
                  <td className="px-4 py-3">{r.hasLetter ? '●' : <span className="text-[var(--ink-soft)]/40">○</span>}</td>
                  <td className="px-4 py-3 max-w-56 text-[var(--ink-soft)]">{r.notes ? truncate(r.notes) : '—'}</td>
                  <td className="px-4 py-3 tabular text-[var(--ink-soft)]">{new Date(r.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
