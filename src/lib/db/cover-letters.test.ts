/* eslint-disable @typescript-eslint/no-explicit-any */
// src/lib/db/cover-letters.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

// In-memory rows the stub reads/writes.
let rows: any[] = [];
let nextId = 1;

// Minimal chainable query builder matching the calls our helpers make.
// upsert().select().single() — upsert stages a row, select() is a pass-through, single() resolves.
// select().eq().eq().maybeSingle() — two eq() filters, then maybeSingle() resolves.
// select().eq().order() — one eq() filter, order() resolves filtered rows.
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
    order() {
      const filtered = filters.length
        ? rows.filter((r) => filters.every(([col, val]) => r[col] === val))
        : [...rows];
      filters = [];
      return Promise.resolve({ data: filtered, error: null });
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

import { upsertCoverLetter, getCoverLetter, listCoverLettersByJob } from './cover-letters';

beforeEach(() => {
  rows = [];
  nextId = 1;
});

describe('cover-letters db helpers', () => {
  it('upsertCoverLetter inserts with user_id and returns the row', async () => {
    const row = await upsertCoverLetter({ job_id: 'j1', track_id: 't1', points: [], body: 'Dear team' });
    expect(row.user_id).toBe('user_1');
    expect(row.body).toBe('Dear team');
  });

  it('getCoverLetter returns null when absent', async () => {
    await expect(getCoverLetter('jX', 'tX')).resolves.toBeNull();
  });

  it('listCoverLettersByJob returns rows', async () => {
    await upsertCoverLetter({ job_id: 'j1', track_id: 't1', points: [], body: 'a' });
    await expect(listCoverLettersByJob('j1')).resolves.toHaveLength(1);
  });
});
