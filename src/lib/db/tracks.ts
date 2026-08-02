// src/lib/db/tracks.ts
import { getUserId } from '@/lib/auth/local-user';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ensureUser } from '@/lib/auth/ensure-user';
import type { Database } from '@/lib/db/database.types';

export type Track = Database['public']['Tables']['career_tracks']['Row'];

export type TrackInput = Omit<
  Database['public']['Tables']['career_tracks']['Insert'],
  'id' | 'user_id' | 'created_at' | 'updated_at'
>;

export async function listTracks(): Promise<Track[]> {
  const userId = getUserId();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('career_tracks')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createTrack(input: TrackInput): Promise<Track> {
  await ensureUser();
  const userId = getUserId();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('career_tracks')
    .insert({ ...input, user_id: userId })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function updateTrack(id: string, patch: Partial<TrackInput>): Promise<Track> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('career_tracks')
    .update(patch)
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Track not found');
  return data;
}

export async function deleteTrack(id: string): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from('career_tracks').delete().eq('id', id);
  if (error) throw error;
}

export async function getTrack(id: string): Promise<Track | null> {
  const userId = getUserId();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('career_tracks')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}
