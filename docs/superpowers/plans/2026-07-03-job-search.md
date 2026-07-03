# Phase 8 — Job Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/dashboard/search` ("Find jobs"): keywords + EU country + remote → merged results from Hiring Cafe (Apify) and Adzuna → Save to Jobs maps a result straight into the pipeline at `saved`, AI-free and idempotent.

**Architecture:** Two source adapters (fetch + pure mapper each) behind `searchJobs` with `Promise.allSettled` degradation. Migration `0007` adds `source`/`source_id` + a partial unique index for idempotent saves. Mappers are the load-bearing tested surface (fixture JSON committed; no test touches the network). The search server action sets `maxDuration = 60` because the Apify sync run can exceed Vercel's 10s default.

**Tech Stack:** Next.js 15 App Router, Supabase (RLS), native `fetch` + `AbortSignal.timeout`, Vitest. **No AI calls. No new npm dependencies.**

**Spec:** [docs/superpowers/specs/2026-07-03-job-search-design.md](../specs/2026-07-03-job-search-design.md)

## Global Constraints

- Adapter contract: throws exactly `Error('Adzuna unavailable')` / `Error('Hiring Cafe unavailable')` on missing env, non-200, timeout, or unparseable body. Mappers are pure, exported, return `null` for unusable rows, never throw.
- `searchJobs` NEVER rejects: `{ results, errors }` always. Per-adapter `AbortSignal.timeout(25_000)`.
- Result caps: `maxItems`/`results_per_page` = 25 per source. Hiring Cafe input uses `enrichDescription: false` (search-index descriptions suffice at MVP; full enrichment is slow + the sync endpoint would blow the action window).
- Descriptions truncated to 20,000 chars (the existing JD cap). `remote: true` maps to `workplaceType: 'Remote'` (Hiring Cafe) and appending `' remote'` to Adzuna's `what` (Adzuna has no remote flag).
- New allowlist messages, byte-exact: `'Enter search keywords'`, `'Invalid search result'`. Adapter 'unavailable' messages flow through `searchJobs`' `errors` array (not via `toActionError`).
- The Hiring Cafe mapper's exact upstream field paths are best-effort until the first live run (unofficial API): write it with defensive extraction, and the committed fixtures pin OUR contract. A post-deploy live smoke is an operator step, not a test.
- Env names: `APIFY_TOKEN`, `ADZUNA_APP_ID`, `ADZUNA_APP_KEY` (add to `.env.example`; values later).
- db helpers follow the house pattern (RLS tenancy, `ensureUser()`+`auth()` on writes).
- Baseline: 184 tests / 32 files. `npx vitest run`, `npx tsc --noEmit`, `npx next build` green at every task end. Commit per task.

---

### Task 1: Migration 0007 + database types + search types/constants

**Files:**
- Create: `supabase/migrations/0007_job_source.sql`, `src/lib/search/types.ts`
- Modify: `src/lib/db/database.types.ts` (`job_descriptions` gains `source`/`source_id`), `.env.example`

**Interfaces:**
- Produces: `JobSearchQuery`, `JobSearchSource`, `JobSearchResult`, `SEARCH_COUNTRIES`, `JD_DESCRIPTION_MAX = 20_000` from `@/lib/search/types`; nullable `source`/`source_id` columns + partial unique index.

- [ ] **Step 1: Migration**

```sql
-- 0007_job_source.sql — provenance columns for search-saved jobs + idempotent-save index.
-- No new table, no new RLS (job_descriptions_owner covers new columns).

alter table job_descriptions
  add column source text,
  add column source_id text;

-- One saved copy per (user, source, listing). Paste-created jobs have source null (index doesn't apply).
create unique index job_descriptions_source_uniq
  on job_descriptions (user_id, source, source_id)
  where source is not null;
```

- [ ] **Step 2: `database.types.ts`** — `job_descriptions` Row gains `source: string | null; source_id: string | null;`; Insert/Update gain `source?: string | null; source_id?: string | null;`.

- [ ] **Step 3: `src/lib/search/types.ts`**

```typescript
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
```

- [ ] **Step 4: `.env.example`** — append:

