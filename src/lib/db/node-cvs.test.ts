/* eslint-disable @typescript-eslint/no-explicit-any */
// src/lib/db/node-cvs.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

// In-memory rows the stub reads/writes.
let rows: any[] = [];
let nextId = 1;

// Minimal chainable query builder matching the calls our helpers make.
// upsert().select().single() — upsert stages a row, select() is a pass-through, single() resolves.
// select().eq().eq().maybeSingle() — two eq() filters, then maybeSingle() resolves.
function makeQuery(_table: string) {
  let pending: any[] | null = null; // rows staged by upsert for select().single()
  let filters: Array<[string, any]> = []; // accumulated eq() filters

  const builder: any = {
    select() { return builder; },
    upsert(values: any, opts: { onConflict?: string } = {}) {
      if (opts.onConflict) {
        const conflictCols = opts.onConflict.split(',').map((s: string) => s.trim());
        const existing = rows.find((r) =>
          conflictCols.every((col: string) => r[col] === values[col])
        );
        if (existing) {
          Object.assign(existing, values);
          pending = [existing];
        } else {
          const row = { id: String(nextId++), ...values };
          rows.push(row);
          pending = [row];
        }
      } else {
        const row = { id: String(nextId++), ...values };
        rows.push(row);
        pending = [row];
      }
      return builder;
    },
    eq(col: string, val: any) {
      filters.push([col, val]);
      return builder;
    },
    single() {
      const result = pending ? pending[0] : null;
      pending = null;
      return Promise.resolve({ data: result, error: null });
    },
    maybeSingle() {
      const filtered = filters.length
        ? rows.filter((r) => filters.every(([col, val]) => r[col] === val))
        : [...rows];
      filters = [];
      return Promise.resolve({ data: filtered[0] ?? null, error: null });
    },
  };
  return builder;
}

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    from: (table: string) => makeQuery(table),
  })),
}));
vi.mock('@/lib/auth/ensure-user', () => ({ ensureUser: vi.fn(async () => {}) }));
vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn(async () => ({ userId: 'user_1' })) }));

import { upsertNodeCv, getNodeCv } from './node-cvs';

beforeEach(() => {
  rows = [];
  nextId = 1;
});

describe('node-cvs db helpers', () => {
  it('upsertNodeCv inserts with user_id and returns the row', async () => {
    const row = await upsertNodeCv({ job_id: 'j1', track_id: 't1', overrides: { entry_exclude: [] } });
    expect(row.user_id).toBe('user_1');
    expect(row.job_id).toBe('j1');
  });

  it('getNodeCv returns null when absent', async () => {
    await expect(getNodeCv('jX', 'tX')).resolves.toBeNull();
  });
});
