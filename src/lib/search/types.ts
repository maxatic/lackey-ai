// Client-safe search types + constants. No server imports.
export type JobSearchQuery = {
  keywords: string; // trimmed, 2..200 chars (validated in searchJobs)
  country: string;  // ISO-3166 alpha-2 from SEARCH_COUNTRIES
  remote: boolean;
};

export const SEARCH_COUNTRIES = [
  { code: 'de', label: 'Germany' },
  { code: 'nl', label: 'Netherlands' },
  { code: 'fr', label: 'France' },
  { code: 'at', label: 'Austria' },
  { code: 'be', label: 'Belgium' },
  { code: 'es', label: 'Spain' },
  { code: 'it', label: 'Italy' },
  { code: 'pl', label: 'Poland' },
  { code: 'ie', label: 'Ireland' },
  { code: 'gb', label: 'United Kingdom' },
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
