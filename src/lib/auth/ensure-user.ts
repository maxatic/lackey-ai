import { auth } from '@clerk/nextjs/server';
import * as Sentry from '@sentry/nextjs';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Upserts the Clerk-identified user into the `users` table on first
 * authenticated request. Idempotent: relies on the `users.id` primary key
 * with onConflict, and on DB column defaults for default_locale/plan.
 * ponytail: insert-only via ignoreDuplicates; no row-version churn on repeat logins.
 */
export async function ensureUser(): Promise<void> {
  const { userId } = await auth();
  if (!userId) return;

  // ponytail: report-and-swallow. A failed upsert (transient DB / RLS) must never
  // blank the dashboard; the row reconciles on the next authenticated request.
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from('users')
      .upsert({ id: userId }, { onConflict: 'id', ignoreDuplicates: true });
    if (error) throw error;
  } catch (err) {
    Sentry.captureException(err);
  }
}