```
# Job search sources (Phase 8)
APIFY_TOKEN=
ADZUNA_APP_ID=
ADZUNA_APP_KEY=
```

- [ ] **Step 5: Apply + verify** — `npm run db:migrate && npm run db:verify` (13 tables unchanged, 0007 applied); `npx tsc --noEmit` → 0.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0007_job_source.sql src/lib/search/types.ts src/lib/db/database.types.ts .env.example
git commit -m "feat(search): job source columns + search types/constants (0007)"
```

---

### Task 2: Source adapters + merger (the heart of the phase)

**Files:**
- Create: `src/lib/search/adzuna.ts`, `src/lib/search/hiringcafe.ts`, `src/lib/search/index.ts`
- Create: `src/lib/search/__fixtures__/adzuna.json`, `src/lib/search/__fixtures__/hiringcafe.json`
- Create: `src/lib/search/adzuna.test.ts`, `src/lib/search/hiringcafe.test.ts`, `src/lib/search/index.test.ts`

**Interfaces:**
- Consumes: Task 1 types.
- Produces: `searchAdzuna(q)`, `mapAdzuna(raw)`, `searchHiringCafe(q)`, `mapHiringCafe(raw)`, `searchJobs(q): Promise<{ results: JobSearchResult[]; errors: string[] }>`.

- [ ] **Step 1: Commit fixtures.** `__fixtures__/adzuna.json` (Adzuna's documented response envelope — 3 rows: one complete, one minimal-valid, one unusable missing `redirect_url`):

```json
{
  "results": [
    {
      "id": "5001",
      "title": "Senior TypeScript Engineer",
      "company": { "display_name": "ACME GmbH" },
      "location": { "display_name": "Berlin, Deutschland", "area": ["Deutschland", "Berlin"] },
      "description": "We are looking for a senior engineer with TypeScript and React experience...",
      "redirect_url": "https://www.adzuna.de/land/ad/5001",
      "salary_min": 70000,
      "salary_max": 90000,
      "created": "2026-06-28T09:00:00Z",
      "contract_time": "full_time"
    },
    {
      "id": "5002",
      "title": "Backend Developer",
      "description": "Node.js role.",
      "redirect_url": "https://www.adzuna.de/land/ad/5002"
    },
    {
      "id": "5003",
      "title": "No URL Job",
      "description": "unusable row"
    }
  ]
}
```

`__fixtures__/hiringcafe.json` (based on the actor's documented output shape; 3 items: complete, minimal, unusable — field paths per the actor docs: `id`, `apply_url`, `job_information.title/description`, `v2_processed_job_data.*`, `v2_processed_company_data.name`):

```json
[
  {
    "id": "hc-1",
    "apply_url": "https://jobs.lever.co/acme/123",
    "job_information": {
      "title": "Frontend Engineer",
      "description": "Build the ACME dashboard with React and TypeScript..."
    },
    "v2_processed_job_data": {
      "core_job_title": "Frontend Engineer",
      "workplace_type": "Remote",
      "formatted_workplace_location": "Amsterdam, Netherlands",
      "yearly_min_compensation": 60000,
      "yearly_max_compensation": 80000,
      "estimated_publish_date": "2026-06-30T00:00:00Z"
    },
    "v2_processed_company_data": { "name": "ACME" }
  },
  {
    "id": "hc-2",
    "apply_url": "https://boards.greenhouse.io/beta/jobs/456",
    "job_information": { "title": "Data Engineer", "description": "Pipelines." }
  },
  {
    "job_information": { "description": "no title, no id, no url — unusable" }
  }
]
```

- [ ] **Step 2: Write failing mapper + adapter tests.** All tests stub global fetch via `vi.stubGlobal('fetch', fetchMock)`; `beforeEach` (braced body) resets mocks and sets/clears env vars via `vi.stubEnv` (`vi.unstubAllEnvs` in afterEach).

```typescript
// adzuna.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fixture from './__fixtures__/adzuna.json';
import { mapAdzuna, searchAdzuna } from './adzuna';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);
const Q = { keywords: 'typescript', country: 'de', remote: false };

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubEnv('ADZUNA_APP_ID', 'id');
  vi.stubEnv('ADZUNA_APP_KEY', 'key');
});
afterEach(() => { vi.unstubAllEnvs(); });

