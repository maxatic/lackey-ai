'use server';
import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getCvData } from '@/lib/cv/data';
import { renderCv } from '@/lib/cv/render';
import { compilePdf } from '@/lib/cv/compile';
import { upsertCvDocument } from '@/lib/db/cv-documents';
import { CV_LOCALES, type CvLocale } from '@/lib/cv/types';

export async function generateCv(formData: FormData): Promise<{ url: string }> {
  const trackId = String(formData.get('track_id') ?? '');
  const locale = String(formData.get('locale') ?? '') as CvLocale;
  if (!trackId) throw new Error('Missing track');
  if (!CV_LOCALES.includes(locale)) throw new Error('Invalid locale');

  const { userId } = await auth();
  if (!userId) throw new Error('Not authenticated');

  const data = await getCvData(trackId, locale);
  const pdf = await compilePdf(renderCv(data));

  const supabase = await createServerSupabaseClient();
  const path = `${userId}/${trackId}-${locale}.pdf`;
  const { error: upError } = await supabase.storage
    .from('cvs')
    .upload(path, pdf, { upsert: true, contentType: 'application/pdf' });
  if (upError) throw upError;

  await upsertCvDocument({ track_id: trackId, locale, storage_path: path });

  const { data: signed, error: signError } = await supabase.storage
    .from('cvs')
    .createSignedUrl(path, 600);
  if (signError) throw signError;

  revalidatePath(`/dashboard/tracks/${trackId}`);
  return { url: signed.signedUrl };
}

export async function getSignedDownloadUrl(storagePath: string): Promise<{ url: string }> {
  const { userId } = await auth();
  if (!userId) throw new Error('Not authenticated');

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.storage
    .from('cvs')
    .createSignedUrl(storagePath, 600);
  if (error) throw error;
  return { url: data.signedUrl };
}
