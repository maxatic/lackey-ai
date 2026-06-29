// src/lib/db/bullets.ts
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ensureUser } from '@/lib/auth/ensure-user';
import type { Database } from '@/lib/db/database.types';

export type Bullet = Database['public']['Tables']['bullets']['Row'];

export type BulletInput = Omit<
  Database['public']['Tables']['bullets']['Insert'],
  'id' | 'user_id' | 'created_at' | 'updated_at'
>;

export async function listBullets(entryId: string): Promise<Bullet[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('bullets')
    .select('*')
    .eq('entry_id', entryId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createBullet(input: BulletInput): Promise<Bullet> {
  await ensureUser();
  const { userId } = await auth();
  if (!userId) throw new Error('Not authenticated');
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('bullets')
    .insert({
      user_id: userId,
      entry_id: input.entry_id,
      text: input.text,
      tags: input.tags ?? [],
      sort_order: input.sort_order ?? 0,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function updateBullet(
  id: string,
  patch: Partial<BulletInput>,
): Promise<Bullet> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('bullets')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteBullet(id: string): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from('bullets').delete().eq('id', id);
  if (error) throw error;
}

export async function reorderBullets(
  entryId: string,
  orderedIds: string[],
): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const rows = orderedIds.map((id, index) => ({
    id,
    entry_id: entryId,
    sort_order: index,
  }));
  // ponytail: single upsert on PK `id` — one round-trip vs N updates; entry_id satisfies NOT NULL
  const { error } = await supabase
    .from('bullets')
    .upsert(rows, { onConflict: 'id' });
  if (error) throw error;
}