it('mapAdzuna maps a complete row', () => {
  const r = mapAdzuna(fixture.results[0]);
  expect(r).toMatchObject({
    source: 'adzuna', source_id: '5001', title: 'Senior TypeScript Engineer',
    company: 'ACME GmbH', location: 'Berlin, Deutschland',
    url: 'https://www.adzuna.de/land/ad/5001', posted_at: '2026-06-28T09:00:00Z',
  });
  expect(r!.salary).toContain('70');
});
it('mapAdzuna fills nulls on a minimal row and rejects an unusable one', () => {
  const min = mapAdzuna(fixture.results[1]);
  expect(min).toMatchObject({ company: null, location: null, salary: null, posted_at: null });
  expect(mapAdzuna(fixture.results[2])).toBeNull();
  expect(mapAdzuna(null)).toBeNull();
});
it('searchAdzuna builds the URL and maps results', async () => {
  fetchMock.mockResolvedValue({ ok: true, json: async () => fixture });
  const results = await searchAdzuna(Q);
  expect(results).toHaveLength(2); // unusable row dropped
  const url: string = fetchMock.mock.calls[0][0];
  expect(url).toContain('/jobs/de/search/1');
  expect(url).toContain('what=typescript');
  expect(url).toContain('results_per_page=25');
});
it('searchAdzuna appends remote to keywords when remote=true', async () => {
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ results: [] }) });
  await searchAdzuna({ ...Q, remote: true });
  expect(String(fetchMock.mock.calls[0][0])).toContain('what=typescript%20remote');
});
it('searchAdzuna throws "Adzuna unavailable" on missing env / non-200', async () => {
  vi.stubEnv('ADZUNA_APP_ID', '');
  await expect(searchAdzuna(Q)).rejects.toThrow('Adzuna unavailable');
  expect(fetchMock).not.toHaveBeenCalled();
  vi.stubEnv('ADZUNA_APP_ID', 'id');
  fetchMock.mockResolvedValue({ ok: false, status: 500 });
  await expect(searchAdzuna(Q)).rejects.toThrow('Adzuna unavailable');
});
```

```typescript
// hiringcafe.test.ts — same skeleton; key cases:
it('mapHiringCafe maps a complete item', () => {
  const r = mapHiringCafe(fixture[0]);
  expect(r).toMatchObject({
    source: 'hiringcafe', source_id: 'hc-1', title: 'Frontend Engineer',
    company: 'ACME', location: 'Amsterdam, Netherlands', remote: true,
    url: 'https://jobs.lever.co/acme/123', posted_at: '2026-06-30T00:00:00Z',
  });
  expect(r!.salary).toContain('60');
});
it('minimal item → nulls; no title/url → null', () => { /* fixture[1] and fixture[2] */ });
it('searchHiringCafe POSTs the actor input and maps items', async () => {
  fetchMock.mockResolvedValue({ ok: true, json: async () => fixture });
  const results = await searchHiringCafe({ keywords: 'react', country: 'nl', remote: true });
  expect(results).toHaveLength(2);
  const [url, init] = fetchMock.mock.calls[0];
  expect(String(url)).toContain('memo23~apify-hiring-cafe-scraper/run-sync-get-dataset-items');
  expect(String(url)).toContain('token=');
  const body = JSON.parse(init.body);
  expect(body).toMatchObject({ keyword: 'react', location: 'Netherlands', workplaceType: 'Remote', maxItems: 25, enrichDescription: false });
});
it('throws "Hiring Cafe unavailable" on missing APIFY_TOKEN / non-200', async () => { /* mirror adzuna */ });
```

```typescript
// index.test.ts — mock BOTH adapter modules:
const adz = vi.fn(); const hc = vi.fn();
vi.mock('./adzuna', () => ({ searchAdzuna: (...a: any[]) => adz(...a) }));
vi.mock('./hiringcafe', () => ({ searchHiringCafe: (...a: any[]) => hc(...a) }));
import { searchJobs } from './index';

const R = (source: string, title: string, company = 'C') => ({ source, source_id: title, title, company, location: null, remote: null, salary: null, url: 'https://x.example/' + title, description: 'd', posted_at: null });

