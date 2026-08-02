import * as Sentry from '@sentry/nextjs';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUserId, LOCAL_USER_NAME } from '@/lib/auth/local-user';

/**
 * Ensures the local single-user row exists in `users` and seeds
 * `personal_profile.full_name` when missing. Idempotent.
 */
export async function ensureUser(): Promise<void> {
  const userId = getUserId();

  // Report-and-swallow: a failed upsert must never blank the dashboard.
  try {
    const supabase = await createServerSupabaseClient();
    const { error: userError } = await supabase
      .from('users')
      .upsert({ id: userId }, { onConflict: 'id', ignoreDuplicates: true });
    if (userError) throw userError;

    const { data: existing, error: profileReadError } = await supabase
      .from('personal_profile')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();
    if (profileReadError) throw profileReadError;

    if (!existing) {
      const { error: profileError } = await supabase
        .from('personal_profile')
        .upsert(
          { user_id: userId, full_name: LOCAL_USER_NAME },
          { onConflict: 'user_id', ignoreDuplicates: true },
        );
      if (profileError) throw profileError;
    }
  } catch (err) {
    Sentry.captureException(err);
  }
}
