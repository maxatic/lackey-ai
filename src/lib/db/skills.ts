import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ensureUser } from '@/lib/auth/ensure-user';
import type { Database } from '@/lib/db/database.types';

export type Skill = Database['public']['Tables']['skills']['Row'];
export type SkillInput = Omit<
  Database['public']['Tables']['skills']['Insert'],
  'id' | 'user_id' | 'created_at' | 'updated_at'
>;

export async function listSkills(): Promise<Skill[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('skills')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createSkill(input: SkillInput): Promise<Skill> {
  await ensureUser();
  const { userId } = await auth();
  if (!userId) throw new Error('Not authenticated');
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('skills')
    .insert({ ...input, user_id: userId })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateSkill(id: string, patch: Partial<SkillInput>): Promise<Skill> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('skills')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteSkill(id: string): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from('skills').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
