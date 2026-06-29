// src/lib/db/bullets.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const USER_ID = 'u1';

// ---- mock the Supabase server client with a chainable query builder ----
type Row = Record<string, unknown>;
const state: {
  rows: Row[];
  lastInsert?: Row;
  lastUpdate?: Row;
  lastFilters: Record<string, unknown>;
  lastUpserts?: Row[];
} = { rows: [], lastFilters: {} };

function makeBuilder() {
  const builder: any = {
    _select: false,
    insert(vals: Row) {
      state.lastInsert = vals;
      state.rows = [{ id: 'b1', sort_order: 0, tags: [], ...vals }];
      return builder;
    },
    update(vals: Row) {
      state.lastUpdate = vals;
      state.rows = [{ ...(state.rows[0] ?? { id: 'b1' }), ...vals }];
      return builder;
    },
    upsert(vals: Row[]) {
      state.lastUpserts = vals;
      return Promise.resolve({ data: null, error: null });
    },
    delete() {
      return builder;
    },
    eq(col: string, val: unknown) {
      state.lastFilters[col] = val;
      return builder;
    },
    order() {
      return Promise.resolve({ data: state.rows, error: null });
    },
    select() {
      builder._select = true;
      return builder;
    },
    single() {
      return Promise.resolve({ data: state.rows[0], error: null });
    },
    // Make builder thenable so await on it (e.g. delete().eq()) resolves to { data, error }
    then(resolve: (v: { data: null; error: null }) => void) {
      resolve({ data: null, error: null });
    },
  };
  return builder;
}

const fromSpy = vi.fn(() => makeBuilder());

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(async () => ({ from: fromSpy })),
}));
vi.mock('@/lib/auth/ensure-user', () => ({ ensureUser: vi.fn(async () => {}) }));
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(async () => ({ userId: USER_ID })),
}));

import {
  listBullets,
  createBullet,
  updateBullet,
  deleteBullet,
  reorderBullets,
} from './bullets';

beforeEach(() => {
  state.rows = [];
  state.lastInsert = undefined;
  state.lastUpdate = undefined;
  state.lastUpserts = undefined;
  state.lastFilters = {};
  fromSpy.mockClear();
});

describe('bullets db helpers', () => {
  it('createBullet inserts user_id + text + tags array and returns the row', async () => {
    const bullet = await createBullet({
      entry_id: 'e1',
      text: 'Shipped X',
      tags: ['typescript', 'leadership'],
    });
    expect(fromSpy).toHaveBeenCalledWith('bullets');
    expect(state.lastInsert).toMatchObject({
      user_id: USER_ID,
      entry_id: 'e1',
      text: 'Shipped X',
      tags: ['typescript', 'leadership'],
    });
    expect(bullet.id).toBe('b1');
    expect(bullet.tags).toEqual(['typescript', 'leadership']);
  });

  it('listBullets filters by entry_id and orders by sort_order', async () => {
    state.rows = [{ id: 'b1', entry_id: 'e1', text: 'A', tags: ['x'], sort_order: 0 }];
    const rows = await listBullets('e1');
    expect(fromSpy).toHaveBeenCalledWith('bullets');
    expect(state.lastFilters.entry_id).toBe('e1');
    expect(rows[0].tags).toEqual(['x']);
  });

  it('updateBullet patches by id and returns the updated row', async () => {
    state.rows = [{ id: 'b1', text: 'old', tags: [], sort_order: 0 }];
    const row = await updateBullet('b1', { text: 'new', tags: ['k'] });
    expect(state.lastUpdate).toMatchObject({ text: 'new', tags: ['k'] });
    expect(state.lastFilters.id).toBe('b1');
    expect(row.text).toBe('new');
  });

  it('deleteBullet deletes by id', async () => {
    await deleteBullet('b1');
    expect(fromSpy).toHaveBeenCalledWith('bullets');
    expect(state.lastFilters.id).toBe('b1');
  });

  it('deleteBullet throws on error', async () => {
    const result = { data: null, error: { message: 'delete failed' } };
    // Override builder for this test so then() resolves to an error result
    fromSpy.mockImplementationOnce(() => {
      const b: any = {
        delete() { return b; },
        eq(col: string, val: unknown) {
          state.lastFilters[col] = val;
          return b;
        },
        then(resolve: (v: typeof result) => void) {
          resolve(result);
        },
      };
      return b;
    });
    await expect(deleteBullet('b1')).rejects.toThrow('delete failed');
  });

  it('reorderBullets upserts each id with its index as sort_order', async () => {
    await reorderBullets('e1', ['b3', 'b1', 'b2']);
    expect(state.lastUpserts).toEqual([
      { id: 'b3', entry_id: 'e1', sort_order: 0 },
      { id: 'b1', entry_id: 'e1', sort_order: 1 },
      { id: 'b2', entry_id: 'e1', sort_order: 2 },
    ]);
  });

  it('reorderBullets throws on error', async () => {
    fromSpy.mockImplementationOnce(() => ({
      upsert: vi.fn(() => Promise.resolve({ data: null, error: { message: 'upsert failed' } })),
    }));
    await expect(reorderBullets('e1', ['b1'])).rejects.toThrow('upsert failed');
  });
});
