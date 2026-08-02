// src/lib/db/cover-letters.ts
import { getUserId } from '@/lib/auth/local-user';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ensureUser } from '@/lib/auth/ensure-user';
import type { Database, Json } from '@/lib/db/database.types';

export type CoverLetter = Database['public']['Tables']['cover_letters']['Row'];

export async function upsertCoverLetter(input: {
  job_id: string;
  track_id: string;
  points: Json;
  body: string;
}): Promise<CoverLetter> {
  await ensureUser();
  const userId = getUserId();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('cover_letters')
    .upsert(
      { ...input, user_id: userId, updated_at: new Date().toISOString() },
      { onConflict: 'job_id,track_id' },
    )
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function getCoverLetter(jobId: string, trackId: string): Promise<CoverLetter | null> {
  const userId = getUserId();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('cover_letters')
    .select('*')
    .eq('user_id', userId)
    .eq('job_id', jobId)
    .eq('track_id', trackId)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function listCoverLetterJobIds(): Promise<string[]> {
  const userId = getUserId();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('cover_letters')
    .select('job_id')
    .eq('user_id', userId);
  if (error) throw error;
  return [...new Set((data ?? []).map((r) => r.job_id))];
}

export async function listCoverLettersByJob(jobId: string): Promise<CoverLetter[]> {
  const userId = getUserId();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('cover_letters')
    .select('*')
    .eq('user_id', userId)
    .eq('job_id', jobId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
