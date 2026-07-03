import { JD_DESCRIPTION_MAX, type JobSearchResult } from './types';

const SOURCES = new Set(['hiringcafe', 'adzuna']);
const optStr = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);

// Trust boundary: the result comes back from the client on save — re-validate everything.
export function sanitizeSearchResult(raw: unknown): JobSearchResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.source !== 'string' || !SOURCES.has(r.source)) return null;
  if (typeof r.source_id !== 'string' || !r.source_id.trim()) return null;
  if (typeof r.title !== 'string' || !r.title.trim()) return null;
  if (typeof r.url !== 'string') return null;
  let url: URL;
  try { url = new URL(r.url); } catch { return null; }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (typeof r.description !== 'string') return null;
  return {
    source: r.source as JobSearchResult['source'],
    source_id: r.source_id,
    title: r.title,
    company: optStr(r.company),
    location: optStr(r.location),
    remote: typeof r.remote === 'boolean' ? r.remote : null,
    salary: optStr(r.salary),
    url: url.toString(),
    description: r.description.slice(0, JD_DESCRIPTION_MAX),
    posted_at: optStr(r.posted_at),
  };
}
