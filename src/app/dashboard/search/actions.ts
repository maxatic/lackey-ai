'use server';
import { revalidatePath } from 'next/cache';
import { searchJobs } from '@/lib/search';
import { sanitizeSearchResult } from '@/lib/search/sanitize';
import { SEARCH_COUNTRIES, type JobSearchResult } from '@/lib/search/types';
import { createJobFromSearch } from '@/lib/db/jobs';
import { toActionError } from '@/lib/action-error';

// Apify's sync run can take ~20-30s; Vercel's default function window is 10s.
export const maxDuration = 60;

export async function searchJobsAction(
  formData: FormData,
): Promise<{ results: JobSearchResult[]; errors: string[] } | { error: string }> {
  try {
    const keywords = String(formData.get('keywords') ?? '');
    const countryRaw = String(formData.get('country') ?? '');
    const country = SEARCH_COUNTRIES.some((c) => c.code === countryRaw) ? countryRaw : 'de';
    const remote = formData.get('remote') === 'on';
    return await searchJobs({ keywords, country, remote });
  } catch (err) {
    return { error: toActionError(err) };
  }
}

export async function saveSearchResultAction(
  resultJson: string,
): Promise<{ jobId: string } | { error: string }> {
  try {
    let raw: unknown = null;
    try { raw = JSON.parse(resultJson); } catch { /* null */ }
    const result = sanitizeSearchResult(raw);
    if (!result) throw new Error('Invalid search result');
    const job = await createJobFromSearch(result);
    revalidatePath('/dashboard/jobs');
    return { jobId: job.id };
  } catch (err) {
    return { error: toActionError(err) };
  }
}
