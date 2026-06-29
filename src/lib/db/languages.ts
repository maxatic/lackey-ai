import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ensureUser } from '@/lib/auth/ensure-user';
import type { Database } from '@/lib/db/database.types';

export type Language = Database['public']['Tables']['languages']['Row'];
export type { CefrLevel } from './cefr';
export { CEFR_LEVELS } from './cefr';
export type LanguageInput = Omit<
  Database['public']['Tables']['languages']['Insert'],
  'id' | 'user_id' | 'created_at' | 'updated_at'
>;

export async function listLanguages(): Promise<Language[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('languages')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createLanguage(input: LanguageInput): Promise<Language> {
  await ensureUser();
  const { userId } = await auth();
  if (!userId) throw new Error('Not authenticated');
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('languages')
    .insert({ ...input, user_id: userId })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateLanguage(id: string, patch: Partial<LanguageInput>): Promise<Language> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('languages')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteLanguage(id: string): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from('languages').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
