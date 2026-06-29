'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createTrack, updateTrack, deleteTrack, type TrackInput } from '@/lib/db/tracks';

function parse(formData: FormData): TrackInput {
  const str = (k: string) => {
    const v = (formData.get(k) as string | null)?.trim();
    return v ? v : null;
  };
  return {
    name: (() => {
      const v = str('name');
      if (!v) throw new Error('Track name is required');
      return v;
    })(),
    target_title: str('target_title'),
    summary: str('summary'),
    default_locale: str('default_locale'),
    default_template: str('default_template'),
  };
}

export async function createTrackAction(formData: FormData): Promise<void> {
  await createTrack(parse(formData));
  revalidatePath('/dashboard/tracks');
  redirect('/dashboard/tracks');
}

export async function updateTrackAction(id: string, formData: FormData): Promise<void> {
  await updateTrack(id, parse(formData));
  revalidatePath('/dashboard/tracks');
  redirect('/dashboard/tracks');
}

export async function deleteTrackAction(id: string): Promise<void> {
  await deleteTrack(id);
  revalidatePath('/dashboard/tracks');
}