it('merges, interleaves hiringcafe-first, dedups by title+company', async () => {
  hc.mockResolvedValue([R('hiringcafe', 'Dev'), R('hiringcafe', 'QA')]);
  adz.mockResolvedValue([R('adzuna', 'Dev'), R('adzuna', 'PM')]); // 'Dev'+'C' duplicates
  const { results, errors } = await searchJobs({ keywords: 'x', country: 'de', remote: false });
  expect(errors).toEqual([]);
  expect(results.map((r) => `${r.source}:${r.title}`)).toEqual(['hiringcafe:Dev', 'hiringcafe:QA', 'adzuna:PM']);
});
it('one source failing degrades', async () => {
  hc.mockRejectedValue(new Error('Hiring Cafe unavailable'));
  adz.mockResolvedValue([R('adzuna', 'PM')]);
  const { results, errors } = await searchJobs({ keywords: 'x', country: 'de', remote: false });
  expect(results).toHaveLength(1);
  expect(errors).toEqual(['Hiring Cafe unavailable']);
});
it('both failing yields empty results + both errors (no throw)', async () => { /* both reject */ });
it('rejects blank / too-long keywords before calling adapters', async () => {
  await expect(searchJobs({ keywords: '  ', country: 'de', remote: false })).rejects.toThrow('Enter search keywords');
  await expect(searchJobs({ keywords: 'x'.repeat(201), country: 'de', remote: false })).rejects.toThrow('Enter search keywords');
  expect(adz).not.toHaveBeenCalled();
});
```

- [ ] **Step 3: Run, verify FAIL.**

- [ ] **Step 4: Implement.** Shared helpers inline per file (no premature shared module).

```typescript
// src/lib/search/adzuna.ts
import { JD_DESCRIPTION_MAX, type JobSearchQuery, type JobSearchResult } from './types';

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);

export function mapAdzuna(raw: unknown): JobSearchResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, any>;
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
    company: str(r.company?.display_name),
    location: str(r.location?.display_name),
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
```

```typescript
// src/lib/search/hiringcafe.ts
import { JD_DESCRIPTION_MAX, SEARCH_COUNTRIES, type JobSearchQuery, type JobSearchResult } from './types';

const ACTOR = 'memo23~apify-hiring-cafe-scraper';
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);

