# Phase 5 — Job Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Jobs become the application pipeline: six-stage status + applied date + notes on `job_descriptions`, a spreadsheet-like table with inline status editing and filtering on `/dashboard/jobs`, and forward-only auto-advance to `prepared` when a CV is generated or a letter is saved.

**Architecture:** No new tables — migration `0006` adds three columns under the existing owner RLS. A client-safe `job-status.ts` constants module (entry-kinds pattern). `advanceJobToPrepared` is an atomic conditional update (`where id = ? and status = 'saved'`) so it can never race a concurrent manual status change into a downgrade. Two best-effort write-throughs in the existing generation actions. The jobs page becomes a client `JobsTable` fed by three parallel server fetches.

**Tech Stack:** Next.js 15 App Router, Supabase (Clerk third-party auth + RLS), Vitest. **No AI calls in this phase.**

**Spec:** [docs/superpowers/specs/2026-07-02-job-tracker-design.md](../specs/2026-07-02-job-tracker-design.md)

## Global Constraints

- db helpers follow the house pattern: `createServerSupabaseClient()`, RLS does tenancy, raw `PostgrestError` thrown; update-by-id helpers throw `'Job not found'` via `maybeSingle`.
- Statuses exactly: `'saved' | 'prepared' | 'applied' | 'interviewing' | 'offer' | 'rejected'`. `applied_at` rule: entering `applied` stamps it only if null; moving to `saved`/`prepared` clears it; `interviewing`/`offer`/`rejected` preserve it.
- Auto-advance is forward-only (`saved → prepared` only) and best-effort: a bump failure must never fail the generation/save that triggered it.
- New action error messages, byte-exact and added to the `toActionError` allowlist: `'Invalid status'` and `'Notes are too long (max 5,000 characters)'`.
- No new npm dependencies. UI uses the existing design tokens (`app-card`, `chip`, `field`, `empty-state`, `kicker`, `app-title`, `app-subtitle`, `form-error`, `btn btn-primary`, `tabular`).
- Baseline: 164 tests / 32 files. `npx vitest run`, `npx tsc --noEmit`, `npx next build` green at the end of every task. Commit per task.

---

### Task 1: Migration 0006 + database types + job-status constants

**Files:**
- Create: `supabase/migrations/0006_job_pipeline.sql`
- Create: `src/lib/db/job-status.ts`
- Modify: `src/lib/db/database.types.ts` (`job_descriptions` gains 3 fields)

**Interfaces:**
- Produces: columns `status`/`applied_at`/`notes` on `job_descriptions`; `JOB_STATUSES`, `JobStatus`, `JOB_STATUS_LABELS`, `isJobStatus` from `@/lib/db/job-status`.

- [ ] **Step 1: Write the migration**

```sql
-- 0006_job_pipeline.sql — pipeline status + applied date + notes on job_descriptions.
-- No new table, no new RLS: the existing job_descriptions_owner policy covers new columns.

alter table job_descriptions
  add column status text not null default 'saved'
    constraint job_descriptions_status_check
    check (status in ('saved','prepared','applied','interviewing','offer','rejected')),
  add column applied_at timestamptz,
  add column notes text not null default '';
```

- [ ] **Step 2: Extend `database.types.ts`** — in the `job_descriptions` block add to Row: `status: string; applied_at: string | null; notes: string;` and to Insert/Update the optional forms `status?: string; applied_at?: string | null; notes?: string;` (all have defaults or are nullable).

- [ ] **Step 3: Create the constants module**

```typescript
// src/lib/db/job-status.ts
// Client-safe pipeline-status metadata. No server imports — usable in 'use client' components.
export const JOB_STATUSES = [
  'saved',
  'prepared',
  'applied',
  'interviewing',
  'offer',
  'rejected',
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  saved: 'Saved',
  prepared: 'Prepared',
  applied: 'Applied',
  interviewing: 'Interviewing',
  offer: 'Offer',
  rejected: 'Rejected',
};

export function isJobStatus(v: unknown): v is JobStatus {
  return typeof v === 'string' && (JOB_STATUSES as readonly string[]).includes(v);
}
```

