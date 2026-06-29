/* eslint-disable @typescript-eslint/no-explicit-any */
// src/lib/db/cv-documents.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

// In-memory rows the stub reads/writes.
let rows: any[] = [];
let nextId = 1;

// Minimal chainable query builder matching the calls our helpers make.
// IMPORTANT: the builder itself is NOT thenable (the client object is not awaited directly).
// Terminal methods (single, maybeSingle, order) return Promise.resolve(result).
// upsert().select().single() — upsert stages a row, select() is a pass-through, single() resolves.
// select().eq().eq().maybeSingle() — two eq() filters, then maybeSingle() resolves.
// select().eq().order() — one eq() filter, order() resolves filtered rows.
function makeQuery(_table: string) {
  let pending: any[] | null = null;    // rows staged by upsert for select().single()
  let filters: Array<[string, any]> = []; // accumulated eq() filters

  const builder: any = {
    select() { return builder; },
    upsert(values: any, opts: { onConflict?: string } = {}) {
      if (opts.onConflict) {
        // upsert: find existing row by conflict key columns, update or insert
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

// Error-path builder: every terminal resolves to { data: null, error: { message: 'boom' } }
function makeErrorQuery(_table: string) {
  const err = { message: 'boom' };
  const result = { data: null, error: err };
  const builder: any = {
    select() { return builder; },
    upsert() { return builder; },
    eq() { return builder; },
    order() { return Promise.resolve(result); },
    single() { return Promise.resolve(result); },
    maybeSingle() { return Promise.resolve(result); },
  };
  return builder;
}

// The client object returned by createServerSupabaseClient must NOT be thenable.
let useErrorQuery = false;

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    from: (table: string) => useErrorQuery ? makeErrorQuery(table) : makeQuery(table),
  })),
}));
vi.mock('@/lib/auth/ensure-user', () => ({ ensureUser: vi.fn(async () => {}) }));
vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn(async () => ({ userId: 'u1' })) }));

import { upsertCvDocument, getCvDocument, listCvDocuments } from './cv-documents';

beforeEach(() => {
  rows = [];
  nextId = 1;
  useErrorQuery = false;
});

describe('cv-documents db helpers', () => {
  it('upsertCvDocument injects user_id and returns the row', async () => {
    const doc = await upsertCvDocument({ track_id: 'track-1', locale: 'de', storage_path: 's3://cvs/u1/de.pdf' });
    expect(doc.user_id).toBe('u1');
    expect(doc.track_id).toBe('track-1');
    expect(doc.locale).toBe('de');
    expect(doc.storage_path).toBe('s3://cvs/u1/de.pdf');
    expect(doc.id).toBeTruthy();
  });

  it('upsertCvDocument upserts on conflict track_id,locale (updates existing row)', async () => {
    await upsertCvDocument({ track_id: 'track-1', locale: 'de', storage_path: 'old.pdf' });
    const updated = await upsertCvDocument({ track_id: 'track-1', locale: 'de', storage_path: 'new.pdf' });
    expect(updated.storage_path).toBe('new.pdf');
    // only one row for same track_id+locale
    expect(rows.filter((r) => r.track_id === 'track-1' && r.locale === 'de')).toHaveLength(1);
  });

  it('getCvDocument filters by track_id and locale', async () => {
    await upsertCvDocument({ track_id: 'track-1', locale: 'de', storage_path: 'de.pdf' });
    await upsertCvDocument({ track_id: 'track-1', locale: 'en', storage_path: 'en.pdf' });
    const doc = await getCvDocument('track-1', 'de');
    expect(doc?.locale).toBe('de');
    expect(doc?.storage_path).toBe('de.pdf');
  });

  it('getCvDocument returns null when not found', async () => {
    const doc = await getCvDocument('no-such-track', 'de');
    expect(doc).toBeNull();
  });

  it('listCvDocuments returns all docs for a track', async () => {
    await upsertCvDocument({ track_id: 'track-1', locale: 'de', storage_path: 'de.pdf' });
    await upsertCvDocument({ track_id: 'track-1', locale: 'en', storage_path: 'en.pdf' });
    await upsertCvDocument({ track_id: 'track-2', locale: 'fr', storage_path: 'fr.pdf' });
    const docs = await listCvDocuments('track-1');
    expect(docs).toHaveLength(2);
    expect(docs.every((d) => d.track_id === 'track-1')).toBe(true);
  });

  // Non-vacuous error-path tests: these MUST fail if `if (error) throw error` is removed.
  it('upsertCvDocument throws when Supabase returns an error', async () => {
    useErrorQuery = true;
    await expect(
      upsertCvDocument({ track_id: 'track-1', locale: 'de', storage_path: 'x.pdf' })
    ).rejects.toThrow('boom');
  });

  it('getCvDocument throws when Supabase returns an error', async () => {
    useErrorQuery = true;
    await expect(getCvDocument('track-1', 'de')).rejects.toThrow('boom');
  });

  it('listCvDocuments throws when Supabase returns an error', async () => {
    useErrorQuery = true;
    await expect(listCvDocuments('track-1')).rejects.toThrow('boom');
  });
});