export function mapHiringCafe(raw: unknown): JobSearchResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, any>;
  const info = r.job_information ?? {};
  const proc = r.v2_processed_job_data ?? {};
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
    company: str(r.v2_processed_company_data?.name) ?? str(r.company_name),
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
```

```typescript
// src/lib/search/index.ts
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
```

- [ ] **Step 5: Run all tests + types** — `npx vitest run && npx tsc --noEmit` → green.

- [ ] **Step 6: Commit**

```bash
git add src/lib/search/
git commit -m "feat(search): Hiring Cafe (Apify) + Adzuna adapters, degrading merger"
```

---

### Task 3: Save flow — db helper, actions, allowlist

**Files:**
- Modify: `src/lib/db/jobs.ts` (+`createJobFromSearch`, `listSavedSourceIds`), `src/lib/db/jobs.test.ts`
- Modify: `src/lib/action-error.ts` + `action-error.test.ts` (2 entries)
- Create: `src/app/dashboard/search/actions.ts`, `src/app/dashboard/search/actions.test.ts`

**Interfaces:**
- Consumes: `searchJobs` (Task 2), `JobSearchResult`/`SEARCH_COUNTRIES` (Task 1), `toActionError`.
- Produces:
  - `createJobFromSearch(result: JobSearchResult): Promise<Job>` — idempotent (unique violation → returns the existing row)
  - `listSavedSourceIds(): Promise<{ source: string; source_id: string }[]>`
  - `searchJobsAction(formData: FormData): Promise<{ results: JobSearchResult[]; errors: string[] } | { error: string }>` — module exports `const maxDuration = 60`
  - `saveSearchResultAction(resultJson: string): Promise<{ jobId: string } | { error: string }>`
  - `sanitizeSearchResult(raw: unknown): JobSearchResult | null` (exported from the actions module's sibling — put it in `src/lib/search/types.ts`? No: put it in `src/lib/search/sanitize.ts` so the server action and tests share it)

- [ ] **Step 1: Write failing tests.**

Allowlist: append `'Enter search keywords'` and `'Invalid search result'` to the `SAFE` array + `SAFE_MESSAGES`.

db helper (`jobs.test.ts` — the mock's `insert` must be extended to raise a `23505`-shaped error when a row with the same `user_id+source+source_id` exists AND `values.source != null`):

```typescript
describe('createJobFromSearch', () => {
  const RESULT = {
    source: 'adzuna' as const, source_id: '5001', title: 'Dev', company: 'ACME',
    location: 'Berlin', remote: null, salary: null,
    url: 'https://example.com/5001', description: 'JD text here', posted_at: null,
  };
  it('inserts a job with source provenance and valid parsed payload', async () => {
    const job = await createJobFromSearch(RESULT);
    expect(job).toMatchObject({ title: 'Dev', company: 'ACME', source: 'adzuna', source_id: '5001', user_id: 'user_1' });
    expect(job.raw_text).toBe('JD text here');
    // parsed must satisfy validateParsedJd so the job page + tailoring work:
    expect(job.parsed).toMatchObject({ title: 'Dev', company: 'ACME', location: 'Berlin', requirements: [], keywords: [] });
  });
  it('is idempotent: re-saving returns the existing row', async () => {
    const first = await createJobFromSearch(RESULT);
    const second = await createJobFromSearch(RESULT);
    expect(second.id).toBe(first.id);
  });
});
it('listSavedSourceIds returns source pairs for source-backed rows only', async () => {
  await createJobFromSearch({ /* RESULT */ } as any);
  await createJob({ title: 'pasted', company: null, raw_text: 'x', parsed: {} });
  await expect(listSavedSourceIds()).resolves.toEqual([{ source: 'adzuna', source_id: '5001' }]);
});
```

Sanitizer + actions (`search/actions.test.ts` — mock `@/lib/search` (searchJobs), `@/lib/db/jobs` (createJobFromSearch), `next/cache`):

```typescript
it('searchJobsAction passes the query through and returns results+errors', async () => { /* happy */ });
it('searchJobsAction maps thrown validation to { error: "Enter search keywords" }', async () => { /* searchJobs rejects */ });
it('saveSearchResultAction rejects hostile payloads', async () => {
  for (const bad of ['not json', '{}', JSON.stringify({ ...GOOD, url: 'javascript:alert(1)' }), JSON.stringify({ ...GOOD, source: 'evil' })]) {
    await expect(saveSearchResultAction(bad)).resolves.toEqual({ error: 'Invalid search result' });
  }
  expect(createJobFromSearchMock).not.toHaveBeenCalled();
});
it('saveSearchResultAction saves and returns the job id', async () => {
  createJobFromSearchMock.mockResolvedValue({ id: 'j9' });
  await expect(saveSearchResultAction(JSON.stringify(GOOD))).resolves.toEqual({ jobId: 'j9' });
});
```

- [ ] **Step 2: Run, verify FAIL.**

- [ ] **Step 3: Implement.**

`src/lib/search/sanitize.ts`:

```typescript
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
```

`jobs.ts` additions:

```typescript
import type { JobSearchResult } from '@/lib/search/types';

export async function createJobFromSearch(result: JobSearchResult): Promise<Job> {
  await ensureUser();
  const { userId } = await auth();
  if (!userId) throw new Error('Not authenticated');
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('job_descriptions')
    .insert({
      user_id: userId,
      title: result.title,
      company: result.company,
      raw_text: result.description,
      source: result.source,
      source_id: result.source_id,
      parsed: {
        title: result.title,
        company: result.company,
        location: result.location,
        language: null,
        requirements: [],
        keywords: [],
      },
    })
    .select('*')
    .single();
  if (!error) return data;
  // 23505 = unique_violation on (user_id, source, source_id): already saved — idempotent success.
  if ((error as { code?: string }).code === '23505') {
    const { data: existing, error: readError } = await supabase
      .from('job_descriptions')
      .select('*')
      .eq('source', result.source)
      .eq('source_id', result.source_id)
      .maybeSingle();
    if (readError) throw readError;
    if (existing) return existing;
  }
  throw error;
}

