/* eslint-disable @typescript-eslint/no-explicit-any */
// src/lib/db/jobs.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

// In-memory rows the stub reads/writes.
let rows: any[] = [];
let nextId = 1;

// Minimal chainable query builder matching the calls our helpers make.
// IMPORTANT: the builder itself is NOT thenable (the client object is not awaited directly).
// Terminal methods (single, maybeSingle, order) return Promise.resolve(result).
// delete().eq() chain: eq() returns a thenable builder so `await .delete().eq()` resolves to result.
//
// Mutation ordering: Supabase chains go update(patch).eq(id) and delete().eq(id).
// So eq() must apply deferred mutations once the id is known.
function makeQuery(_table: string) {
  let pending: any[] | null = null; // rows staged by insert for select().single()
  let pendingPatch: any | null = null; // patch staged by update(), applied in eq()
  let isDelete = false; // delete() sets this, eq() applies it
  let lastEqVal: string | null = null; // last eq() value, for maybeSingle() lookups
  const builder: any = {
    select() { return builder; },
    order() { return Promise.resolve({ data: [...rows], error: null }); },
    insert(values: any) {
      const row = { id: String(nextId++), ...values };
      rows.push(row);
      pending = [row];
      return builder;
    },
    update(patch: any) {
      pendingPatch = patch;
      return builder;
    },
    delete() {
      isDelete = true;
      return builder;
    },
    eq(_col: string, val: string) {
      lastEqVal = val;
      if (pendingPatch !== null) {
        // Apply deferred update now that we know the id
        const row = rows.find((r) => r.id === val);
        if (row) Object.assign(row, pendingPatch);
        pending = row ? [row] : [];
        pendingPatch = null;
      }
      if (isDelete) {
        rows = rows.filter((r) => r.id !== val);
        isDelete = false;
      }
      return builder;
    },
    // Makes delete().eq() awaitable: `await supabase.from(...).delete().eq(...)` resolves to result
    then(onFulfilled: (v: any) => any) {
      return Promise.resolve({ data: null, error: null }).then(onFulfilled);
    },
    single() { return Promise.resolve({ data: pending![0], error: null }); },
    maybeSingle() {
      return Promise.resolve({ data: pending?.[0] ?? rows.find((r) => r.id === lastEqVal) ?? null, error: null });
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
vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn(async () => ({ userId: 'user_1' })) }));

import { listJobs, createJob, getJob, updateJob, deleteJob } from './jobs';

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
