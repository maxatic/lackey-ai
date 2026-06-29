import { describe, it, expect, vi, beforeEach } from 'vitest';

const rows = [
  { id: 's1', user_id: 'u1', name: 'TypeScript', category: 'Languages', proficiency: 'Expert', sort_order: 0 },
  { id: 's2', user_id: 'u1', name: 'Figma', category: 'Tools', proficiency: null, sort_order: 1 },
];

// Chainable query-builder stub. Terminal awaits resolve via `then`.
function makeBuilder(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {};
  for (const m of ['select', 'insert', 'update', 'delete', 'eq', 'order']) {
    builder[m] = vi.fn(() => builder);
  }
  builder.single = vi.fn(() => Promise.resolve(result));
  builder.then = (onF: (v: unknown) => unknown) => Promise.resolve(result).then(onF);
  return builder;
}

const fromMock = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: () => Promise.resolve({ from: fromMock }),
}));
vi.mock('@/lib/auth/ensure-user', () => ({ ensureUser: vi.fn(() => Promise.resolve()) }));
vi.mock('@clerk/nextjs/server', () => ({ auth: () => Promise.resolve({ userId: 'u1' }) }));

import { listSkills, createSkill, updateSkill, deleteSkill } from './skills';

beforeEach(() => {
  fromMock.mockReset();
});

describe('skills db helpers', () => {
  it('listSkills returns rows ordered by sort_order', async () => {
    const b = makeBuilder({ data: rows, error: null });
    fromMock.mockReturnValue(b);
    const result = await listSkills();
    expect(fromMock).toHaveBeenCalledWith('skills');
    expect(b.select).toHaveBeenCalledWith('*');
    expect(b.order).toHaveBeenCalledWith('sort_order', { ascending: true });
    expect(result).toEqual(rows);
  });

  it('createSkill injects user_id, inserts and returns the new row', async () => {
    const newRow = rows[0];
    const b = makeBuilder({ data: newRow, error: null });
    fromMock.mockReturnValue(b);
    const result = await createSkill({ name: 'TypeScript', category: 'Languages', proficiency: 'Expert' });
    expect(b.insert).toHaveBeenCalledWith({ name: 'TypeScript', category: 'Languages', proficiency: 'Expert', user_id: 'u1' });
    expect(b.single).toHaveBeenCalled();
    expect(result).toEqual(newRow);
  });

  it('updateSkill patches by id and returns the row', async () => {
    const updated = { ...rows[0], proficiency: 'Advanced' };
    const b = makeBuilder({ data: updated, error: null });
    fromMock.mockReturnValue(b);
    const result = await updateSkill('s1', { proficiency: 'Advanced' });
    expect(b.update).toHaveBeenCalledWith({ proficiency: 'Advanced' });
    expect(b.eq).toHaveBeenCalledWith('id', 's1');
    expect(result).toEqual(updated);
  });

  it('deleteSkill deletes by id', async () => {
    const b = makeBuilder({ data: null, error: null });
    fromMock.mockReturnValue(b);
    await deleteSkill('s1');
    expect(b.delete).toHaveBeenCalled();
    expect(b.eq).toHaveBeenCalledWith('id', 's1');
  });

  it('throws when Supabase returns an error', async () => {
    const b = makeBuilder({ data: null, error: { message: 'boom' } });
    fromMock.mockReturnValue(b);
    await expect(listSkills()).rejects.toThrow('boom');
  });

  it('updateSkill throws when Supabase returns an error', async () => {
    const b = makeBuilder({ data: null, error: { message: 'boom' } });
    fromMock.mockReturnValue(b);
    await expect(updateSkill('s1', { name: 'x' })).rejects.toThrow('boom');
  });

  it('deleteSkill throws when Supabase returns an error', async () => {
    const b = makeBuilder({ data: null, error: { message: 'boom' } });
    fromMock.mockReturnValue(b);
    await expect(deleteSkill('s1')).rejects.toThrow('boom');
  });
});
