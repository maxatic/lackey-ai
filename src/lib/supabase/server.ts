import { createServerClient } from '@supabase/ssr';
import { auth } from '@clerk/nextjs/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/db/database.types';

// ponytail: cookies is a no-op stub — Clerk owns the session, so Supabase auth comes
// entirely from accessToken; createServerClient still requires the cookies option present.
export async function createServerSupabaseClient(): Promise<SupabaseClient<Database>> {
  const { getToken } = await auth();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: { getAll: () => [], setAll: () => {} },
      accessToken: async () => (await getToken()) ?? null,
    },
  );
}
