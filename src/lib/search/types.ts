import type { CvLocale } from '@/lib/cv/types';
import { MARKET_COUNTRY, MARKET_COUNTRY_LABEL } from '@/lib/market';

// Client-safe search types + constants. No server imports.
export type JobSearchQuery = {
  keywords: string; // trimmed, 2..200 chars (validated in searchJobs)
  country: string;  // ISO-3166 alpha-2 — Germany-only for now
  remote: boolean;
};

export const SEARCH_COUNTRIES = [
  { code: MARKET_COUNTRY, label: MARKET_COUNTRY_LABEL },
] as const;

export type JobSearchSource = 'hiringcafe' | 'adzuna';

export type JobSearchResult = {
  source: JobSearchSource;
  source_id: string;
  title: string;
  company: string | null;
  location: string | null;
  remote: boolean | null;
  salary: string | null;
  url: string;
  description: string;
  posted_at: string | null;
};

export const JD_DESCRIPTION_MAX = 20_000;
