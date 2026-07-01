import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ensureUser } from '@/lib/auth/ensure-user';
import type { Database } from '@/lib/db/database.types';
import type { EntryKind } from './entry-kinds';

export type { EntryKind } from './entry-kinds';
export { KIND_LABELS, DETAIL_FIELDS, ENTRY_KINDS } from './entry-kinds';

export type Entry = Database['public']['Tables']['entries']['Row'];

// user_id is injected server-side from the Clerk sub; never accepted from the client.
export type EntryInput = Omit<
  Database['public']['Tables']['entries']['Insert'],
  'id' | 'user_id' | 'created_at' | 'updated_at'
>;

export async function listEntries(kind?: EntryKind): Promise<Entry[]> {
  const supabase = await createServerSupabaseClient();
  let query = supabase.from('entries').select('*');
  if (kind) query = query.eq('kind', kind);
  const { data, error } = await query.order('sort_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createEntry(input: EntryInput): Promise<Entry> {
  await ensureUser();
  const { userId } = await auth();
  if (!userId) throw new Error('Not authenticated');
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('entries')
    .insert({ ...input, user_id: userId })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function updateEntry(id: string, patch: Partial<EntryInput>): Promise<Entry> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('entries')
    .update(patch)
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Entry not found');
  return data;
}

export async function deleteEntry(id: string): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from('entries').delete().eq('id', id);
  if (error) throw error;
}