- [ ] **Step 4: Apply + verify** — Run: `npm run db:migrate && npm run db:verify`. Expected: `0006_job_pipeline.sql` applied; still `✓ 13 public tables confirmed` (no count change). Then `npx tsc --noEmit` → 0.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0006_job_pipeline.sql src/lib/db/job-status.ts src/lib/db/database.types.ts
git commit -m "feat(tracker): pipeline status/applied_at/notes columns + status constants (0006)"
```

---

### Task 2: db helpers — updateJobStatus, advanceJobToPrepared, notes, job-id listers

**Files:**
- Modify: `src/lib/db/jobs.ts` (2 new helpers; `updateJob` patch gains `notes`)
- Modify: `src/lib/db/jobs.test.ts` (mock rework + new cases)
- Modify: `src/lib/db/cv-documents.ts` + `cv-documents.test.ts` (`listCvDocumentJobIds`)
- Modify: `src/lib/db/cover-letters.ts` + `cover-letters.test.ts` (`listCoverLetterJobIds`)

**Interfaces:**
- Consumes: `JobStatus` from Task 1.
- Produces:
  - `updateJobStatus(id: string, status: JobStatus): Promise<Job>` — owns the `applied_at` rule; `'Job not found'` on missing id
  - `advanceJobToPrepared(id: string): Promise<void>` — atomic `.eq('id', id).eq('status', 'saved')` conditional update, silent no-op when unmatched, throws only on db error
  - `updateJob(id, patch: Partial<{ title: string; company: string | null; notes: string }>)`
  - `listCvDocumentJobIds(): Promise<string[]>` — distinct non-null `job_id`s (RLS-scoped)
  - `listCoverLetterJobIds(): Promise<string[]>` — distinct `job_id`s

- [ ] **Step 1: Rework the jobs test mock for multi-filter updates.** The current `makeQuery` in `jobs.test.ts` applies a pending patch on the FIRST `eq()` — it cannot express `update().eq('id', x).eq('status', 'saved')`. Replace the builder with a filter-collecting version (all existing tests must stay green under it):

```typescript
function makeQuery(_table: string) {
  let pending: any[] | null = null; // rows staged by insert for select().single()
  let pendingPatch: any | null = null; // patch staged by update(), applied at a terminal
  let isDelete = false;
  let filters: { col: string; val: any }[] = [];
  const matches = (r: any) => filters.every((f) => r[f.col] === f.val);
  const applyPending = () => {
    if (pendingPatch !== null) {
      const matched = rows.filter(matches);
      matched.forEach((r) => Object.assign(r, pendingPatch));
      pending = matched;
      pendingPatch = null;
    }
    if (isDelete) {
      rows = rows.filter((r) => !matches(r));
      isDelete = false;
    }
  };
  const builder: any = {
    select() { return builder; },
    order() { return Promise.resolve({ data: [...rows], error: null }); },
    insert(values: any) {
      // DB defaults for the new pipeline columns:
      const row = { id: String(nextId++), status: 'saved', applied_at: null, notes: '', ...values };
      rows.push(row);
      pending = [row];
      return builder;
    },
    update(patch: any) { pendingPatch = patch; return builder; },
    delete() { isDelete = true; return builder; },
    eq(col: string, val: any) { filters.push({ col, val }); return builder; },
    // awaited chains without select() (delete().eq(), update().eq().eq()) resolve here:
    then(onFulfilled: (v: any) => any) {
      applyPending();
      return Promise.resolve({ data: null, error: null }).then(onFulfilled);
    },
    single() { applyPending(); return Promise.resolve({ data: pending![0], error: null }); },
    maybeSingle() {
      applyPending();
      return Promise.resolve({ data: pending?.[0] ?? rows.find(matches) ?? null, error: null });
    },
  };
  return builder;
}
```

Sanity-trace before proceeding: `createJob` (insert→select→single) ✅; `getJob('missing')` (select→eq→maybeSingle → find fails → null) ✅; `updateJob` not-found (update→eq→select→maybeSingle → matched=[] → pending=[] → `[0]` undefined → find fails → null → helper throws) ✅; `deleteJob` (delete→eq awaited → then applies) ✅.

- [ ] **Step 2: Write the new failing tests** (append to `jobs.test.ts`):

```typescript
describe('updateJobStatus', () => {
  it('stamps applied_at on entering applied, only once', async () => {
    const job = await createJob({ title: 'A', company: null, raw_text: 'x', parsed: {} });
    const applied = await updateJobStatus(job.id, 'applied');
    expect(applied.status).toBe('applied');
    expect(applied.applied_at).toBeTruthy();
    const interviewing = await updateJobStatus(job.id, 'interviewing');
    expect(interviewing.applied_at).toBe(applied.applied_at); // preserved, not re-stamped
  });

  it('clears applied_at when moving back to saved or prepared', async () => {
    const job = await createJob({ title: 'A', company: null, raw_text: 'x', parsed: {} });
    await updateJobStatus(job.id, 'applied');
    const back = await updateJobStatus(job.id, 'saved');
    expect(back.applied_at).toBeNull();
  });

  it('preserves applied_at through offer and rejected', async () => {
    const job = await createJob({ title: 'A', company: null, raw_text: 'x', parsed: {} });
    const applied = await updateJobStatus(job.id, 'applied');
    const offer = await updateJobStatus(job.id, 'offer');
    expect(offer.applied_at).toBe(applied.applied_at);
    const rejected = await updateJobStatus(job.id, 'rejected');
    expect(rejected.applied_at).toBe(applied.applied_at);
  });

  it('throws "Job not found" for an unknown id', async () => {
    await expect(updateJobStatus('nope', 'applied')).rejects.toThrow('Job not found');
  });
});