export async function listSavedSourceIds(): Promise<{ source: string; source_id: string }[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('job_descriptions')
    .select('source, source_id')
    .not('source', 'is', null);
  if (error) throw error;
  return (data ?? []).filter((r): r is { source: string; source_id: string } => !!r.source && !!r.source_id);
}
```

(The jobs test mock: `insert` gains the 23505 simulation for source rows; the builder needs `not()` — same no-op-with-filter treatment as Task 2 of Phase 5; a `select('source, source_id')` chain awaited via `then()` resolving matching rows.)

`src/app/dashboard/search/actions.ts`:

```typescript
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
```

- [ ] **Step 4: Run all tests + types** — green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/search/sanitize.ts src/lib/db/ src/lib/action-error.ts src/lib/action-error.test.ts src/app/dashboard/search/
git commit -m "feat(search): idempotent save-to-pipeline + search/save actions"
```

---

### Task 4: Find-jobs page + nav + final verification

**Files:**
- Create: `src/app/dashboard/search/page.tsx`, `src/app/dashboard/search/SearchClient.tsx`
- Modify: `src/components/app-nav.tsx` (nav item)

**Interfaces:**
- Consumes: `searchJobsAction`/`saveSearchResultAction` (Task 3), `listSavedSourceIds` (Task 3), `SEARCH_COUNTRIES` + types (Task 1).

- [ ] **Step 1: Nav.** In `src/components/app-nav.tsx`, add to the group containing Jobs, BEFORE the Jobs entry (import `MagnifyingGlass` alongside the existing phosphor imports):

```typescript
      { href: '/dashboard/search', label: 'Find jobs', icon: MagnifyingGlass },
```

- [ ] **Step 2: Server page.**

```tsx
// src/app/dashboard/search/page.tsx
import { listSavedSourceIds } from '@/lib/db/jobs';
import { SearchClient } from './SearchClient';

export default async function SearchPage() {
  const saved = await listSavedSourceIds();
  return (
    <div className="max-w-4xl">
      <p className="kicker">Discover</p>
      <h1 className="app-title mt-2">Find jobs</h1>
      <p className="app-subtitle">
        Search EU job listings and save the good ones straight into your pipeline.
      </p>
      <div className="mt-8">
        <SearchClient initialSavedKeys={saved.map((s) => `${s.source}:${s.source_id}`)} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: `SearchClient.tsx`.** House tokens throughout (`app-card`, `field`, `field-label`, `btn btn-primary`, `chip chip-quiet`, `empty-state`, `form-error`, `action-link`, `tabular`); phosphor icons imported like other client components. Behavior:

```tsx
'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { MagnifyingGlass, ArrowSquareOut, Check, Plus } from '@phosphor-icons/react';
import { SEARCH_COUNTRIES, type JobSearchResult } from '@/lib/search/types';
import { searchJobsAction, saveSearchResultAction } from './actions';

