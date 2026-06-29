import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/db/database.types';

// Clerk owns the session; Supabase auth comes entirely from the Clerk JWT via
// the accessToken option. Use the plain @supabase/supabase-js createClient — NOT
// @supabase/ssr's createServerClient, whose cookie helpers access
// supabase.auth.onAuthStateChange, which throws when accessToken mode is set
// (that threw on every dashboard query in production).
export async function createServerSupabaseClient(): Promise<SupabaseClient<Database>> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  const { getToken } = await auth();
  return createClient<Database>(url, anon, {
    accessToken: async () => (await getToken()) ?? null,
  });
}
