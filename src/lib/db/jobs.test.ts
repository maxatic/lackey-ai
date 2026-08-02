/* eslint-disable @typescript-eslint/no-explicit-any */
// src/lib/db/jobs.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// In-memory rows the stub reads/writes.
let rows: any[] = [];
let nextId = 1;

// Minimal chainable query builder matching the calls our helpers make.
// IMPORTANT: the builder itself IS thenable only so that awaited chains without a
// terminal (delete().eq(), update().eq().eq()) resolve; the client object is not awaited.
// Filters collect across the chain and mutations apply at a terminal (then/single/maybeSingle),
// so multi-filter conditional updates like update().eq('id', x).eq('status', 'saved') work.
function makeQuery(_table: string) {
  let pending: any[] | null = null; // rows staged by insert for select().single()
  let pendingPatch: any | null = null; // patch staged by update(), applied at a terminal
  let pendingError: any = null; // error staged by insert (unique violation), surfaced at single()
  let isDelete = false;
  let selectedCols: string | null = null; // column projection for awaited select() chains
  const filters: { col: string; val: any; not?: boolean }[] = [];
  const matches = (r: any) =>
    filters.every((f) => (f.not ? r[f.col] !== f.val : r[f.col] === f.val));
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
    select(cols?: string) { selectedCols = cols ?? null; return builder; },
    order() { return Promise.resolve({ data: [...rows], error: null }); },
    insert(values: any) {
      // Simulate the (user_id, source, source_id) unique constraint for source rows:
      if (
        values.source != null &&
        rows.some(
          (r) =>
            r.user_id === values.user_id &&
            r.source === values.source &&
            r.source_id === values.source_id,
        )
      ) {
        pendingError = { code: '23505', message: 'duplicate key value violates unique constraint' };
        return builder;
      }
      // DB defaults for the new pipeline columns:
      const row = { id: String(nextId++), status: 'saved', applied_at: null, notes: '', source: null, source_id: null, ...values };
      rows.push(row);
      pending = [row];
      return builder;
    },
    update(patch: any) { pendingPatch = patch; return builder; },
    delete() { isDelete = true; return builder; },
    eq(col: string, val: any) { filters.push({ col, val }); return builder; },
    not(col: string, _op: string, val: any) { filters.push({ col, val, not: true }); return builder; },
    // awaited chains without a row terminal (delete().eq(), update().eq().eq(),
    // select('cols').not(...)) resolve here:
    then(onFulfilled: (v: any) => any) {
      applyPending();
      let data: any = null;
      if (selectedCols && selectedCols !== '*') {
        const cols = selectedCols.split(',').map((c) => c.trim());
        data = rows.filter(matches).map((r) => Object.fromEntries(cols.map((c) => [c, r[c]])));
      }
      return Promise.resolve({ data, error: null }).then(onFulfilled);
    },
    single() {
      applyPending();
      if (pendingError) return Promise.resolve({ data: null, error: pendingError });
      return Promise.resolve({ data: pending![0], error: null });
    },
    maybeSingle() {
      applyPending();
      return Promise.resolve({ data: pending?.[0] ?? rows.find(matches) ?? null, error: null });
    },
  };
  return builder;
}

// The client object returned by createServerSupabaseClient must NOT be thenable
// (it is not directly awaited); only the query builder is thenable.

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    from: (table: string) => makeQuery(table),
  })),
}));
vi.mock('@/lib/auth/ensure-user', () => ({ ensureUser: vi.fn(async () => {}) }));
vi.mock('@/lib/auth/local-user', () => ({ getUserId: () => 'user_1', LOCAL_USER_NAME: 'Maxat Issaliyev' }));

import {
  listJobs,
  createJob,
  getJob,
  updateJob,
  deleteJob,
  updateJobStatus,
  advanceJobToPrepared,
  createJobFromSearch,
  listSavedSourceIds,
} from './jobs';
import { validateParsedJd } from '@/lib/jd/parse';

beforeEach(() => {
  rows = [];
  nextId = 1;
});

