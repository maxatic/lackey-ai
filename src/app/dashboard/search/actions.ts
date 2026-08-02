'use server';
import { revalidatePath } from 'next/cache';
import { searchJobs } from '@/lib/search';
import { sanitizeSearchResult } from '@/lib/search/sanitize';
import { MARKET_COUNTRY } from '@/lib/market';
import type { JobSearchResult } from '@/lib/search/types';
import { createJobFromSearch } from '@/lib/db/jobs';
import { toActionError } from '@/lib/action-error';

export async function searchJobsAction(
  formData: FormData,
): Promise<{ results: JobSearchResult[]; errors: string[] } | { error: string }> {
  try {
    const keywords = String(formData.get('keywords') ?? '');
    const remote = formData.get('remote') === 'on';
    return await searchJobs({ keywords, country: MARKET_COUNTRY, remote });
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