export function SearchClient({ initialSavedKeys }: { initialSavedKeys: string[] }) {
  const [results, setResults] = useState<JobSearchResult[] | null>(null);
  const [sourceErrors, setSourceErrors] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savedKeys, setSavedKeys] = useState<Map<string, string | null>>(
    () => new Map(initialSavedKeys.map((k) => [k, null])), // key -> jobId (null = saved earlier, id unknown)
  );
  const [isPending, startTransition] = useTransition();
  const [savingKey, setSavingKey] = useState<string | null>(null);

  function search(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const res = await searchJobsAction(fd);
      if ('error' in res) { setError(res.error); return; }
      setResults(res.results);
      setSourceErrors(res.errors);
    });
  }

  function save(r: JobSearchResult) {
    const key = `${r.source}:${r.source_id}`;
    setSavingKey(key);
    startTransition(async () => {
      const res = await saveSearchResultAction(JSON.stringify(r));
      setSavingKey(null);
      if ('error' in res) { setError(res.error); return; }
      setSavedKeys((prev) => new Map(prev).set(key, res.jobId));
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={search} className="app-card flex flex-wrap items-end gap-3 p-5">
        <div className="min-w-56 flex-1">
          <label htmlFor="search-keywords" className="field-label">Keywords</label>
          <input id="search-keywords" name="keywords" required minLength={2} maxLength={200}
                 placeholder="e.g. frontend engineer react" className="field" />
        </div>
        <div>
          <label htmlFor="search-country" className="field-label">Country</label>
          <select id="search-country" name="country" defaultValue="de" className="field !w-auto">
            {SEARCH_COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm text-[var(--ink)]">
          <input type="checkbox" name="remote" /> Remote only
        </label>
        <button type="submit" disabled={isPending} className="btn btn-primary">
          <MagnifyingGlass className="h-4 w-4" />
          {isPending && !savingKey ? 'Searching…' : 'Search'}
        </button>
      </form>

      {error && <p className="form-error">{error}</p>}
      {sourceErrors.length > 0 && (
        <p className="text-sm text-[var(--ink-soft)]">
          {sourceErrors.join(' · ')} — showing results from the remaining source.
        </p>
      )}
      {isPending && !savingKey && results === null && (
        <div className="empty-state">Searching both sources — this can take up to ~30 seconds…</div>
      )}
      {results !== null && results.length === 0 && !isPending && (
        <div className="empty-state">No results — try broader keywords or another country.</div>
      )}

      {results !== null && results.length > 0 && (
        <ul className="flex flex-col gap-3">
          {results.map((r) => {
            const key = `${r.source}:${r.source_id}`;
            const savedJobId = savedKeys.has(key) ? savedKeys.get(key) : undefined;
            return (
              <li key={key} className="app-card p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-[var(--ink)]">{r.title}</p>
                    <p className="text-sm text-[var(--ink-soft)]">
                      {[r.company, r.location].filter(Boolean).join(' · ') || '—'}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--ink-soft)]">
                      <span className="chip chip-quiet">{r.source === 'hiringcafe' ? 'Hiring Cafe' : 'Adzuna'}</span>
                      {r.remote === true && <span className="chip chip-quiet">Remote</span>}
                      {r.salary && <span className="tabular">{r.salary}</span>}
                      {r.posted_at && <span className="tabular">{new Date(r.posted_at).toLocaleDateString()}</span>}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    {savedJobId !== undefined ? (
                      savedJobId ? (
                        <Link href={`/dashboard/jobs/${savedJobId}`} className="action-link">
                          <Check className="h-4 w-4" /> Saved
                        </Link>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-sm text-[var(--ink-soft)]">
                          <Check className="h-4 w-4" /> Saved
                        </span>
                      )
                    ) : (
                      <button type="button" disabled={savingKey === key} onClick={() => save(r)} className="btn btn-primary">
                        <Plus className="h-4 w-4" />
                        {savingKey === key ? 'Saving…' : 'Save to Jobs'}
                      </button>
                    )}
                    <a href={r.url} target="_blank" rel="noreferrer" className="action-link text-xs">
                      <ArrowSquareOut className="h-3.5 w-3.5" /> View posting
                    </a>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
```

(Adaptation rule as always: where these classes/icon idioms differ from what the existing dashboard components actually use, the existing UI wins.)

- [ ] **Step 4: Full verification**

Run: `npx vitest run && npx tsc --noEmit && npx next build`
Expected: suite green (no drop from Task 3's count), build lists `ƒ /dashboard/search`.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/search/ src/components/app-nav.tsx
git commit -m "feat(search): Find-jobs page — merged results, save-to-pipeline, source badges"
```

---

## Post-plan checklist (operator notes, not tasks)

- Create accounts + set env (local `.env.local` AND Vercel): `APIFY_TOKEN` (apify.com — free monthly credit covers dev), `ADZUNA_APP_ID`/`ADZUNA_APP_KEY` (developer.adzuna.com — free).
- **Post-deploy live smoke (operator):** one real search per source; if the Hiring Cafe mapper misses fields (unofficial API), capture the real JSON into `__fixtures__/hiringcafe.json` and adjust `mapHiringCafe` — the fixture tests make that a 10-minute fix.
- Update `docs/HANDOFF.md` after the phase lands.
- Named follow-ups: AI match scoring vs a Track; saved searches + cron alerts; Arbeitnow as a free third adapter; Upstash caching.