describe('jobs db helpers', () => {
  it('createJob inserts with user_id and returns the row', async () => {
    const job = await createJob({ title: 'SWE', company: 'ACME', raw_text: 'JD text', parsed: {} });
    expect(job.user_id).toBe('user_1');
    expect(job.title).toBe('SWE');
  });

  it('listJobs returns all rows', async () => {
    await createJob({ title: 'A', company: null, raw_text: 'x', parsed: {} });
    await createJob({ title: 'B', company: null, raw_text: 'y', parsed: {} });
    await expect(listJobs()).resolves.toHaveLength(2);
  });

  it('getJob returns null for an unknown id', async () => {
    await expect(getJob('missing')).resolves.toBeNull();
  });

  it('updateJob throws "Job not found" when no row matches', async () => {
    await expect(updateJob('nope', { title: 'X' })).rejects.toThrow('Job not found');
  });

  it('deleteJob removes the row', async () => {
    const job = await createJob({ title: 'A', company: null, raw_text: 'x', parsed: {} });
    await deleteJob(job.id);
    await expect(getJob(job.id)).resolves.toBeNull();
  });
});

describe('updateJobStatus', () => {
  // Fake timers so each transition happens at a distinguishable timestamp —
  // otherwise "preserve" and "re-stamp" produce identical ISO strings.
  const T1 = '2026-07-03T10:00:00.000Z';

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-03T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stamps applied_at on entering applied, only once', async () => {
    const job = await createJob({ title: 'A', company: null, raw_text: 'x', parsed: {} });
    const applied = await updateJobStatus(job.id, 'applied');
    expect(applied.status).toBe('applied');
    expect(applied.applied_at).toBe(T1);
    vi.advanceTimersByTime(60_000);
    const interviewing = await updateJobStatus(job.id, 'interviewing');
    expect(interviewing.applied_at).toBe(T1); // preserved, not re-stamped
    vi.advanceTimersByTime(60_000);
    // Re-entering applied with applied_at already set: the stamp-only-if-null
    // guard must keep the ORIGINAL stamp despite the advanced clock.
    const reApplied = await updateJobStatus(job.id, 'applied');
    expect(reApplied.applied_at).toBe(T1);
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
    expect(applied.applied_at).toBe(T1);
    vi.advanceTimersByTime(60_000);
    const offer = await updateJobStatus(job.id, 'offer');
    expect(offer.applied_at).toBe(T1);
    vi.advanceTimersByTime(60_000);
    const rejected = await updateJobStatus(job.id, 'rejected');
    expect(rejected.applied_at).toBe(T1);
  });

  it('re-stamps applied_at after a clear-then-reapply cycle', async () => {
    const job = await createJob({ title: 'A', company: null, raw_text: 'x', parsed: {} });
    const first = await updateJobStatus(job.id, 'applied');
    expect(first.applied_at).toBe(T1);
    await updateJobStatus(job.id, 'saved'); // clears applied_at
    vi.advanceTimersByTime(60_000);
    const second = await updateJobStatus(job.id, 'applied');
    expect(second.applied_at).toBe('2026-07-03T10:01:00.000Z'); // new stamp, T2 !== T1
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

describe('createJobFromSearch', () => {
  const RESULT = {
    source: 'adzuna' as const, source_id: '5001', title: 'Dev', company: 'ACME',
    location: 'Berlin', remote: null, salary: null,
    url: 'https://example.com/5001', description: 'JD text here', posted_at: null,
  };

  it('inserts a job with source provenance and valid parsed payload', async () => {
    const job = await createJobFromSearch(RESULT);
    expect(job).toMatchObject({ title: 'Dev', company: 'ACME', source: 'adzuna', source_id: '5001', user_id: 'user_1' });
    expect(job.raw_text).toBe('JD text here');
    // parsed must satisfy validateParsedJd so the job page + tailoring work:
    expect(job.parsed).toMatchObject({ title: 'Dev', company: 'ACME', location: 'Berlin', requirements: [], keywords: [] });
    expect(validateParsedJd(job.parsed)).not.toBeNull();
  });

  it('is idempotent: re-saving returns the existing row', async () => {
    const first = await createJobFromSearch(RESULT);
    const second = await createJobFromSearch(RESULT);
    expect(second.id).toBe(first.id);
  });

  it('listSavedSourceIds returns source pairs for source-backed rows only', async () => {
    await createJobFromSearch(RESULT);
    await createJob({ title: 'pasted', company: null, raw_text: 'x', parsed: {} });
    await expect(listSavedSourceIds()).resolves.toEqual([{ source: 'adzuna', source_id: '5001' }]);
  });
});

it('updateJob accepts a notes patch', async () => {
  const job = await createJob({ title: 'A', company: null, raw_text: 'x', parsed: {} });
  const updated = await updateJob(job.id, { notes: 'phone screen Friday' });
  expect(updated.notes).toBe('phone screen Friday');
});
