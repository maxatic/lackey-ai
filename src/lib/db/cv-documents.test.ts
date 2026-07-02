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
  let notNullCol: string | null = null; // .not(col, 'is', null) filter

  const builder: any = {
    select() { return builder; },
    not(col: string) { notNullCol = col; return builder; },
    // awaited chains without a terminal (select().not()) resolve here:
    then(onFulfilled: (v: any) => any) {
      const data = rows.filter((r) => notNullCol === null || r[notNullCol] !== null);
      return Promise.resolve({ data, error: null }).then(onFulfilled);
    },
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
    is(col: string, val: any) {
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
    is() { return builder; },
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

import {
  upsertCvDocument,
  getCvDocument,
  listCvDocuments,
  listCvDocumentsByJob,
  listCvDocumentJobIds,
} from './cv-documents';

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

  it('upsertCvDocument defaults job_id to null for master CVs', async () => {
    const doc = await upsertCvDocument({ track_id: 'track-1', locale: 'de', storage_path: 'de.pdf' });
    expect(doc.job_id).toBeNull();
  });

  it('upsertCvDocument upserts on conflict track_id,locale,job_id (node CV distinct from master)', async () => {
    await upsertCvDocument({ track_id: 'track-1', locale: 'de', storage_path: 'master.pdf' });
    const node = await upsertCvDocument({ track_id: 'track-1', locale: 'de', storage_path: 'node.pdf', job_id: 'job-1' });
    expect(node.job_id).toBe('job-1');
    // master + node coexist: two rows for same track_id+locale, different job_id
    expect(rows.filter((r) => r.track_id === 'track-1' && r.locale === 'de')).toHaveLength(2);
  });

  it('getCvDocument only returns the master (job_id null), not node CVs', async () => {
    await upsertCvDocument({ track_id: 'track-1', locale: 'de', storage_path: 'master.pdf' });
    await upsertCvDocument({ track_id: 'track-1', locale: 'de', storage_path: 'node.pdf', job_id: 'job-1' });
    const doc = await getCvDocument('track-1', 'de');
    expect(doc?.storage_path).toBe('master.pdf');
  });

  it('listCvDocuments(trackId) defaults to master docs only (job_id null)', async () => {
    await upsertCvDocument({ track_id: 'track-1', locale: 'de', storage_path: 'master.pdf' });
    await upsertCvDocument({ track_id: 'track-1', locale: 'de', storage_path: 'node.pdf', job_id: 'job-1' });
    const docs = await listCvDocuments('track-1');
    expect(docs).toHaveLength(1);
    expect(docs[0].storage_path).toBe('master.pdf');
  });

  it('listCvDocuments(trackId, jobId) returns only that job\'s node CVs', async () => {
    await upsertCvDocument({ track_id: 'track-1', locale: 'de', storage_path: 'master.pdf' });
    await upsertCvDocument({ track_id: 'track-1', locale: 'de', storage_path: 'node.pdf', job_id: 'job-1' });
    const docs = await listCvDocuments('track-1', 'job-1');
    expect(docs).toHaveLength(1);
    expect(docs[0].storage_path).toBe('node.pdf');
  });

  it('listCvDocumentsByJob returns all node CVs for a job across tracks', async () => {
    await upsertCvDocument({ track_id: 'track-1', locale: 'de', storage_path: 'node-de.pdf', job_id: 'job-1' });
    await upsertCvDocument({ track_id: 'track-2', locale: 'en', storage_path: 'node-en.pdf', job_id: 'job-1' });
    await upsertCvDocument({ track_id: 'track-1', locale: 'fr', storage_path: 'other-job.pdf', job_id: 'job-2' });
    const docs = await listCvDocumentsByJob('job-1');
    expect(docs).toHaveLength(2);
    expect(docs.every((d) => d.job_id === 'job-1')).toBe(true);
  });

  it('listCvDocumentJobIds returns distinct non-null job ids', async () => {
    // seed two docs with job_id 'j1', one with 'j2', one master (job_id null) via the mock's rows
    rows.push(
      { id: '1', job_id: 'j1' },
      { id: '2', job_id: 'j1' },
      { id: '3', job_id: 'j2' },
      { id: '4', job_id: null },
    );
    await expect(listCvDocumentJobIds()).resolves.toEqual(expect.arrayContaining(['j1', 'j2']));
    await expect(listCvDocumentJobIds()).resolves.toHaveLength(2);
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

  it('listCvDocumentsByJob throws when Supabase returns an error', async () => {
    useErrorQuery = true;
    await expect(listCvDocumentsByJob('job-1')).rejects.toThrow('boom');
  });
});