describe('advanceJobToPrepared', () => {
  it('advances a saved job to prepared', async () => {
    const job = await createJob({ title: 'A', company: null, raw_text: 'x', parsed: {} });
    await advanceJobToPrepared(job.id);
    await expect(getJob(job.id)).resolves.toMatchObject({ status: 'prepared' });
  });

  it('is a silent no-op when the job is already past saved', async () => {
    const job = await createJob({ title: 'A', company: null, raw_text: 'x', parsed: {} });
    await updateJobStatus(job.id, 'applied');
    await advanceJobToPrepared(job.id); // must NOT downgrade
    await expect(getJob(job.id)).resolves.toMatchObject({ status: 'applied' });
  });

  it('is a silent no-op for a missing job', async () => {
    await expect(advanceJobToPrepared('ghost')).resolves.toBeUndefined();
  });
});

it('updateJob accepts a notes patch', async () => {
  const job = await createJob({ title: 'A', company: null, raw_text: 'x', parsed: {} });
  const updated = await updateJob(job.id, { notes: 'phone screen Friday' });
  expect(updated.notes).toBe('phone screen Friday');
});
```

- [ ] **Step 3: Run, verify the new cases FAIL** (and pre-existing cases still pass under the reworked mock): `npx vitest run src/lib/db/jobs.test.ts`.

- [ ] **Step 4: Implement in `jobs.ts`**

```typescript
import type { JobStatus } from './job-status';

