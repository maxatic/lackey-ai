// src/lib/db/node-cvs.ts
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ensureUser } from '@/lib/auth/ensure-user';
import type { Database, Json } from '@/lib/db/database.types';

export type NodeCv = Database['public']['Tables']['node_cvs']['Row'];

export async function upsertNodeCv(input: {
  job_id: string;
  track_id: string;
  overrides: Json;
}): Promise<NodeCv> {
  await ensureUser();
  const { userId } = await auth();
  if (!userId) throw new Error('Not authenticated');
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('node_cvs')
    .upsert(
      { ...input, user_id: userId, updated_at: new Date().toISOString() },
      { onConflict: 'job_id,track_id' },
    )
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function getNodeCv(jobId: string, trackId: string): Promise<NodeCv | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('node_cvs')
    .select('*')
    .eq('job_id', jobId)
    .eq('track_id', trackId)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}
