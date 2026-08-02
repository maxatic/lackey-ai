import { describe, it, expect, vi, beforeEach } from 'vitest';

const upsert = vi.fn().mockResolvedValue({ error: null });
const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
const eq = vi.fn(() => ({ maybeSingle }));
const select = vi.fn(() => ({ eq }));
const from = vi.fn(() => ({ upsert, select }));
const captureException = vi.fn();

vi.mock('@/lib/auth/local-user', () => ({
  getUserId: () => 'local-maxat-issaliyev',
  LOCAL_USER_NAME: 'Maxat Issaliyev',
  DEFAULT_LOCAL_USER_ID: 'local-maxat-issaliyev',
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
    maybeSingle.mockClear();
    maybeSingle.mockResolvedValue({ data: null, error: null });
    from.mockClear();
    captureException.mockClear();
  });

  it('upserts the users row and seeds personal_profile when missing', async () => {
    await ensureUser();

    expect(from).toHaveBeenCalledWith('users');
    expect(upsert).toHaveBeenCalledWith(
      { id: 'local-maxat-issaliyev' },
      { onConflict: 'id', ignoreDuplicates: true },
    );
    expect(from).toHaveBeenCalledWith('personal_profile');
    expect(upsert).toHaveBeenCalledWith(
      { user_id: 'local-maxat-issaliyev', full_name: 'Maxat Issaliyev' },
      { onConflict: 'user_id', ignoreDuplicates: true },
    );
  });

  it('does not re-seed profile when one already exists', async () => {
    maybeSingle.mockResolvedValueOnce({ data: { user_id: 'local-maxat-issaliyev' }, error: null });
    await ensureUser();

    expect(upsert).toHaveBeenCalledTimes(1);
    expect(upsert).toHaveBeenCalledWith(
      { id: 'local-maxat-issaliyev' },
      { onConflict: 'id', ignoreDuplicates: true },
    );
  });

  it('is idempotent: calling twice issues a users upsert each time', async () => {
    maybeSingle.mockResolvedValue({ data: { user_id: 'local-maxat-issaliyev' }, error: null });
    await ensureUser();
    await ensureUser();

    expect(upsert).toHaveBeenCalledTimes(2);
  });

  it('does not throw and reports to Sentry when the upsert errors', async () => {
    upsert.mockResolvedValueOnce({ error: new Error('db denied') });
    await expect(ensureUser()).resolves.toBeUndefined();
    expect(captureException).toHaveBeenCalledOnce();
  });
});
