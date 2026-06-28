import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/db/database.types';

// Pass session?.getToken from `useSession()` (Clerk v6). Called inside a component / useMemo.
export function createBrowserSupabaseClient(
  getToken: () => Promise<string | null>,
): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  return createBrowserClient<Database>(
    url,
    anon,
    { accessToken: async () => (await getToken()) ?? null },
  );
}
