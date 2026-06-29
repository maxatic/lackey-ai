/* eslint-disable @typescript-eslint/no-explicit-any */
// src/lib/db/tracks.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

// In-memory rows the stub reads/writes.
let rows: any[] = [];
let nextId = 1;

// Minimal chainable query builder matching the calls our helpers make.
// IMPORTANT: the builder itself is NOT thenable (the client object is not awaited directly).
// Terminal methods (single, order) return Promise.resolve(result).
// delete().eq() chain: eq() returns a thenable builder so `await .delete().eq()` resolves to result.
//
// Mutation ordering: Supabase chains go update(patch).eq(id) and delete().eq(id).
// So eq() must apply deferred mutations once the id is known.
function makeQuery(_table: string) {
  let pending: any[] | null = null; // rows staged by insert for select().single()
  let pendingPatch: any | null = null; // patch staged by update(), applied in eq()
  let isDelete = false; // delete() sets this, eq() applies it
  const builder: any = {
    select() { return builder; },
    order() { return Promise.resolve({ data: [...rows], error: null }); },
    insert(values: any) {
      const row = { id: String(nextId++), sort_order: 0, ...values };
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
  };
  return builder;
}

// Error-path builder: every terminal resolves to { data: null, error: { message: 'boom' } }
// then() makes the builder itself thenable for delete().eq() path.
function makeErrorQuery(_table: string) {
  const err = { message: 'boom' };
  const result = { data: null, error: err };
  const builder: any = {
    select() { return builder; },
    order() { return Promise.resolve(result); },
    insert() { return builder; },
    update() { return builder; },
    delete() { return builder; },
    eq() { return builder; },
    then(onFulfilled: (v: any) => any) {
      return Promise.resolve(result).then(onFulfilled);
    },
    single() { return Promise.resolve(result); },
  };
  return builder;
}

// The client object returned by createServerSupabaseClient must NOT be thenable
// (it is not directly awaited); only the query builder is thenable.
let useErrorQuery = false;

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    from: (table: string) => useErrorQuery ? makeErrorQuery(table) : makeQuery(table),
  })),
}));
vi.mock('@/lib/auth/ensure-user', () => ({ ensureUser: vi.fn(async () => {}) }));
vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn(async () => ({ userId: 'u1' })) }));

import { listTracks, createTrack, updateTrack, deleteTrack } from './tracks';

beforeEach(() => {
  rows = [];
  nextId = 1;
  useErrorQuery = false;
});

describe('tracks db helpers', () => {
  it('creates a track with injected user_id and lists it', async () => {
    const created = await createTrack({ name: 'Product Manager', target_title: 'Senior PM' });
    expect(created.id).toBeTruthy();
    expect(created.name).toBe('Product Manager');
    expect(created.user_id).toBe('u1');
    const all = await listTracks();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe('Product Manager');
  });

  it('updates a track', async () => {
    const created = await createTrack({ name: 'Data' });
    const updated = await updateTrack(created.id, { summary: 'Data-focused profile' });
    expect(updated.summary).toBe('Data-focused profile');
  });

  it('deletes a track', async () => {
    const created = await createTrack({ name: 'UX' });
    await deleteTrack(created.id);
    const all = await listTracks();
    expect(all).toHaveLength(0);
  });

  it('creates multiple named tracks', async () => {
    await createTrack({ name: 'PM' });
    await createTrack({ name: 'Data' });
    const all = await listTracks();
    expect(all.map((t) => t.name).sort()).toEqual(['Data', 'PM']);
  });

  // Error-path tests: each must fail if its `if (error) throw` guard were removed.
  it('listTracks throws when Supabase returns an error', async () => {
    useErrorQuery = true;
    await expect(listTracks()).rejects.toThrow('boom');
  });

  it('createTrack throws when Supabase returns an error', async () => {
    useErrorQuery = true;
    await expect(createTrack({ name: 'X' })).rejects.toThrow('boom');
  });

  it('updateTrack throws when Supabase returns an error', async () => {
    useErrorQuery = true;
    await expect(updateTrack('any-id', { name: 'X' })).rejects.toThrow('boom');
  });

  it('deleteTrack throws when Supabase returns an error', async () => {
    useErrorQuery = true;
    await expect(deleteTrack('any-id')).rejects.toThrow('boom');
  });
});
