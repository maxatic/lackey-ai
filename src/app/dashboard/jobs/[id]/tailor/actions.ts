'use server';
import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getJob } from '@/lib/db/jobs';
import { buildTrackSnapshot, toCvData, type TrackSnapshot } from '@/lib/cv/data';
import { suggestCvDiff, type CvSuggestions } from '@/lib/cv/suggest';
import { applyOverrides, validateOverrides } from '@/lib/cv/overrides';
import { renderCv } from '@/lib/cv/render';
import { compilePdf } from '@/lib/cv/compile';
import { upsertNodeCv } from '@/lib/db/node-cvs';
import { upsertCvDocument } from '@/lib/db/cv-documents';
import { CV_LOCALES, type CvLocale } from '@/lib/cv/types';
import { validateParsedJd } from '@/lib/jd/parse';

export async function suggestTailoringAction(
  jobId: string,
  trackId: string,
): Promise<{ suggestions: CvSuggestions; snapshot: TrackSnapshot } | { error: string }> {
  try {
    const job = await getJob(jobId);
    if (!job) return { error: 'Job not found' };
    const parsed = validateParsedJd(job.parsed);
    if (!parsed) return { error: 'This job has no parsed data — re-add it' };
    const snapshot = await buildTrackSnapshot(trackId);
    const suggestions = await suggestCvDiff(parsed, snapshot);
    return { suggestions, snapshot };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Suggestion failed' };
  }
}

export async function generateNodeCvAction(formData: FormData): Promise<{ url: string }> {
  const jobId = String(formData.get('job_id') ?? '');
  const trackId = String(formData.get('track_id') ?? '');
  const locale = String(formData.get('locale') ?? '') as CvLocale;
  if (!jobId || !trackId) throw new Error('Missing job or track');
  if (!CV_LOCALES.includes(locale)) throw new Error('Invalid locale');
  // Trust boundary: overrides JSON comes from the client — sanitize.
  let overridesRaw: unknown = {};
  try { overridesRaw = JSON.parse(String(formData.get('overrides') ?? '{}')); } catch { /* {} */ }
  const overrides = validateOverrides(overridesRaw);

  const { userId } = await auth();
  if (!userId) throw new Error('Not authenticated');

  await upsertNodeCv({ job_id: jobId, track_id: trackId, overrides });

  const snapshot = await buildTrackSnapshot(trackId);
  const data = toCvData(applyOverrides(snapshot, overrides), locale);
  const pdf = await compilePdf(renderCv(data));

  const supabase = await createServerSupabaseClient();
  const path = `${userId}/${trackId}-${locale}-${jobId}.pdf`;
  const { error: upError } = await supabase.storage
    .from('cvs')
    .upload(path, pdf, { upsert: true, contentType: 'application/pdf' });
  if (upError) throw upError;

  await upsertCvDocument({ track_id: trackId, locale, storage_path: path, job_id: jobId });

  const { data: signed, error: signError } = await supabase.storage
    .from('cvs')
    .createSignedUrl(path, 600);
  if (signError) throw signError;

  revalidatePath(`/dashboard/jobs/${jobId}`);
  return { url: signed.signedUrl };
}
