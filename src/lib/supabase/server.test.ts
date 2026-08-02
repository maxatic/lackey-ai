import { describe, it, expect, vi, beforeEach } from 'vitest';

const createClient = vi.fn();

vi.mock('@supabase/supabase-js', () => ({ createClient }));

describe('createServerSupabaseClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    createClient.mockReturnValue({ __client: true });
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://x.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  it('builds a plain supabase-js client with url and service role key', async () => {
    const { createServerSupabaseClient } = await import('./server');
    const client = await createServerSupabaseClient();

    expect(client).toEqual({ __client: true });
    expect(createClient).toHaveBeenCalledTimes(1);
    const [url, key, opts] = createClient.mock.calls[0];
    expect(url).toBe('https://x.supabase.co');
    expect(key).toBe('service-role-key');
    expect(opts).toEqual({
      auth: { persistSession: false, autoRefreshToken: false },
    });
  });

  it('throws when service role key is missing', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const { createServerSupabaseClient } = await import('./server');
    await expect(createServerSupabaseClient()).rejects.toThrow(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY',
    );
  });
});
