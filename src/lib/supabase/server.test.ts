import { describe, it, expect, vi, beforeEach } from 'vitest';

const getToken = vi.fn().mockResolvedValue('clerk.jwt.token');
const createServerClient = vi.fn();

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn().mockResolvedValue({ getToken }),
}));
vi.mock('@supabase/ssr', () => ({ createServerClient }));

describe('createServerSupabaseClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createServerClient.mockReturnValue({ __client: true });
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://x.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
  });

  it('builds a client with url, anon key, and a Clerk accessToken resolver', async () => {
    const { createServerSupabaseClient } = await import('./server');
    const client = await createServerSupabaseClient();

    expect(client).toEqual({ __client: true });
    expect(createServerClient).toHaveBeenCalledTimes(1);
    const [url, key, opts] = createServerClient.mock.calls[0];
    expect(url).toBe('https://x.supabase.co');
    expect(key).toBe('anon-key');
    expect(typeof opts.accessToken).toBe('function');

    // accessToken must resolve the live Clerk session token
    const token = await opts.accessToken();
    expect(token).toBe('clerk.jwt.token');
    expect(getToken).toHaveBeenCalledTimes(1);
  });
});
