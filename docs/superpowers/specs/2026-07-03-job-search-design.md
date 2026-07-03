# Lackey AI — Job Search (Phase 8) Design

**Status:** approved design, pre-plan (2026-07-03)
**Depends on:** Phase 3 (Jobs), Phase 5 (pipeline) — merged. Built BEFORE phases 6/7 by explicit decision: search feeds the existing pipeline (search → save → tailor → letter → track), while 6/7 open a new vertical.
**Spec for:** a spec → plan → build cycle. See [CLAUDE.md](../../../CLAUDE.md) for vision/stack.

---

## Goal

A **Find jobs** page: keywords + EU country + remote filter → merged results from two sources → **Save to Jobs** maps a result straight into the existing pipeline (status `saved`), with no AI call — the sources return structured data already.

**Decisions (made during brainstorming, with research):**
- **Two sources behind a thin adapter interface** (resilience over minimalism):
  - **Hiring Cafe via Apify actor** (`memo23/apify-hiring-cafe-scraper` or equivalent — final pick at implementation time): richest EU data (salary, seniority, direct ATS apply URLs; ~2.8M listings from 46 ATS platforms), synchronous `run-sync-get-dataset-items` endpoint, ~$1.25/1k results. **Unofficial** (wraps hiring.cafe's internal API) — treated as the enrichment source that may break.
  - **Adzuna official API**: free (250 req/day), 12 countries incl. DE/NL/FR/AT/IT/PL/ES/UK — the stable fallback.
- **EURES dropped** from the original roadmap idea: its portal explicitly forbids automated extraction and has no public API.
- **On-demand search only** at MVP. Saved searches/alerts (cron) and AI match scoring are named follow-ups, not in scope.
- **Saving is AI-free**: the structured search result maps directly to a `job_descriptions` row (`parsed` prefilled) — instant and free, unlike the paste flow.

## Scope

**In scope**
- `src/lib/search/` — types, two adapters (fetch + pure mapper each), `searchJobs` merger with per-source degradation.
- Migration `0007`: `source` + `source_id` on `job_descriptions` + partial unique index for idempotent saves.
- `/dashboard/search` page + **Find jobs** nav item; result cards with Save-to-Jobs and saved-state.
- `saveSearchResultAction` with server-side shape sanitation; allowlist additions.
- Fixture-based mapper tests; degradation-matrix tests; save-action tests.

**Out of scope (explicit non-goals)**
- Saved searches, alerts, cron re-runs; AI relevance scoring vs a Track (follow-up); pagination past the first page; additional sources (adapter interface is the extension point); EURES; response caching (revisit with Upstash if usage shows repeats); salary normalization across sources.

---

## Types & adapters (`src/lib/search/`)

```ts
// src/lib/search/types.ts
export type JobSearchQuery = {
  keywords: string;          // required, trimmed, 2..200 chars
  country: string;           // ISO-3166 alpha-2 from SEARCH_COUNTRIES
  remote: boolean;
};
export const SEARCH_COUNTRIES: { code: string; label: string }[];
// de, nl, fr, at, be, es, it, pl, ie, gb — the Adzuna-supported EU set; Hiring Cafe takes the label as a location string

export type JobSearchSource = 'hiringcafe' | 'adzuna';
export type JobSearchResult = {
  source: JobSearchSource;
  source_id: string;         // stable per-source id (Adzuna `id`; Hiring Cafe job id/apply-url hash)
  title: string;
  company: string | null;
  location: string | null;
  remote: boolean | null;    // null = source didn't say
  salary: string | null;     // preformatted display string
  url: string;               // external posting / apply URL
  description: string;       // plain text; truncated to 20,000 chars (JD cap)
  posted_at: string | null;  // ISO date when the source provides it
};
```

- **`src/lib/search/adzuna.ts`** — `searchAdzuna(q): Promise<JobSearchResult[]>`: GET `https://api.adzuna.com/v1/api/jobs/{country}/search/1` with `app_id`/`app_key` env, `what=keywords`, `results_per_page=25`, plus `where`/remote handling per API docs. Exported pure `mapAdzuna(raw): JobSearchResult | null` (null for unusable rows — missing id/title/url). Throws `Error('Adzuna unavailable')` on missing env / non-200 / timeout.
- **`src/lib/search/hiringcafe.ts`** — `searchHiringCafe(q): Promise<JobSearchResult[]>`: POST to the Apify actor's `run-sync-get-dataset-items` endpoint with `APIFY_TOKEN`, keyword + location (country label) + workplace-type input, item cap 25. Exported pure `mapHiringCafe(raw): JobSearchResult | null`. Throws `Error('Hiring Cafe unavailable')` on missing env / non-200 / timeout. Exact input schema pinned at implementation time against the chosen actor; mapper tested against captured fixture JSON.
- **`src/lib/search/index.ts`** — `searchJobs(q): Promise<{ results: JobSearchResult[]; errors: string[] }>`: validates the query (empty/too-long keywords → `Error('Enter search keywords')`); `Promise.allSettled` over both adapters; rejected adapters contribute their message to `errors`, fulfilled ones contribute results; results deduped by `normalize(title)+normalize(company)` (first source wins), interleaved hiringcafe-first; both failed → `{ results: [], errors }` (page shows the errors, still no throw). 20s `AbortSignal.timeout` per adapter fetch.

## Data model (migration `supabase/migrations/0007_job_source.sql`)

```sql
alter table job_descriptions
  add column source text,
  add column source_id text;

create unique index job_descriptions_source_uniq
  on job_descriptions (user_id, source, source_id)
  where source is not null;
```

No RLS changes (owner policy covers new columns). Paste-created jobs keep `source null` (index doesn't apply). `database.types.ts` updated accordingly. Table count stays 13.

## Save flow

- **`createJobFromSearch(result: JobSearchResult): Promise<Job>`** (in `src/lib/db/jobs.ts`) — insert with `title`, `company`, `raw_text` = description, `source`, `source_id`, and `parsed` prefilled `{ title, company, location, language: null, requirements: [], keywords: [] }` (satisfies `validateParsedJd`, so the job page and tailoring work unchanged). On unique violation (already saved), fetch and return the existing row — **idempotent success**, not an error.
- **`listSavedSourceIds(): Promise<{ source: string; source_id: string }[]>`** — for rendering saved-state on results.
- **`saveSearchResultAction(resultJson: string)`** (in `src/app/dashboard/search/actions.ts`) — parses + sanitizes the client-supplied result server-side (lenient guard, same pattern as `sanitizeLetterPoints`: exact field whitelist, string types, `url` must parse as http(s) URL, description truncated to 20k) → `createJobFromSearch` → `revalidatePath('/dashboard/jobs')` → returns `{ jobId }` or `{ error: toActionError(err) }`. Invalid shape → `Error('Invalid search result')` (allowlisted).
- **`searchJobsAction(formData)`** — validates via `searchJobs`, returns `{ results, errors }` or `{ error }`. Its `errors` array passes through as-is (adapter messages are our own: 'Adzuna unavailable', 'Hiring Cafe unavailable').

New allowlist entries (byte-exact): `'Enter search keywords'`, `'Invalid search result'`.

## UX — `/dashboard/search` (+ nav)

- **Nav**: `{ href: '/dashboard/search', label: 'Find jobs' }` added to the dashboard NAV before Jobs.
- Search form: keywords input, country `<select>` (SEARCH_COUNTRIES, default `de`), remote checkbox, Search button (pending state).
- Results: source-badged cards (title, company · location, salary when present, posted date, source chip) with two actions: **Save to Jobs** (→ button flips to "Saved ✓" linking to `/dashboard/jobs/<id>`) and **View posting** (external link, `rel="noreferrer"`). Already-saved results render in saved-state from the start (via `listSavedSourceIds`).
- Partial-failure notice above results when `errors` non-empty; empty-state for zero results; house design tokens throughout.

## Env

- **New:** `APIFY_TOKEN`, `ADZUNA_APP_ID`, `ADZUNA_APP_KEY` (local `.env.local` + `.env.example` + Vercel). A missing source's env degrades that source only (its adapter throws its 'unavailable' message → shown as notice); both missing → page still renders, search returns both notices.
- Cost note: Hiring Cafe ≈ $0.03/search at the 25-result cap; Adzuna free within 250 req/day.

## Testing

No live HTTP in tests — `fetch` mocked; mappers tested against captured fixture JSON committed under `src/lib/search/__fixtures__/`:
- Mappers: happy fixture → normalized shape; junk/missing-field rows → null; description truncation.
- `searchJobs`: both ok (merged, deduped, interleaved); one rejects (results + 1 error); both reject (empty + 2 errors); keyword validation.
- Adapters: missing env → 'unavailable' throw without fetch; non-200 → throw.
- `createJobFromSearch`: insert shape (`parsed` passes `validateParsedJd`); unique-violation path returns existing row (mock raises PG `23505`-shaped error).
- Save action: hostile `resultJson` (bad JSON, wrong types, `javascript:` URL) → 'Invalid search result'; happy path returns `{ jobId }`.
- Suite (baseline 184) + `tsc` + `next build` green; `db:migrate`/`db:verify` (13 tables unchanged).

## Named follow-ups (not this phase)

AI match scoring per result vs a chosen Track; saved searches with cron alerts; more adapters (Arbeitnow is a trivial third — free, no auth); Upstash response cache.
