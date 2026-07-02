'use server';
import { revalidatePath } from 'next/cache';
import { getJob } from '@/lib/db/jobs';
import { validateParsedJd } from '@/lib/jd/parse';
import { buildTrackSnapshot } from '@/lib/cv/data';
import { suggestPoints, sanitizeLetterPoints } from '@/lib/letter/points';
import { writeLetter } from '@/lib/letter/write';
import type { LetterPoint } from '@/lib/letter/types';
import { upsertCoverLetter } from '@/lib/db/cover-letters';
import { toActionError } from '@/lib/action-error';

export async function suggestLetterPointsAction(
  jobId: string,
  trackId: string,
): Promise<{ points: LetterPoint[] } | { error: string }> {
  try {
    const job = await getJob(jobId);
    if (!job) return { error: 'Job not found' };
    const parsed = validateParsedJd(job.parsed);
    if (!parsed) return { error: 'This job has no parsed data — re-add it' };
    const snapshot = await buildTrackSnapshot(trackId);
    const points = await suggestPoints(parsed, snapshot);
    return { points };
  } catch (err) {
    return { error: toActionError(err) };
  }
}

export async function generateLetterAction(
  jobId: string,
  trackId: string,
  pointsJson: string,
): Promise<{ body: string } | { error: string }> {
  try {
    const job = await getJob(jobId);
    if (!job) return { error: 'Job not found' };
    const parsed = validateParsedJd(job.parsed);
    if (!parsed) return { error: 'This job has no parsed data — re-add it' };
    const snapshot = await buildTrackSnapshot(trackId);
    // Trust boundary: client-supplied JSON — sanitize against a fresh snapshot.
    let raw: unknown = [];
    try { raw = JSON.parse(pointsJson); } catch { /* [] */ }
    const points = sanitizeLetterPoints(raw, snapshot);
    if (points.length === 0) {
      return { error: 'No talking points selected — accept at least one point' };
    }
    const body = await writeLetter(parsed, points, {
      full_name: snapshot.profile.full_name,
      headline: snapshot.profile.headline,
    });
    return { body };
  } catch (err) {
    return { error: toActionError(err) };
  }
}

export async function saveCoverLetterAction(
  jobId: string,
  trackId: string,
  pointsJson: string,
  body: string,
): Promise<{ ok: true } | { error: string }> {
  try {
    const snapshot = await buildTrackSnapshot(trackId);
    let raw: unknown = [];
    try { raw = JSON.parse(pointsJson); } catch { /* [] */ }
    const points = sanitizeLetterPoints(raw, snapshot);
    await upsertCoverLetter({ job_id: jobId, track_id: trackId, points, body });
    revalidatePath(`/dashboard/jobs/${jobId}`);
    return { ok: true };
  } catch (err) {
    return { error: toActionError(err) };
  }
}