export async function updateJobStatus(id: string, status: JobStatus): Promise<Job> {
  const current = await getJob(id);
  if (!current) throw new Error('Job not found');
  const applied_at =
    status === 'applied'
      ? (current.applied_at ?? new Date().toISOString())
      : status === 'saved' || status === 'prepared'
        ? null
        : current.applied_at;
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('job_descriptions')
    .update({ status, applied_at, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Job not found');
  return data;
}

// Forward-only auto-advance. Atomic conditional update — a read-then-write here
// could race a concurrent manual status change and downgrade it.
export async function advanceJobToPrepared(id: string): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from('job_descriptions')
    .update({ status: 'prepared', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'saved');
  if (error) throw error;
}
```

And widen `updateJob`'s patch parameter to `Partial<{ title: string; company: string | null; notes: string }>` (body unchanged).

- [ ] **Step 5: Add the job-id listers.**

In `cv-documents.ts`:

```typescript
export async function listCvDocumentJobIds(): Promise<string[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('cv_documents')
    .select('job_id')
    .not('job_id', 'is', null);
  if (error) throw error;
  return [...new Set((data ?? []).map((r) => r.job_id as string))];
}
```

In `cover-letters.ts`:

```typescript
export async function listCoverLetterJobIds(): Promise<string[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from('cover_letters').select('job_id');
  if (error) throw error;
  return [...new Set((data ?? []).map((r) => r.job_id))];
}
```

Tests (append to each helper's test file; extend each file's existing mock builder with whatever minimal no-op terminals the chains need — e.g. a `not()` returning the builder and a thenable resolve of the seeded rows):

```typescript
// cv-documents.test.ts
it('listCvDocumentJobIds returns distinct non-null job ids', async () => {
  // seed two docs with job_id 'j1', one with 'j2', one master (job_id null) via the mock's rows
  await expect(listCvDocumentJobIds()).resolves.toEqual(expect.arrayContaining(['j1', 'j2']));
  await expect(listCvDocumentJobIds()).resolves.toHaveLength(2);
});

// cover-letters.test.ts
it('listCoverLetterJobIds returns distinct job ids', async () => {
  await upsertCoverLetter({ job_id: 'j1', track_id: 't1', points: [], body: 'a' });
  await upsertCoverLetter({ job_id: 'j1', track_id: 't2', points: [], body: 'b' });
  await expect(listCoverLetterJobIds()).resolves.toEqual(['j1']);
});
```

- [ ] **Step 6: Run all tests + types** — `npx vitest run && npx tsc --noEmit` → green.

- [ ] **Step 7: Commit**

```bash
git add src/lib/db/
git commit -m "feat(tracker): status/notes helpers, atomic advanceJobToPrepared, job-id listers"
```

---

### Task 3: Auto-advance write-throughs + status/notes actions + allowlist

**Files:**
- Modify: `src/app/dashboard/jobs/[id]/tailor/actions.ts` (`generateNodeCvAction` write-through)
- Modify: `src/app/dashboard/jobs/[id]/letter/actions.ts` (`saveCoverLetterAction` write-through)
- Modify: `src/app/dashboard/jobs/actions.ts` (2 new actions)
- Modify: `src/lib/action-error.ts` + `action-error.test.ts` (2 new allowlist entries)
- Modify: `src/app/dashboard/jobs/[id]/tailor/actions.test.ts`, `src/app/dashboard/jobs/[id]/letter/actions.test.ts` (write-through assertions; NOTE: both files `vi.mock('@/lib/db/jobs', …)` with a factory — the factory MUST gain an `advanceJobToPrepared` entry or the actions' new import resolves to undefined)
- Create/extend: action tests for the two new actions (append to an existing jobs actions test file if one exists, else create `src/app/dashboard/jobs/actions.test.ts` following the letter actions test's mock pattern)

**Interfaces:**
- Consumes: `advanceJobToPrepared`, `updateJobStatus`, `updateJob` (Task 2); `isJobStatus` (Task 1); `toActionError`.
- Produces:
  - `updateJobStatusAction(id: string, status: string): Promise<{ error?: string }>`
  - `updateJobNotesAction(id: string, notes: string): Promise<{ error?: string }>`

- [ ] **Step 1: Write failing tests.**

Allowlist (append the two messages to the `SAFE` array in `action-error.test.ts`): `'Invalid status'`, `'Notes are too long (max 5,000 characters)'`.

Write-throughs — in `tailor/actions.test.ts`, add `advanceJobToPrepared: (...a: any[]) => mocks.advanceJobToPrepared(...a)` to the existing `@/lib/db/jobs` mock factory and a `advanceJobToPrepared: vi.fn()` to the mocks object, then:

```typescript
it('generateNodeCvAction advances the job to prepared on success', async () => {
  /* reuse the existing happy-path arrangement */
  mocks.advanceJobToPrepared.mockResolvedValue(undefined);
  await generateNodeCvAction(fd);
  expect(mocks.advanceJobToPrepared).toHaveBeenCalledWith('j1');
});

it('generateNodeCvAction still succeeds when the status bump fails', async () => {
  /* happy-path arrangement */
  mocks.advanceJobToPrepared.mockRejectedValue(new Error('db down'));
  const { url } = await generateNodeCvAction(fd);
  expect(url).toBe('https://signed');
});
```

Mirror both cases in `letter/actions.test.ts` for `saveCoverLetterAction` (result stays `{ ok: true }` when the bump rejects).

New actions:

```typescript
it('updateJobStatusAction rejects an unknown status without touching the db', async () => {
  await expect(updateJobStatusAction('j1', 'ghosted')).resolves.toEqual({ error: 'Invalid status' });
  expect(mocks.updateJobStatus).not.toHaveBeenCalled();
});
it('updateJobStatusAction updates on a valid status', async () => {
  mocks.updateJobStatus.mockResolvedValue({});
  await expect(updateJobStatusAction('j1', 'applied')).resolves.toEqual({});
  expect(mocks.updateJobStatus).toHaveBeenCalledWith('j1', 'applied');
});
it('updateJobNotesAction caps notes length', async () => {
  await expect(updateJobNotesAction('j1', 'x'.repeat(5001))).resolves.toEqual({ error: 'Notes are too long (max 5,000 characters)' });
});
it('updateJobNotesAction saves notes', async () => {
  mocks.updateJob.mockResolvedValue({});
  await expect(updateJobNotesAction('j1', 'call back Tue')).resolves.toEqual({});
  expect(mocks.updateJob).toHaveBeenCalledWith('j1', { notes: 'call back Tue' });
});
```

- [ ] **Step 2: Run, verify FAIL.**

- [ ] **Step 3: Implement.**

`action-error.ts` — add to `SAFE_MESSAGES`: `'Invalid status'`, `'Notes are too long (max 5,000 characters)'`.

Write-throughs — in `generateNodeCvAction`, immediately after the `upsertCvDocument(...)` call:

```typescript
  try { await advanceJobToPrepared(jobId); } catch { /* best-effort — never fail a succeeded generation */ }
```

In `saveCoverLetterAction`, immediately after `upsertCoverLetter(...)` (inside the existing try, but individually guarded the same way). Both files import `advanceJobToPrepared` from `@/lib/db/jobs`.

New actions in `src/app/dashboard/jobs/actions.ts`:

```typescript
import { isJobStatus } from '@/lib/db/job-status';
import { toActionError } from '@/lib/action-error';
import { createJob, deleteJob, updateJob, updateJobStatus } from '@/lib/db/jobs';

export async function updateJobStatusAction(id: string, status: string): Promise<{ error?: string }> {
  try {
    if (!isJobStatus(status)) throw new Error('Invalid status');
    await updateJobStatus(id, status);
  } catch (err) {
    return { error: toActionError(err) };
  }
  revalidatePath('/dashboard/jobs');
  revalidatePath(`/dashboard/jobs/${id}`);
  return {};
}

export async function updateJobNotesAction(id: string, notes: string): Promise<{ error?: string }> {
  try {
    if (notes.length > 5000) throw new Error('Notes are too long (max 5,000 characters)');
    await updateJob(id, { notes });
  } catch (err) {
    return { error: toActionError(err) };
  }
  revalidatePath(`/dashboard/jobs/${id}`);
  return {};
}
```

- [ ] **Step 4: Run all tests + types** — green.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/jobs/ src/lib/action-error.ts src/lib/action-error.test.ts
git commit -m "feat(tracker): auto-advance write-throughs + status/notes actions"
```

---

### Task 4: Pipeline table UI + detail-page tracker card + final verification

**Files:**
- Create: `src/app/dashboard/jobs/StatusSelect.tsx`, `src/app/dashboard/jobs/JobsTable.tsx`
- Create: `src/app/dashboard/jobs/[id]/TrackerCard.tsx`
- Modify: `src/app/dashboard/jobs/page.tsx` (card list → table; 3 parallel fetches; wider container)
- Modify: `src/app/dashboard/jobs/[id]/page.tsx` (render TrackerCard; pass status/notes)

**Interfaces:**
- Consumes: `updateJobStatusAction`/`updateJobNotesAction` (Task 3), `listCvDocumentJobIds`/`listCoverLetterJobIds` (Task 2), `JOB_STATUSES`/`JOB_STATUS_LABELS`/`JobStatus` (Task 1).
- Produces: `JobsTable({ rows })` with `rows: { id; title; company; status; applied_at; notes; created_at; hasCv; hasLetter }[]`; `StatusSelect({ jobId, status })`; `TrackerCard({ jobId, status, appliedAt, notes })`.

- [ ] **Step 1: `StatusSelect.tsx`** (shared by table + detail card; optimistic with rollback):

```tsx
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
```

- [ ] **Step 2: `JobsTable.tsx`** (client; filter chips + table):

```tsx
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
```

(Adaptation rule, same as prior phases: if `chip`/`chip-quiet` active/inactive styling reads wrong next to the rest of the dashboard, match whatever the parsed-JD keywords chips and filter affordances already do — existing tokens win over this skeleton.)

- [ ] **Step 3: Rewrite `page.tsx`** (jobs list):

```tsx
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
```

- [ ] **Step 4: `TrackerCard.tsx`** + detail-page wiring:

```tsx
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
```

In `src/app/dashboard/jobs/[id]/page.tsx`: `import { TrackerCard } from './TrackerCard';` and render it directly AFTER the `<JobHeader …/>` line:

```tsx
      <TrackerCard jobId={job.id} status={job.status} appliedAt={job.applied_at} notes={job.notes} />
```

Nothing else on the page changes.

- [ ] **Step 5: Full verification**

Run: `npx vitest run && npx tsc --noEmit && npx next build`
Expected: suite green (no drop from Task 3's count), 0 type errors, build clean with `/dashboard/jobs` and `/dashboard/jobs/[id]` present.

- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard/jobs/
git commit -m "feat(tracker): pipeline table with status filter + detail tracker card"
```

---

## Post-plan checklist (operator notes, not tasks)

- No AI, no Fly, no new env vars — this phase is fully live once pushed.
- Update `docs/HANDOFF.md` after the phase lands.
- Named follow-ups (not in this phase): kanban view over the same data; `status_events` history table if audit trail is ever wanted.
