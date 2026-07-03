import { searchAdzuna } from './adzuna';
import { searchHiringCafe } from './hiringcafe';
import type { JobSearchQuery, JobSearchResult } from './types';

const dedupKey = (r: JobSearchResult) =>
  `${r.title.trim().toLowerCase()}::${(r.company ?? '').trim().toLowerCase()}`;

export async function searchJobs(
  q: JobSearchQuery,
): Promise<{ results: JobSearchResult[]; errors: string[] }> {
  const keywords = q.keywords.trim();
  if (keywords.length < 2 || keywords.length > 200) throw new Error('Enter search keywords');
  const query = { ...q, keywords };

  const settled = await Promise.allSettled([searchHiringCafe(query), searchAdzuna(query)]);
  const errors: string[] = [];
  const results: JobSearchResult[] = [];
  const seen = new Set<string>();
  for (const outcome of settled) {
    if (outcome.status === 'rejected') {
      errors.push(outcome.reason instanceof Error ? outcome.reason.message : 'Source unavailable');
      continue;
    }
    for (const r of outcome.value) {
      const key = dedupKey(r);
      if (seen.has(key)) continue;
      seen.add(key);
      results.push(r);
    }
  }
  return { results, errors };
}
