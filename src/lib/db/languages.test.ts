import { describe, it, expect, vi, beforeEach } from 'vitest';

const rows = [
  { id: 'l1', user_id: 'u1', name: 'German', cefr_level: 'B2' },
  { id: 'l2', user_id: 'u1', name: 'English', cefr_level: 'native' },
];

function makeBuilder(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {};
  for (const m of ['select', 'insert', 'update', 'delete', 'eq', 'order']) {
    builder[m] = vi.fn(() => builder);
  }
  builder.single = vi.fn(() => Promise.resolve(result));
  builder.maybeSingle = vi.fn(() => Promise.resolve(result));
  builder.then = (onF: (v: unknown) => unknown) => Promise.resolve(result).then(onF);
  return builder;
}

const fromMock = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: () => Promise.resolve({ from: fromMock }),
}));
vi.mock('@/lib/auth/ensure-user', () => ({ ensureUser: vi.fn(() => Promise.resolve()) }));
vi.mock('@clerk/nextjs/server', () => ({ auth: () => Promise.resolve({ userId: 'u1' }) }));

import {
  listLanguages,
  createLanguage,
  updateLanguage,
  deleteLanguage,
  CEFR_LEVELS,
} from './languages';

beforeEach(() => {
  fromMock.mockReset();
});

describe('languages db helpers', () => {
  it('CEFR_LEVELS lists A1..C2 plus native', () => {
    expect(CEFR_LEVELS).toEqual(['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'native']);
  });

  it('listLanguages returns rows ordered by name', async () => {
    const b = makeBuilder({ data: rows, error: null });
    fromMock.mockReturnValue(b);
    const result = await listLanguages();
    expect(fromMock).toHaveBeenCalledWith('languages');
    expect(b.order).toHaveBeenCalledWith('name', { ascending: true });
    expect(result).toEqual(rows);
  });

  it('createLanguage injects user_id and returns the row', async () => {
    const b = makeBuilder({ data: rows[0], error: null });
    fromMock.mockReturnValue(b);
    const result = await createLanguage({ name: 'German', cefr_level: 'B2' });
    expect(b.insert).toHaveBeenCalledWith({ name: 'German', cefr_level: 'B2', user_id: 'u1' });
    expect(result).toEqual(rows[0]);
  });

  it('updateLanguage patches by id', async () => {
    const updated = { ...rows[0], cefr_level: 'C1' };
    const b = makeBuilder({ data: updated, error: null });
    fromMock.mockReturnValue(b);
    const result = await updateLanguage('l1', { cefr_level: 'C1' });
    expect(b.update).toHaveBeenCalledWith({ cefr_level: 'C1' });
    expect(b.eq).toHaveBeenCalledWith('id', 'l1');
    expect(result).toEqual(updated);
  });

  it('deleteLanguage deletes by id', async () => {
    const b = makeBuilder({ data: null, error: null });
    fromMock.mockReturnValue(b);
    await deleteLanguage('l1');
    expect(b.delete).toHaveBeenCalled();
    expect(b.eq).toHaveBeenCalledWith('id', 'l1');
  });

  it('throws on Supabase error', async () => {
    const b = makeBuilder({ data: null, error: { message: 'nope' } });
    fromMock.mockReturnValue(b);
    await expect(listLanguages()).rejects.toThrow('nope');
  });

  it('updateLanguage throws when Supabase returns an error', async () => {
    const b = makeBuilder({ data: null, error: { message: 'boom' } });
    fromMock.mockReturnValue(b);
    await expect(updateLanguage('l1', { cefr_level: 'C1' })).rejects.toThrow('boom');
  });

  it('updateLanguage throws "Language not found" for an unknown id', async () => {
    const b = makeBuilder({ data: null, error: null });
    fromMock.mockReturnValue(b);
    await expect(updateLanguage('missing-id', { cefr_level: 'C1' })).rejects.toThrow('Language not found');
  });

  it('deleteLanguage throws when Supabase returns an error', async () => {
    const b = makeBuilder({ data: null, error: { message: 'boom' } });
    fromMock.mockReturnValue(b);
    await expect(deleteLanguage('l1')).rejects.toThrow('boom');
  });
});
