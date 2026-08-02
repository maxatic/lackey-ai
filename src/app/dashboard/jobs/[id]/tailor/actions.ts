'use server';
import { revalidatePath } from 'next/cache';
import { getUserId } from '@/lib/auth/local-user';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getJob, advanceJobToPrepared } from '@/lib/db/jobs';
import { buildTrackSnapshot, toCvData, type TrackSnapshot } from '@/lib/cv/data';
import { suggestCvDiff, type CvSuggestions } from '@/lib/cv/suggest';
import { applyOverrides, validateOverrides } from '@/lib/cv/overrides';
import { renderCv } from '@/lib/cv/render';
import { compilePdf } from '@/lib/cv/compile';
import { upsertNodeCv } from '@/lib/db/node-cvs';
import { upsertCvDocument } from '@/lib/db/cv-documents';
import { ACTIVE_CV_LOCALES, DEFAULT_CV_LOCALE } from '@/lib/market';
import type { CvLocale } from '@/lib/cv/types';
import { validateParsedJd } from '@/lib/jd/parse';
import { toActionError } from '@/lib/action-error';

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
    return { error: toActionError(err) };
  }
}

export async function generateNodeCvAction(formData: FormData): Promise<{ url: string }> {
  const jobId = String(formData.get('job_id') ?? '');
  const trackId = String(formData.get('track_id') ?? '');
  const locale = String(formData.get('locale') ?? DEFAULT_CV_LOCALE) as CvLocale;
  if (!jobId || !trackId) throw new Error('Missing job or track');
  if (!ACTIVE_CV_LOCALES.includes(locale)) throw new Error('Invalid locale');
  // Trust boundary: overrides JSON comes from the client — sanitize.
  let overridesRaw: unknown = {};
  try { overridesRaw = JSON.parse(String(formData.get('overrides') ?? '{}')); } catch { /* {} */ }
  const overrides = validateOverrides(overridesRaw);

  const userId = getUserId();

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

  try { await advanceJobToPrepared(jobId); } catch { /* best-effort — never fail a succeeded generation */ }

  const { data: signed, error: signError } = await supabase.storage
    .from('cvs')
    .createSignedUrl(path, 600);
  if (signError) throw signError;

  revalidatePath(`/dashboard/jobs/${jobId}`);
  return { url: signed.signedUrl };
}
