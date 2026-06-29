import { describe, it, expect, vi, beforeEach } from 'vitest';

const getToken = vi.fn().mockResolvedValue('clerk.jwt.token');
const createClient = vi.fn();

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn().mockResolvedValue({ getToken }),
}));
// Clerk third-party auth = plain @supabase/supabase-js createClient + accessToken.
// NOT @supabase/ssr: its cookie helpers access supabase.auth.onAuthStateChange,
// which throws in accessToken mode and crashed every dashboard query in prod.
vi.mock('@supabase/supabase-js', () => ({ createClient }));

describe('createServerSupabaseClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createClient.mockReturnValue({ __client: true });
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://x.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
  });

  it('builds a plain supabase-js client with url, anon key, and a Clerk accessToken resolver', async () => {
    const { createServerSupabaseClient } = await import('./server');
    const client = await createServerSupabaseClient();

    expect(client).toEqual({ __client: true });
    expect(createClient).toHaveBeenCalledTimes(1);
    const [url, key, opts] = createClient.mock.calls[0];
    expect(url).toBe('https://x.supabase.co');
    expect(key).toBe('anon-key');
    expect(typeof opts.accessToken).toBe('function');

    // accessToken must resolve the live Clerk session token
    const token = await opts.accessToken();
    expect(token).toBe('clerk.jwt.token');
    expect(getToken).toHaveBeenCalledTimes(1);
  });
});
