'use server';

import { revalidatePath } from 'next/cache';
import { setTrackEntries, setTrackSkills } from '@/lib/db/curation';

export async function saveTrackEntries(
  trackId: string,
  orderedEntryIds: string[],
): Promise<void> {
  await setTrackEntries(trackId, orderedEntryIds);
  revalidatePath(`/dashboard/tracks/${trackId}/curate`);
}

export async function saveTrackSkills(
  trackId: string,
  orderedSkillIds: string[],
): Promise<void> {
  await setTrackSkills(trackId, orderedSkillIds);
  revalidatePath(`/dashboard/tracks/${trackId}/curate`);
}
