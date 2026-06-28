import { createServerClient } from '@supabase/ssr';
import { auth } from '@clerk/nextjs/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/db/database.types';

// ponytail: cookies is a no-op stub — Clerk owns the session, so Supabase auth comes
// entirely from accessToken; createServerClient still requires the cookies option present.
export async function createServerSupabaseClient(): Promise<SupabaseClient<Database>> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  const { getToken } = await auth();
  return createServerClient<Database>(
    url,
    anon,
    {
      cookies: { getAll: () => [], setAll: () => {} },
      accessToken: async () => (await getToken()) ?? null,
    },
  );
}
