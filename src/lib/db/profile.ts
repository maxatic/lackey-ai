// src/lib/db/profile.ts
import { getUserId } from '@/lib/auth/local-user';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ensureUser } from '@/lib/auth/ensure-user';
import type { Database } from '@/lib/db/database.types';

export type Profile = Database['public']['Tables']['personal_profile']['Row'];
export type ProfileLink = { label: string; url: string };
// Content fields only; id/user_id/created_at/updated_at are server-managed.
// personal_profile has no `id` column (user_id is the PK), so omitting it is a no-op,
// but we keep the canonical Input shape for consistency across entities.
export type ProfileInput = Omit<
  Database['public']['Tables']['personal_profile']['Insert'],
  'id' | 'user_id' | 'created_at' | 'updated_at'
>;

async function requireUserId(): Promise<string> {
  const userId = getUserId();
  return userId;
}

export async function getProfile(): Promise<Profile | null> {
  const userId = await requireUserId();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('personal_profile')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function upsertProfile(input: ProfileInput): Promise<Profile> {
  const userId = await requireUserId();
  await ensureUser(); // guarantees the users row exists for the FK
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('personal_profile')
    .upsert({ ...input, user_id: userId, updated_at: new Date().toISOString() })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}
