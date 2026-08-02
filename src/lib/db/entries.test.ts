import { describe, it, expect, vi, beforeEach } from 'vitest';

const USER_ID = 'u1';

// Shared result object mutated per-test.
const result = { data: [] as unknown, error: null as null | { message: string } };
const calls: Array<[string, unknown[]]> = [];

// chain is thenable so `await supabase.from(...).delete().eq(...)` resolves to result.
// client is NOT thenable so `await createServerSupabaseClient()` returns the client object,
// not the chain (which would happen if client itself had .then).
const chain: Record<string, unknown> = {
  then(resolve: (v: typeof result) => unknown) {
    return resolve(result);
  },
};
for (const m of ['from', 'select', 'insert', 'update', 'delete', 'eq', 'order']) {
  chain[m] = (...args: unknown[]) => {
    calls.push([m, args]);
    return chain;
  };
}
// single() resolves directly (same semantics as before)
chain['single'] = (...args: unknown[]) => {
  calls.push(['single', args]);
  return Promise.resolve(result);
};
chain['maybeSingle'] = (...args: unknown[]) => {
  calls.push(['maybeSingle', args]);
  return Promise.resolve(result);
};

// Plain client — no .then, so await won't unwrap it into chain.
const client = {
  from: (...args: unknown[]) => {
    calls.push(['from', args]);
    return chain;
  },
};

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(async () => client),
}));
vi.mock('@/lib/auth/ensure-user', () => ({ ensureUser: vi.fn(async () => {}) }));
vi.mock('@/lib/auth/local-user', () => ({
  getUserId: () => USER_ID,
  LOCAL_USER_NAME: 'Maxat Issaliyev',
}));

import { listEntries, createEntry, updateEntry, deleteEntry } from './entries';

beforeEach(() => {
  calls.length = 0;
  result.data = [];
  result.error = null;
});

describe('listEntries', () => {
  it('selects entries for the local user ordered by sort_order, no kind filter', async () => {
    result.data = [{ id: 'e1', kind: 'experience', title: 'Dev', details: {} }];
    const rows = await listEntries();
    expect(calls).toContainEqual(['from', ['entries']]);
    expect(calls).toContainEqual(['select', ['*']]);
    expect(calls).toContainEqual(['eq', ['user_id', USER_ID]]);
    expect(calls).toContainEqual(['order', ['sort_order', { ascending: true }]]);
    expect(rows).toHaveLength(1);
  });

  it('filters by kind when provided', async () => {
    await listEntries('education');
    expect(calls).toContainEqual(['eq', ['user_id', USER_ID]]);
    expect(calls).toContainEqual(['eq', ['kind', 'education']]);
    expect(calls).toContainEqual(['order', ['sort_order', { ascending: true }]]);
  });

  it('throws when supabase returns an error', async () => {
    result.error = { message: 'list-fail' };
    await expect(listEntries()).rejects.toThrow('list-fail');
  });
});

describe('createEntry', () => {
  it('injects user_id, inserts and returns the single row, persisting details jsonb', async () => {
    result.data = {
      id: 'e2', kind: 'education', title: 'BSc',
      details: { degree: 'BSc', field_of_study: 'CS', grade: '1.0' },
    } as never;
    const row = await createEntry({
      kind: 'education', title: 'BSc',
      details: { degree: 'BSc', field_of_study: 'CS', grade: '1.0' },
    });
    expect(calls[0]).toEqual(['from', ['entries']]);
    const insertCall = calls.find(([m]) => m === 'insert');
    expect(insertCall?.[1][0]).toMatchObject({
      user_id: USER_ID,
      kind: 'education', title: 'BSc',
      details: { degree: 'BSc', field_of_study: 'CS', grade: '1.0' },
    });
    expect((row as unknown as { details: { degree: string } }).details.degree).toBe('BSc');
  });

  it('throws when supabase returns an error', async () => {
    result.error = { message: 'boom' };
    await expect(createEntry({ kind: 'project', title: 'x', details: {} }))
      .rejects.toThrow('boom');
  });
});

describe('updateEntry', () => {
  it('updates by id and returns the patched row', async () => {
    result.data = { id: 'e3', kind: 'project', title: 'Renamed', details: { url: 'https://x' } } as never;
    const row = await updateEntry('e3', { title: 'Renamed', details: { url: 'https://x' } });
    expect(calls).toContainEqual(['eq', ['id', 'e3']]);
    const updateCall = calls.find(([m]) => m === 'update');
    expect(updateCall?.[1][0]).toMatchObject({ title: 'Renamed', details: { url: 'https://x' } });
    expect((row as { id: string }).id).toBe('e3');
  });

  it('throws when supabase returns an error', async () => {
    result.error = { message: 'update-fail' };
    await expect(updateEntry('e3', { title: 'x' })).rejects.toThrow('update-fail');
  });

  it('updateEntry throws "Entry not found" for an unknown id', async () => {
    result.data = null;
    await expect(updateEntry('missing-id', { title: 'X' })).rejects.toThrow('Entry not found');
  });
});

describe('deleteEntry', () => {
  it('deletes by id', async () => {
    await deleteEntry('e4');
    expect(calls).toContainEqual(['delete', []]);
    expect(calls).toContainEqual(['eq', ['id', 'e4']]);
  });

  it('throws when supabase returns an error', async () => {
    result.error = { message: 'delete-fail' };
    await expect(deleteEntry('e4')).rejects.toThrow('delete-fail');
  });
});
