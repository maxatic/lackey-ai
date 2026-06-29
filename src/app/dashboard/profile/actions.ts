// src/app/dashboard/profile/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { upsertProfile, type ProfileInput, type ProfileLink } from '@/lib/db/profile';

function emptyToNull(v: FormDataEntryValue | null): string | null {
  const s = typeof v === 'string' ? v.trim() : '';
  return s === '' ? null : s;
}

export async function saveProfile(formData: FormData): Promise<void> {
  const labels = formData.getAll('link_label').map(String);
  const urls = formData.getAll('link_url').map(String);
  const links: ProfileLink[] = labels
    .map((label, i) => ({ label: label.trim(), url: (urls[i] ?? '').trim() }))
    .filter((l) => l.label !== '' && l.url !== '');

  const input: ProfileInput = {
    full_name: emptyToNull(formData.get('full_name')),
    headline: emptyToNull(formData.get('headline')),
    email: emptyToNull(formData.get('email')),
    phone: emptyToNull(formData.get('phone')),
    location: emptyToNull(formData.get('location')),
    links,
    date_of_birth: emptyToNull(formData.get('date_of_birth')),
    nationality: emptyToNull(formData.get('nationality')),
    marital_status: emptyToNull(formData.get('marital_status')),
    gender: emptyToNull(formData.get('gender')),
    driving_license: emptyToNull(formData.get('driving_license')),
  };

  await upsertProfile(input);
  revalidatePath('/dashboard/profile');
}

export async function uploadPhoto(formData: FormData): Promise<void> {
  const file = formData.get('photo');
  if (!(file instanceof File) || file.size === 0) return;

  const { userId } = await auth();
  if (!userId) throw new Error('Not authenticated');

  const supabase = await createServerSupabaseClient();
  const path = `${userId}/avatar`; // stable path → overwrite on re-upload
  const { error } = await supabase.storage
    .from('profile-photos')
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;

  await upsertProfile({ photo_url: path });
  revalidatePath('/dashboard/profile');
}
