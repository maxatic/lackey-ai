import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ensureUser } from '@/lib/auth/ensure-user';
import type { Database } from '@/lib/db/database.types';

export type EntryKind = Database['public']['Enums']['entry_kind'];

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
  if (error) throw new Error(error.message);
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
  if (error) throw new Error(error.message);
  return data;
}

export async function updateEntry(id: string, patch: Partial<EntryInput>): Promise<Entry> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('entries')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteEntry(id: string): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from('entries').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ---- UI metadata: which details keys each kind exposes. Source of truth: spec §4.3. ----
export const KIND_LABELS: Record<EntryKind, string> = {
  experience: 'Experience',
  education: 'Education',
  project: 'Project',
  certification: 'Certification',
  award: 'Award',
  publication: 'Publication',
  volunteering: 'Volunteering',
};

export const DETAIL_FIELDS: Record<EntryKind, { key: string; label: string }[]> = {
  experience: [{ key: 'employment_type', label: 'Employment type' }],
  education: [
    { key: 'degree', label: 'Degree' },
    { key: 'field_of_study', label: 'Field of study' },
    { key: 'grade', label: 'Grade' },
  ],
  project: [
    { key: 'url', label: 'URL' },
    { key: 'role', label: 'Role' },
  ],
  certification: [
    { key: 'credential_id', label: 'Credential ID' },
    { key: 'url', label: 'URL' },
    { key: 'issued', label: 'Issued' },
    { key: 'expires', label: 'Expires' },
  ],
  publication: [
    { key: 'url', label: 'URL' },
    { key: 'venue', label: 'Venue' },
  ],
  award: [{ key: 'issuer', label: 'Issuer' }],
  volunteering: [{ key: 'cause', label: 'Cause' }],
};

export const ENTRY_KINDS = Object.keys(KIND_LABELS) as EntryKind[];
