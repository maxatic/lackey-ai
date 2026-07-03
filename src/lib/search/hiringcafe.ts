import { JD_DESCRIPTION_MAX, SEARCH_COUNTRIES, type JobSearchQuery, type JobSearchResult } from './types';

const ACTOR = 'memo23~apify-hiring-cafe-scraper';
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});

export function mapHiringCafe(raw: unknown): JobSearchResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const info = obj(r.job_information);
  const proc = obj(r.v2_processed_job_data);
  // Defensive: unofficial API — accept several candidate paths per field.
  const title = str(info.title) ?? str(proc.core_job_title) ?? str(r.title);
  const url = str(r.apply_url) ?? str(r.applyUrl) ?? str(r.url);
  const id = (r.id != null ? String(r.id) : null) ?? url;
  if (!title || !url || !id) return null;
  const min = typeof proc.yearly_min_compensation === 'number' ? proc.yearly_min_compensation : null;
  const max = typeof proc.yearly_max_compensation === 'number' ? proc.yearly_max_compensation : null;
  const workplace = str(proc.workplace_type);
  return {
    source: 'hiringcafe',
    source_id: id,
    title,
    company: str(obj(r.v2_processed_company_data).name) ?? str(r.company_name),
    location: str(proc.formatted_workplace_location) ?? str(r.location),
    remote: workplace === null ? null : workplace.toLowerCase() === 'remote',
    salary: min || max ? `${min ? Math.round(min).toLocaleString('en') : '?'} – ${max ? Math.round(max).toLocaleString('en') : '?'}` : null,
    url,
    description: (str(info.description) ?? str(r.description) ?? '').slice(0, JD_DESCRIPTION_MAX),
    posted_at: str(proc.estimated_publish_date),
  };
}

export async function searchHiringCafe(q: JobSearchQuery): Promise<JobSearchResult[]> {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error('Hiring Cafe unavailable');
  const location = SEARCH_COUNTRIES.find((c) => c.code === q.country)?.label ?? q.country;
  const input = {
    keyword: q.keywords,
    location,
    workplaceType: q.remote ? 'Remote' : 'Any',
    maxItems: 25,
    enrichDescription: false,
  };
  let res: Response;
  try {
    res = await fetch(
      `https://api.apify.com/v2/acts/${ACTOR}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
        signal: AbortSignal.timeout(25_000),
      },
    );
  } catch {
    throw new Error('Hiring Cafe unavailable');
  }
  if (!res.ok) throw new Error('Hiring Cafe unavailable');
  const body = await res.json().catch(() => null);
  const rows: unknown[] = Array.isArray(body) ? body : [];
  return rows.map(mapHiringCafe).filter((r): r is JobSearchResult => r !== null);
}
