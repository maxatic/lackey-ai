import { describe, it, expect, vi, beforeEach } from 'vitest';

const upsert = vi.fn().mockResolvedValue({ error: null });
const from = vi.fn(() => ({ upsert }));
const authMock = vi.fn();
const captureException = vi.fn();

vi.mock('@clerk/nextjs/server', () => ({
  auth: () => authMock(),
}));
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: async () => ({ from }),
}));
vi.mock('@sentry/nextjs', () => ({
  captureException: (...args: unknown[]) => captureException(...args),
}));

import { ensureUser } from './ensure-user';

describe('ensureUser', () => {
  beforeEach(() => {
    upsert.mockClear();
    upsert.mockResolvedValue({ error: null });
    from.mockClear();
    authMock.mockReset();
    captureException.mockClear();
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

  it('does not throw and reports to Sentry when the upsert errors', async () => {
    authMock.mockResolvedValue({ userId: 'user_abc' });
    upsert.mockResolvedValueOnce({ error: new Error('rls denied') });
    await expect(ensureUser()).resolves.toBeUndefined();
    expect(captureException).toHaveBeenCalledOnce();
  });
});
