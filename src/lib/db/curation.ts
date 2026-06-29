import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ensureUser } from '@/lib/auth/ensure-user';

async function requireUserId(): Promise<string> {
  await ensureUser();
  const { userId } = await auth();
  if (!userId) throw new Error('Not authenticated');
  return userId;
}

async function setLink(
  table: 'track_entries' | 'track_skills',
  fkCol: 'entry_id' | 'skill_id',
  trackId: string,
  orderedIds: string[],
): Promise<void> {
  const userId = await requireUserId();
  const supabase = await createServerSupabaseClient();

  const { error: delErr } = await supabase
    .from(table)
    .delete()
    .eq('user_id', userId)
    .eq('track_id', trackId);
  if (delErr) throw delErr;

  if (orderedIds.length === 0) return;

  const rows = orderedIds.map((id, sort_order) => ({
    user_id: userId,
    track_id: trackId,
    [fkCol]: id,
    sort_order,
  }));
  // ponytail: cast needed — computed key `[fkCol]` loses type narrowing; logic is correct
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: insErr } = await supabase.from(table).insert(rows as any);
  if (insErr) throw insErr;
}

async function getLinkIds(
  table: 'track_entries' | 'track_skills',
  fkCol: 'entry_id' | 'skill_id',
  trackId: string,
): Promise<string[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from(table)
    .select(`${fkCol}, sort_order`)
    .eq('track_id', trackId)
    .order('sort_order');
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => r[fkCol] as string);
}

export function setTrackEntries(
  trackId: string,
  orderedEntryIds: string[],
): Promise<void> {
  return setLink('track_entries', 'entry_id', trackId, orderedEntryIds);
}

export function setTrackSkills(
  trackId: string,
  orderedSkillIds: string[],
): Promise<void> {
  return setLink('track_skills', 'skill_id', trackId, orderedSkillIds);
}

export function getTrackEntryIds(trackId: string): Promise<string[]> {
  return getLinkIds('track_entries', 'entry_id', trackId);
}

export function getTrackSkillIds(trackId: string): Promise<string[]> {
  return getLinkIds('track_skills', 'skill_id', trackId);
}
