import { JD_DESCRIPTION_MAX, type JobSearchQuery, type JobSearchResult } from './types';

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});

export function mapAdzuna(raw: unknown): JobSearchResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = r.id != null ? String(r.id) : null;
  const title = str(r.title);
  const url = str(r.redirect_url);
  if (!id || !title || !url) return null;
  const min = typeof r.salary_min === 'number' ? r.salary_min : null;
  const max = typeof r.salary_max === 'number' ? r.salary_max : null;
  return {
    source: 'adzuna',
    source_id: id,
    title,
    company: str(obj(r.company).display_name),
    location: str(obj(r.location).display_name),
    remote: null, // Adzuna has no remote flag
    salary: min || max ? `${min ? Math.round(min).toLocaleString('en') : '?'} – ${max ? Math.round(max).toLocaleString('en') : '?'}` : null,
    url,
    description: (str(r.description) ?? '').slice(0, JD_DESCRIPTION_MAX),
    posted_at: str(r.created),
  };
}

export async function searchAdzuna(q: JobSearchQuery): Promise<JobSearchResult[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) throw new Error('Adzuna unavailable');
  const what = q.remote ? `${q.keywords} remote` : q.keywords;
  const url =
    `https://api.adzuna.com/v1/api/jobs/${q.country}/search/1` +
    `?app_id=${encodeURIComponent(appId)}&app_key=${encodeURIComponent(appKey)}` +
    `&what=${encodeURIComponent(what)}&results_per_page=25&content-type=application/json`;
  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(25_000) });
  } catch {
    throw new Error('Adzuna unavailable');
  }
  if (!res.ok) throw new Error('Adzuna unavailable');
  const body = await res.json().catch(() => null);
  const rows: unknown[] = Array.isArray(body?.results) ? body.results : [];
  return rows.map(mapAdzuna).filter((r): r is JobSearchResult => r !== null);
}
