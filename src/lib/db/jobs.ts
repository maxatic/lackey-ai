// src/lib/db/jobs.ts
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ensureUser } from '@/lib/auth/ensure-user';
import type { Database, Json } from '@/lib/db/database.types';
import type { JobStatus } from './job-status';

export type Job = Database['public']['Tables']['job_descriptions']['Row'];

export async function listJobs(): Promise<Job[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('job_descriptions')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createJob(input: {
  title: string;
  company: string | null;
  raw_text: string;
  parsed: Json;
}): Promise<Job> {
  await ensureUser();
  const { userId } = await auth();
  if (!userId) throw new Error('Not authenticated');
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('job_descriptions')
    .insert({ ...input, user_id: userId })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function getJob(id: string): Promise<Job | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('job_descriptions')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function updateJob(
  id: string,
  patch: Partial<{ title: string; company: string | null; notes: string }>,
): Promise<Job> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('job_descriptions')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Job not found');
  return data;
}

export async function updateJobStatus(id: string, status: JobStatus): Promise<Job> {
  const current = await getJob(id);
  if (!current) throw new Error('Job not found');
  const applied_at =
    status === 'applied'
      ? (current.applied_at ?? new Date().toISOString())
      : status === 'saved' || status === 'prepared'
        ? null
        : current.applied_at;
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('job_descriptions')
    .update({ status, applied_at, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Job not found');
  return data;
}

// Forward-only auto-advance. Atomic conditional update — a read-then-write here
// could race a concurrent manual status change and downgrade it.
export async function advanceJobToPrepared(id: string): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from('job_descriptions')
    .update({ status: 'prepared', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'saved');
  if (error) throw error;
}

export async function deleteJob(id: string): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from('job_descriptions').delete().eq('id', id);
  if (error) throw error;
}
