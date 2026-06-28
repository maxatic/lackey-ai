import { describe, it, expect, vi, beforeEach } from 'vitest';

const upsert = vi.fn().mockResolvedValue({ error: null });
const from = vi.fn(() => ({ upsert }));
const authMock = vi.fn();

vi.mock('@clerk/nextjs/server', () => ({
  auth: () => authMock(),
}));
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: async () => ({ from }),
}));

import { ensureUser } from './ensure-user';

describe('ensureUser', () => {
  beforeEach(() => {
    upsert.mockClear();
    from.mockClear();
    authMock.mockReset();
  });

  it('upserts the users row keyed on id with onConflict', async () => {
    authMock.mockResolvedValue({ userId: 'user_abc' });
    await ensureUser();

    expect(from).toHaveBeenCalledWith('users');
    expect(upsert).toHaveBeenCalledWith(
      { id: 'user_abc' },
      { onConflict: 'id', ignoreDuplicates: true },
    );
  });

  it('is idempotent: calling twice issues an upsert each time, both keyed on id', async () => {
    authMock.mockResolvedValue({ userId: 'user_abc' });
    await ensureUser();
    await ensureUser();

    expect(upsert).toHaveBeenCalledTimes(2);
    for (const call of upsert.mock.calls) {
      expect(call[0]).toEqual({ id: 'user_abc' });
      expect(call[1]).toEqual({ onConflict: 'id', ignoreDuplicates: true });
    }
  });

  it('no-ops when there is no authenticated user', async () => {
    authMock.mockResolvedValue({ userId: null });
    await ensureUser();
    expect(from).not.toHaveBeenCalled();
  });
});
