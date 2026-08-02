// src/lib/db/bullets.ts
import { getUserId } from '@/lib/auth/local-user';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ensureUser } from '@/lib/auth/ensure-user';
import type { Database } from '@/lib/db/database.types';

export type Bullet = Database['public']['Tables']['bullets']['Row'];

export type BulletInput = Omit<
  Database['public']['Tables']['bullets']['Insert'],
  'id' | 'user_id' | 'created_at' | 'updated_at'
>;

export async function listBullets(entryId: string): Promise<Bullet[]> {
  const userId = getUserId();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('bullets')
    .select('*')
    .eq('user_id', userId)
    .eq('entry_id', entryId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createBullet(input: BulletInput): Promise<Bullet> {
  await ensureUser();
  const userId = getUserId();
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
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Bullet not found');
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
    sort_order: index,
  }));
  // ponytail: single upsert on PK `id` — one round-trip vs N updates.
  // entry_id is intentionally omitted: reorder must never reassign entry_id — omitting it means
  // the ON CONFLICT UPDATE touches only sort_order. Including it would let a caller silently move
  // a bullet to a different entry via a crafted payload (same-user data corruption).
  // Cast to Insert[]: partial rows are safe for upsert — DB merges with existing values
  const { error } = await supabase
    .from('bullets')
    .upsert(rows as Database['public']['Tables']['bullets']['Insert'][], { onConflict: 'id' });
  if (error) throw error;
}
