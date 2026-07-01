import { auth } from '@clerk/nextjs/server';
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
  const { userId } = await auth();
  if (!userId) throw new Error('Not authenticated');
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
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('cv_documents')
    .select('*')
    .eq('track_id', trackId)
    .eq('locale', locale)
    .is('job_id', null)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function listCvDocuments(trackId: string, jobId: string | null = null): Promise<CvDocument[]> {
  const supabase = await createServerSupabaseClient();
  const query = supabase
    .from('cv_documents')
    .select('*')
    .eq('track_id', trackId);
  const { data, error } = await (jobId === null ? query.is('job_id', null) : query.eq('job_id', jobId))
    .order('locale', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listCvDocumentsByJob(jobId: string): Promise<CvDocument[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('cv_documents')
    .select('*')
    .eq('job_id', jobId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
