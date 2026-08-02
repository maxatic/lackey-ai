import { getUserId } from '@/lib/auth/local-user';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ensureUser } from '@/lib/auth/ensure-user';
import type { Database } from '@/lib/db/database.types';

export type CvDocument = Database['public']['Tables']['cv_documents']['Row'];

export async function upsertCvDocument(input: {
  track_id: string;
  locale: string;
  storage_path: string;
  job_id?: string | null;
}): Promise<CvDocument> {
  await ensureUser();
  const userId = getUserId();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('cv_documents')
    .upsert(
      { ...input, job_id: input.job_id ?? null, user_id: userId, updated_at: new Date().toISOString() },
      { onConflict: 'track_id,locale,job_id' },
    )
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function getCvDocument(trackId: string, locale: string): Promise<CvDocument | null> {
  const userId = getUserId();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('cv_documents')
    .select('*')
    .eq('user_id', userId)
    .eq('track_id', trackId)
    .eq('locale', locale)
    .is('job_id', null)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function listCvDocuments(trackId: string, jobId: string | null = null): Promise<CvDocument[]> {
  const userId = getUserId();
  const supabase = await createServerSupabaseClient();
  const query = supabase
    .from('cv_documents')
    .select('*')
    .eq('user_id', userId)
    .eq('track_id', trackId);
  const { data, error } = await (jobId === null ? query.is('job_id', null) : query.eq('job_id', jobId))
    .order('locale', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listCvDocumentJobIds(): Promise<string[]> {
  const userId = getUserId();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('cv_documents')
    .select('job_id')
    .eq('user_id', userId)
    .not('job_id', 'is', null);
  if (error) throw error;
  return [...new Set((data ?? []).map((r) => r.job_id as string))];
}

export async function listCvDocumentsByJob(jobId: string): Promise<CvDocument[]> {
  const userId = getUserId();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('cv_documents')
    .select('*')
    .eq('user_id', userId)
    .eq('job_id', jobId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
