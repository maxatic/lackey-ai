# Phase 4 — Cover Letter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** For a saved Job + chosen Career Track: AI proposes Skeleton-grounded talking points → user accepts/rejects → AI writes a cover letter from only the accepted points → editable text with Save/Copy, persisted per (job, track).

**Architecture:** New `cover_letters` table (same conventions as `node_cvs`); a `src/lib/letter/` module with two `callStructured` calls (`suggestPoints`, `writeLetter`) and strict/lenient validators; a `toActionError` allowlist helper (closes the deferred Phase-3 review finding) used by new actions and retrofitted onto existing ones; a `CoverLetter` panel on the job detail page mirroring TailorCv's UI conventions.

**Tech Stack:** Next.js 15 App Router, Supabase (Clerk third-party auth + RLS), `@anthropic-ai/sdk` via the existing `src/lib/ai/client.ts`, Vitest.

**Spec:** [docs/superpowers/specs/2026-07-02-cover-letter-design.md](../specs/2026-07-02-cover-letter-design.md)

## Global Constraints

- db helpers follow the Phase-1/3 pattern: `createServerSupabaseClient()`, RLS does tenancy (no user_id filter on reads), writes call `ensureUser()` + `auth()`, raw `PostgrestError` thrown.
- AI calls go through the existing `callStructured` (`src/lib/ai/client.ts`) — do NOT touch that file or `AI_MODEL`.
- No new npm dependencies. No zod — hand-rolled guards (see `src/lib/cv/suggest.ts` for the house idiom).
- All tests run WITHOUT `ANTHROPIC_API_KEY`/network/DB — mock `@/lib/ai/client` and db modules.
- Letters are **English only** and **plain text** (no address block, no date line, no placeholder brackets).
- UI uses the post-refresh design tokens exactly as `src/app/dashboard/jobs/[id]/TailorCv.tsx` does: `app-card p-5`, `section-title`, `field-label !mb-0`, `field !w-auto`, `btn btn-primary`, `form-error`, `empty-state`, `action-link`, chip/pill classes, `@phosphor-icons/react` icons (match TailorCv's exact import path).
- Baseline: 147 tests / 27 files. `npx vitest run`, `npx tsc --noEmit`, `npx next build` green at the end of every task. Commit per task.

---

### Task 1: Migration 0005 + database types + db-verify bump

**Files:**
- Create: `supabase/migrations/0005_cover_letters.sql`
- Modify: `src/lib/db/database.types.ts` (add `cover_letters` table)
- Modify: `scripts/db-verify.mjs` (both hardcoded `12`s → `13`, message strings updated)

**Interfaces:**
- Produces: table `cover_letters` with `unique (job_id, track_id)`; typed row `Database['public']['Tables']['cover_letters']`.

- [ ] **Step 1: Write the migration**

```sql
-- 0005_cover_letters.sql — cover_letters table + RLS.
-- Mirrors 0004 style: owner RLS via auth.jwt() ->> 'sub'.

create table cover_letters (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id) on delete cascade,
  job_id uuid not null references job_descriptions(id) on delete cascade,
  track_id uuid not null references career_tracks(id) on delete cascade,
  points jsonb not null default '[]',
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, track_id)
);

alter table cover_letters enable row level security;

create policy cover_letters_owner on cover_letters
  for all
  using      ((auth.jwt() ->> 'sub') = user_id)
  with check ((auth.jwt() ->> 'sub') = user_id);
```

- [ ] **Step 2: Add the table to `database.types.ts`** (inside `Tables`, following the file's conventions — columns with DB defaults optional on Insert):

```typescript
      cover_letters: {
        Row: { id: string; user_id: string; job_id: string; track_id: string; points: Json; body: string; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; job_id: string; track_id: string; points?: Json; body?: string; created_at?: string; updated_at?: string };
        Update: { id?: string; user_id?: string; job_id?: string; track_id?: string; points?: Json; body?: string; created_at?: string; updated_at?: string };
        Relationships: [];
      };
```

- [ ] **Step 3: Bump `scripts/db-verify.mjs`** — the table-count assertion and the RLS count both move `12` → `13`; update the two message strings to say 13.

- [ ] **Step 4: Apply + verify** — Run: `npm run db:migrate && npm run db:verify`. Expected: `0005_cover_letters.sql` applied; `✓ 13 public tables confirmed`; RLS on 13.

- [ ] **Step 5: Type check** — Run: `npx tsc --noEmit` → 0 errors.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0005_cover_letters.sql src/lib/db/database.types.ts scripts/db-verify.mjs
git commit -m "feat(letter): cover_letters table + RLS (0005)"
```

---

### Task 2: db helper — cover-letters.ts

**Files:**
- Create: `src/lib/db/cover-letters.ts`, `src/lib/db/cover-letters.test.ts`
- Modify: `src/lib/db/index.ts` (barrel)

**Interfaces:**
- Consumes: `Database` types from Task 1.
- Produces:
  - `type CoverLetter = Database['public']['Tables']['cover_letters']['Row']`
  - `upsertCoverLetter(input: { job_id: string; track_id: string; points: Json; body: string }): Promise<CoverLetter>` — `onConflict: 'job_id,track_id'`
  - `getCoverLetter(jobId: string, trackId: string): Promise<CoverLetter | null>`
  - `listCoverLettersByJob(jobId: string): Promise<CoverLetter[]>` — `updated_at` desc

- [ ] **Step 1: Write failing tests** — copy the in-memory builder mock from `src/lib/db/node-cvs.test.ts` (read it first; it already has `upsert`/`maybeSingle` terminals):

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
// Mocks: @/lib/supabase/server → builder client; @clerk/nextjs/server → auth {userId:'user_1'};
// @/lib/auth/ensure-user → no-op. Builder pattern verbatim from node-cvs.test.ts.

it('upsertCoverLetter inserts with user_id and returns the row', async () => {
  const row = await upsertCoverLetter({ job_id: 'j1', track_id: 't1', points: [], body: 'Dear team' });
  expect(row.user_id).toBe('user_1');
  expect(row.body).toBe('Dear team');
});
it('getCoverLetter returns null when absent', async () => {
  await expect(getCoverLetter('jX', 'tX')).resolves.toBeNull();
});
it('listCoverLettersByJob returns rows', async () => {
  await upsertCoverLetter({ job_id: 'j1', track_id: 't1', points: [], body: 'a' });
  await expect(listCoverLettersByJob('j1')).resolves.toHaveLength(1);
});
```

- [ ] **Step 2: Run, verify FAIL** — `npx vitest run src/lib/db/cover-letters.test.ts` → module missing.

- [ ] **Step 3: Implement**

```typescript
// src/lib/db/cover-letters.ts
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ensureUser } from '@/lib/auth/ensure-user';
import type { Database, Json } from '@/lib/db/database.types';

export type CoverLetter = Database['public']['Tables']['cover_letters']['Row'];

export async function upsertCoverLetter(input: {
  job_id: string;
  track_id: string;
  points: Json;
  body: string;
}): Promise<CoverLetter> {
  await ensureUser();
  const { userId } = await auth();
  if (!userId) throw new Error('Not authenticated');
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('cover_letters')
    .upsert(
      { ...input, user_id: userId, updated_at: new Date().toISOString() },
      { onConflict: 'job_id,track_id' },
    )
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function getCoverLetter(jobId: string, trackId: string): Promise<CoverLetter | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('cover_letters')
    .select('*')
    .eq('job_id', jobId)
    .eq('track_id', trackId)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function listCoverLettersByJob(jobId: string): Promise<CoverLetter[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('cover_letters')
    .select('*')
    .eq('job_id', jobId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
```

- [ ] **Step 4: Barrel** — append to `src/lib/db/index.ts`:

```typescript
export * from './cover-letters'; // Phase 4
```

- [ ] **Step 5: Run all tests + types** — `npx vitest run && npx tsc --noEmit` → green (150 tests expected).

- [ ] **Step 6: Commit**

```bash
git add src/lib/db/
git commit -m "feat(letter): cover_letters db helper (upsert/get/list-by-job)"
```

---

### Task 3: toActionError allowlist + retrofit (deferred Phase-3 review item)

**Files:**
- Create: `src/lib/action-error.ts`, `src/lib/action-error.test.ts`
- Modify: `src/app/dashboard/jobs/actions.ts` (two catch blocks)
- Modify: `src/app/dashboard/jobs/[id]/tailor/actions.ts` (`suggestTailoringAction` catch block)
- Possibly modify: their test files IF any test asserts a message the allowlist rejects (check; the known asserted messages — `'Job description is empty'`, `'Missing ANTHROPIC_API_KEY'`, `'Job not found'` — are all allowlisted and keep passing).

**Interfaces:**
- Produces:
  - `toActionError(err: unknown): string`
  - `GENERIC_ACTION_ERROR = 'Something went wrong — please try again'`
- Consumed by Task 5's letter actions.

- [ ] **Step 1: Write failing tests**

```typescript
// src/lib/action-error.test.ts
import { describe, it, expect } from 'vitest';
import { toActionError, GENERIC_ACTION_ERROR } from './action-error';

const SAFE = [
  'Missing ANTHROPIC_API_KEY',
  'AI returned an unexpected response — please try again',
  'Job description is empty',
  'Job description is too long (max 20,000 characters)',
  'Job not found',
  'This job has no parsed data — re-add it',
  'Track not found', 'Entry not found', 'Bullet not found', 'Skill not found', 'Language not found',
  'Not authenticated',
  'Missing job or track',
  'Invalid locale',
  'No talking points selected — accept at least one point',
];

it('passes through every allowlisted message', () => {
  for (const msg of SAFE) expect(toActionError(new Error(msg))).toBe(msg);
});

it('collapses unknown errors to the generic message', () => {
  expect(toActionError(new Error('duplicate key value violates unique constraint "x"'))).toBe(GENERIC_ACTION_ERROR);
  expect(toActionError({ code: 'PGRST116', message: 'raw postgrest' })).toBe(GENERIC_ACTION_ERROR);
  expect(toActionError('string throw')).toBe(GENERIC_ACTION_ERROR);
  expect(toActionError(undefined)).toBe(GENERIC_ACTION_ERROR);
});
```

- [ ] **Step 2: Run, verify FAIL.**

- [ ] **Step 3: Implement**

```typescript
// src/lib/action-error.ts
// Trust boundary: server actions must not leak raw db/AI internals to the client.
// Only these exact messages (all authored by our own code) pass through.
const SAFE_MESSAGES = new Set([
  'Missing ANTHROPIC_API_KEY',
  'AI returned an unexpected response — please try again',
  'Job description is empty',
  'Job description is too long (max 20,000 characters)',
  'Job not found',
  'This job has no parsed data — re-add it',
  'Track not found',
  'Entry not found',
  'Bullet not found',
  'Skill not found',
  'Language not found',
  'Not authenticated',
  'Missing job or track',
  'Invalid locale',
  'No talking points selected — accept at least one point',
]);

export const GENERIC_ACTION_ERROR = 'Something went wrong — please try again';

export function toActionError(err: unknown): string {
  const msg = err instanceof Error ? err.message : '';
  return SAFE_MESSAGES.has(msg) ? msg : GENERIC_ACTION_ERROR;
}
```

- [ ] **Step 4: Retrofit the three catch blocks.** In `src/app/dashboard/jobs/actions.ts` add `import { toActionError } from '@/lib/action-error';` and change:

```typescript
// createJobAction:
  } catch (err) {
    return { error: toActionError(err) };
  }
// updateJobAction:
  } catch (err) {
    return { error: toActionError(err) };
  }
```

In `src/app/dashboard/jobs/[id]/tailor/actions.ts` (same import) change `suggestTailoringAction`'s catch:

```typescript
  } catch (err) {
    return { error: toActionError(err) };
  }
```

Do NOT change `generateNodeCvAction` (it throws to the client component's own catch; its thrown messages are already our own — out of scope per spec).

- [ ] **Step 5: Run all tests + types** — `npx vitest run && npx tsc --noEmit`. If an existing action test asserted a non-allowlisted fallback (e.g. `'Could not add this job'`), update that expectation to `GENERIC_ACTION_ERROR` — do not weaken any other assertion.

- [ ] **Step 6: Commit**

```bash
git add src/lib/action-error.ts src/lib/action-error.test.ts src/app/dashboard/jobs/
git commit -m "fix(actions): allowlist error messages before they reach the client"
```

---

### Task 4: Letter module — types, suggestPoints, writeLetter

**Files:**
- Create: `src/lib/letter/types.ts`, `src/lib/letter/points.ts`, `src/lib/letter/write.ts`
- Create: `src/lib/letter/points.test.ts`, `src/lib/letter/write.test.ts`

**Interfaces:**
- Consumes: `callStructured` (`@/lib/ai/client`), `ParsedJd` (`@/lib/jd/types`), `TrackSnapshot` (`@/lib/cv/data`).
- Produces:
  - `type LetterPoint = { entry_id: string; text: string; reason: string }`
  - `suggestPoints(jd: ParsedJd, snapshot: TrackSnapshot): Promise<LetterPoint[]>`
  - `validateLetterPoints(raw: unknown, snapshot: TrackSnapshot): LetterPoint[] | null` — STRICT (AI retry path): null on shape failure; unknown `entry_id` items dropped
  - `sanitizeLetterPoints(raw: unknown, snapshot: TrackSnapshot): LetterPoint[]` — LENIENT (client-input path): never throws, drops malformed items and unknown ids, `[]` for garbage
  - `writeLetter(jd: ParsedJd, points: LetterPoint[], profile: { full_name: string | null; headline: string | null }): Promise<string>`

- [ ] **Step 1: Write failing tests**

```typescript
// src/lib/letter/points.test.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const callStructuredMock = vi.fn();
vi.mock('@/lib/ai/client', () => ({
  callStructured: (o: unknown) => callStructuredMock(o),
  AI_MODEL: 'claude-opus-4-8',
}));

import { suggestPoints, validateLetterPoints, sanitizeLetterPoints } from './points';
import type { TrackSnapshot } from '@/lib/cv/data';

const snap = (): TrackSnapshot => ({
  track: { name: 'T', target_title: null, summary: 'summary' },
  profile: { full_name: 'A B', headline: 'Dev', email: null, phone: null, location: null, links: [], date_of_birth: null, nationality: null, marital_status: null },
  entries: [
    { id: 'e1', kind: 'experience', title: 'Dev', organization: 'ACME', location: null, start_date: null, end_date: null, is_current: false, summary: null, details: {}, bullets: [{ id: 'b1', text: 'did x' }] },
    { id: 'e2', kind: 'education', title: 'BSc', organization: null, location: null, start_date: null, end_date: null, is_current: false, summary: null, details: {}, bullets: [] },
  ],
  skills: [{ id: 's1', name: 'TS', category: null }],
  languages: [],
});

const jd = { title: 'SWE', company: 'ACME', location: null, language: null, requirements: ['TS'], keywords: ['react'] };
const goodPoint = { entry_id: 'e1', text: 'Built x at ACME', reason: 'JD wants TS experience' };

beforeEach(() => callStructuredMock.mockReset());

it('suggestPoints serializes snapshot ids + JD into the prompt and returns validated points', async () => {
  callStructuredMock.mockImplementation(async (o: any) => o.validate({ points: [goodPoint] }));
  await expect(suggestPoints(jd, snap())).resolves.toEqual([goodPoint]);
  const opts = callStructuredMock.mock.calls[0][0];
  expect(opts.user).toContain('"e1"');
  expect(opts.user).toContain('SWE');
  expect(opts.system).toMatch(/never invent/i);
  expect(opts.maxTokens).toBe(4096);
});

it('validateLetterPoints: good shape passes; unknown entry_id dropped; empty array valid', () => {
  expect(validateLetterPoints({ points: [goodPoint] }, snap())).toEqual([goodPoint]);
  expect(validateLetterPoints({ points: [goodPoint, { entry_id: 'ghost', text: 't', reason: 'r' }] }, snap())).toEqual([goodPoint]);
  expect(validateLetterPoints({ points: [] }, snap())).toEqual([]);
});

it('validateLetterPoints: shape violations return null (AI retry)', () => {
  expect(validateLetterPoints(null, snap())).toBeNull();
  expect(validateLetterPoints({ points: 'nope' }, snap())).toBeNull();
  expect(validateLetterPoints({ points: [{ entry_id: 'e1', text: 42, reason: 'r' }] }, snap())).toBeNull();
  expect(validateLetterPoints({ points: [{ entry_id: 'e1', text: 't' }] }, snap())).toBeNull(); // reason required
});

it('sanitizeLetterPoints never throws and filters junk', () => {
  expect(sanitizeLetterPoints(null, snap())).toEqual([]);
  expect(sanitizeLetterPoints('garbage', snap())).toEqual([]);
  expect(sanitizeLetterPoints([goodPoint, { bad: 1 }, { entry_id: 'ghost', text: 't', reason: 'r' }], snap())).toEqual([goodPoint]);
});
```

```typescript
// src/lib/letter/write.test.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const callStructuredMock = vi.fn();
vi.mock('@/lib/ai/client', () => ({
  callStructured: (o: unknown) => callStructuredMock(o),
  AI_MODEL: 'claude-opus-4-8',
}));

import { writeLetter } from './write';

const jd = { title: 'SWE', company: 'ACME', location: null, language: null, requirements: [], keywords: [] };
const points = [{ entry_id: 'e1', text: 'Built x at ACME', reason: 'relevant' }];

beforeEach(() => callStructuredMock.mockReset());

it('passes ONLY the given points and profile basics into the prompt', async () => {
  callStructuredMock.mockImplementation(async (o: any) => o.validate({ body: 'Dear ACME team, ...' }));
  await expect(writeLetter(jd, points, { full_name: 'A B', headline: 'Dev' })).resolves.toBe('Dear ACME team, ...');
  const opts = callStructuredMock.mock.calls[0][0];
  expect(opts.user).toContain('Built x at ACME');
  expect(opts.user).toContain('A B');
  expect(opts.system).toMatch(/only.*points|points.*only/i);
  expect(opts.system).toMatch(/english/i);
});

it('validator rejects empty/blank body (retry path)', async () => {
  callStructuredMock.mockImplementation(async (o: any) => {
    expect(o.validate({ body: '   ' })).toBeNull();
    expect(o.validate({ body: 42 })).toBeNull();
    expect(o.validate(null)).toBeNull();
    return 'ok-letter';
  });
  await expect(writeLetter(jd, points, { full_name: null, headline: null })).resolves.toBe('ok-letter');
});
```

- [ ] **Step 2: Run, verify FAIL** — `npx vitest run src/lib/letter` → modules missing.

- [ ] **Step 3: Implement**

```typescript
// src/lib/letter/types.ts
export type LetterPoint = {
  entry_id: string; // grounds the point in a Skeleton entry
  text: string;     // the talking point, one sentence
  reason: string;   // why it matters for THIS job (shown in the UI)
};
```

```typescript
// src/lib/letter/points.ts
import { callStructured } from '@/lib/ai/client';
import type { ParsedJd } from '@/lib/jd/types';
import type { TrackSnapshot } from '@/lib/cv/data';
import type { LetterPoint } from './types';

const isPoint = (v: unknown): v is LetterPoint =>
  !!v && typeof v === 'object' &&
  typeof (v as Record<string, unknown>).entry_id === 'string' &&
  typeof (v as Record<string, unknown>).text === 'string' &&
  typeof (v as Record<string, unknown>).reason === 'string';

// STRICT — for the AI retry path: shape failure → null; unknown entry ids dropped.
export function validateLetterPoints(raw: unknown, snapshot: TrackSnapshot): LetterPoint[] | null {
  if (!raw || typeof raw !== 'object') return null;
  const points = (raw as Record<string, unknown>).points;
  if (!Array.isArray(points) || !points.every(isPoint)) return null;
  const entryIds = new Set(snapshot.entries.map((e) => e.id));
  return points.filter((p) => entryIds.has(p.entry_id));
}

// LENIENT — for client-supplied JSON: never throws, filters junk item-by-item.
export function sanitizeLetterPoints(raw: unknown, snapshot: TrackSnapshot): LetterPoint[] {
  if (!Array.isArray(raw)) return [];
  const entryIds = new Set(snapshot.entries.map((e) => e.id));
  return raw
    .filter(isPoint)
    .filter((p) => entryIds.has(p.entry_id))
    .map((p) => ({ entry_id: p.entry_id, text: p.text, reason: p.reason }));
}

const POINTS_SCHEMA = {
  type: 'object',
  properties: {
    points: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          entry_id: { type: 'string', description: 'Id of the Skeleton entry that supports this point' },
          text: { type: 'string', description: 'The talking point — one sentence, grounded in the referenced entry' },
          reason: { type: 'string', description: 'One sentence: why this matters for THIS job description' },
        },
        required: ['entry_id', 'text', 'reason'],
        additionalProperties: false,
      },
    },
  },
  required: ['points'],
  additionalProperties: false,
} as const;

function serializeSnapshot(s: TrackSnapshot): string {
  return JSON.stringify({
    headline: s.profile.headline,
    track_summary: s.track.summary,
    entries: s.entries.map((e) => ({
      id: e.id, kind: e.kind, title: e.title, organization: e.organization,
      summary: e.summary, bullets: e.bullets.map((b) => b.text),
    })),
    skills: s.skills.map((sk) => sk.name),
  }, null, 2);
}

export async function suggestPoints(jd: ParsedJd, snapshot: TrackSnapshot): Promise<LetterPoint[]> {
  return callStructured<LetterPoint[]>({
    system: [
      'You select cover-letter talking points by matching a candidate\'s CV data to a job description.',
      'HARD RULES: never invent experience, skills, or achievements. Every point must be directly supported by the referenced entry (its title, organization, summary, or bullets).',
      'Propose 6 to 8 points, most compelling first. Each point is one concrete sentence in the first person.',
    ].join(' '),
    user: `JOB DESCRIPTION (parsed):\n${JSON.stringify(jd, null, 2)}\n\nCANDIDATE CV DATA (with entry ids):\n${serializeSnapshot(snapshot)}`,
    toolName: 'record_letter_points',
    toolDescription: 'Record the grounded talking points for this cover letter.',
    inputSchema: POINTS_SCHEMA as unknown as Record<string, unknown>,
    validate: (raw) => validateLetterPoints(raw, snapshot),
    maxTokens: 4096,
  });
}
```

```typescript
// src/lib/letter/write.ts
import { callStructured } from '@/lib/ai/client';
import type { ParsedJd } from '@/lib/jd/types';
import type { LetterPoint } from './types';

const BODY_SCHEMA = {
  type: 'object',
  properties: {
    body: { type: 'string', description: 'The complete cover letter as plain text' },
  },
  required: ['body'],
  additionalProperties: false,
} as const;

export async function writeLetter(
  jd: ParsedJd,
  points: LetterPoint[],
  profile: { full_name: string | null; headline: string | null },
): Promise<string> {
  return callStructured<string>({
    system: [
      'You write cover letters. Professional but human tone — no stiff boilerplate, no exclamation marks, no flattery padding.',
      'HARD RULES: use ONLY the given talking points as factual claims about the candidate; do not add experience, skills, or achievements beyond them.',
      'Write in English, roughly 250-350 words, plain text for pasting into a form or email: no address block, no date line, no placeholder brackets like [Company].',
      'Greet with the company name when known, otherwise use a neutral professional greeting. Sign off with the candidate\'s name.',
    ].join(' '),
    user: [
      `JOB DESCRIPTION (parsed):\n${JSON.stringify(jd, null, 2)}`,
      `CANDIDATE: ${profile.full_name ?? 'the candidate'}${profile.headline ? ` — ${profile.headline}` : ''}`,
      `TALKING POINTS (the only permitted factual claims):\n${points.map((p, i) => `${i + 1}. ${p.text}`).join('\n')}`,
    ].join('\n\n'),
    toolName: 'record_letter',
    toolDescription: 'Record the finished cover letter text.',
    inputSchema: BODY_SCHEMA as unknown as Record<string, unknown>,
    validate: (raw) => {
      if (!raw || typeof raw !== 'object') return null;
      const body = (raw as Record<string, unknown>).body;
      return typeof body === 'string' && body.trim() ? body : null;
    },
    maxTokens: 4096,
  });
}
```

- [ ] **Step 4: Run tests + types** — `npx vitest run && npx tsc --noEmit` → green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/letter/
git commit -m "feat(letter): suggestPoints + writeLetter — grounded two-call letter module"
```

---

### Task 5: Letter server actions

**Files:**
- Create: `src/app/dashboard/jobs/[id]/letter/actions.ts`
- Create: `src/app/dashboard/jobs/[id]/letter/actions.test.ts`

**Interfaces:**
- Consumes: `getJob`, `validateParsedJd`, `buildTrackSnapshot`, `suggestPoints`/`sanitizeLetterPoints` (Task 4), `writeLetter` (Task 4), `upsertCoverLetter` (Task 2), `toActionError` (Task 3).
- Produces:
  - `suggestLetterPointsAction(jobId: string, trackId: string): Promise<{ points: LetterPoint[] } | { error: string }>`
  - `generateLetterAction(jobId: string, trackId: string, pointsJson: string): Promise<{ body: string } | { error: string }>`
  - `saveCoverLetterAction(jobId: string, trackId: string, pointsJson: string, body: string): Promise<{ ok: true } | { error: string }>`

- [ ] **Step 1: Write failing tests** (mock pattern mirrors `src/app/dashboard/jobs/[id]/tailor/actions.test.ts` — read it first):

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = {
  getJob: vi.fn(), buildTrackSnapshot: vi.fn(), suggestPoints: vi.fn(),
  writeLetter: vi.fn(), upsertCoverLetter: vi.fn(),
};
vi.mock('@/lib/db/jobs', () => ({ getJob: (...a: any[]) => mocks.getJob(...a) }));
vi.mock('@/lib/cv/data', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  buildTrackSnapshot: (...a: any[]) => mocks.buildTrackSnapshot(...a),
}));
vi.mock('@/lib/letter/points', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  suggestPoints: (...a: any[]) => mocks.suggestPoints(...a),
}));
vi.mock('@/lib/letter/write', () => ({ writeLetter: (...a: any[]) => mocks.writeLetter(...a) }));
vi.mock('@/lib/db/cover-letters', () => ({ upsertCoverLetter: (...a: any[]) => mocks.upsertCoverLetter(...a) }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { suggestLetterPointsAction, generateLetterAction, saveCoverLetterAction } from './actions';
import { GENERIC_ACTION_ERROR } from '@/lib/action-error';

const SNAP = {
  track: { name: 'T', target_title: null, summary: null },
  profile: { full_name: 'A B', headline: 'Dev', email: null, phone: null, location: null, links: [], date_of_birth: null, nationality: null, marital_status: null },
  entries: [{ id: 'e1', kind: 'experience', title: 'Dev', organization: null, location: null, start_date: null, end_date: null, is_current: false, summary: null, details: {}, bullets: [] }],
  skills: [], languages: [],
};
const PARSED = { title: 'SWE', company: null, location: null, language: null, requirements: [], keywords: [] };
const POINT = { entry_id: 'e1', text: 'Built x', reason: 'relevant' };

beforeEach(() => { Object.values(mocks).forEach((m) => m.mockReset()); });

it('suggestLetterPointsAction returns points', async () => {
  mocks.getJob.mockResolvedValue({ id: 'j1', parsed: PARSED });
  mocks.buildTrackSnapshot.mockResolvedValue(SNAP);
  mocks.suggestPoints.mockResolvedValue([POINT]);
  await expect(suggestLetterPointsAction('j1', 't1')).resolves.toEqual({ points: [POINT] });
});

it('suggestLetterPointsAction: missing job → allowlisted error', async () => {
  mocks.getJob.mockResolvedValue(null);
  await expect(suggestLetterPointsAction('jX', 't1')).resolves.toEqual({ error: 'Job not found' });
});

it('suggestLetterPointsAction: unexpected error collapses to generic', async () => {
  mocks.getJob.mockResolvedValue({ id: 'j1', parsed: PARSED });
  mocks.buildTrackSnapshot.mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:5432'));
  await expect(suggestLetterPointsAction('j1', 't1')).resolves.toEqual({ error: GENERIC_ACTION_ERROR });
});

it('generateLetterAction sanitizes client points and calls writeLetter with profile basics', async () => {
  mocks.getJob.mockResolvedValue({ id: 'j1', parsed: PARSED });
  mocks.buildTrackSnapshot.mockResolvedValue(SNAP);
  mocks.writeLetter.mockResolvedValue('Dear team, ...');
  const hostile = JSON.stringify([POINT, { entry_id: 'ghost', text: 't', reason: 'r' }, { bad: 1 }]);
  await expect(generateLetterAction('j1', 't1', hostile)).resolves.toEqual({ body: 'Dear team, ...' });
  expect(mocks.writeLetter).toHaveBeenCalledWith(PARSED, [POINT], { full_name: 'A B', headline: 'Dev' });
});

it('generateLetterAction: no surviving points → allowlisted error, no AI call', async () => {
  mocks.getJob.mockResolvedValue({ id: 'j1', parsed: PARSED });
  mocks.buildTrackSnapshot.mockResolvedValue(SNAP);
  await expect(generateLetterAction('j1', 't1', 'not json')).resolves.toEqual({ error: 'No talking points selected — accept at least one point' });
  expect(mocks.writeLetter).not.toHaveBeenCalled();
});

it('saveCoverLetterAction upserts sanitized points + body', async () => {
  mocks.buildTrackSnapshot.mockResolvedValue(SNAP);
  mocks.upsertCoverLetter.mockResolvedValue({});
  await expect(saveCoverLetterAction('j1', 't1', JSON.stringify([POINT]), 'my letter')).resolves.toEqual({ ok: true });
  expect(mocks.upsertCoverLetter).toHaveBeenCalledWith({ job_id: 'j1', track_id: 't1', points: [POINT], body: 'my letter' });
});
```

- [ ] **Step 2: Run, verify FAIL.**

- [ ] **Step 3: Implement**

```typescript
// src/app/dashboard/jobs/[id]/letter/actions.ts
'use server';
import { revalidatePath } from 'next/cache';
import { getJob } from '@/lib/db/jobs';
import { validateParsedJd } from '@/lib/jd/parse';
import { buildTrackSnapshot } from '@/lib/cv/data';
import { suggestPoints, sanitizeLetterPoints } from '@/lib/letter/points';
import { writeLetter } from '@/lib/letter/write';
import type { LetterPoint } from '@/lib/letter/types';
import { upsertCoverLetter } from '@/lib/db/cover-letters';
import { toActionError } from '@/lib/action-error';

export async function suggestLetterPointsAction(
  jobId: string,
  trackId: string,
): Promise<{ points: LetterPoint[] } | { error: string }> {
  try {
    const job = await getJob(jobId);
    if (!job) return { error: 'Job not found' };
    const parsed = validateParsedJd(job.parsed);
    if (!parsed) return { error: 'This job has no parsed data — re-add it' };
    const snapshot = await buildTrackSnapshot(trackId);
    const points = await suggestPoints(parsed, snapshot);
    return { points };
  } catch (err) {
    return { error: toActionError(err) };
  }
}

export async function generateLetterAction(
  jobId: string,
  trackId: string,
  pointsJson: string,
): Promise<{ body: string } | { error: string }> {
  try {
    const job = await getJob(jobId);
    if (!job) return { error: 'Job not found' };
    const parsed = validateParsedJd(job.parsed);
    if (!parsed) return { error: 'This job has no parsed data — re-add it' };
    const snapshot = await buildTrackSnapshot(trackId);
    // Trust boundary: client-supplied JSON — sanitize against a fresh snapshot.
    let raw: unknown = [];
    try { raw = JSON.parse(pointsJson); } catch { /* [] */ }
    const points = sanitizeLetterPoints(raw, snapshot);
    if (points.length === 0) {
      return { error: 'No talking points selected — accept at least one point' };
    }
    const body = await writeLetter(parsed, points, {
      full_name: snapshot.profile.full_name,
      headline: snapshot.profile.headline,
    });
    return { body };
  } catch (err) {
    return { error: toActionError(err) };
  }
}

export async function saveCoverLetterAction(
  jobId: string,
  trackId: string,
  pointsJson: string,
  body: string,
): Promise<{ ok: true } | { error: string }> {
  try {
    const snapshot = await buildTrackSnapshot(trackId);
    let raw: unknown = [];
    try { raw = JSON.parse(pointsJson); } catch { /* [] */ }
    const points = sanitizeLetterPoints(raw, snapshot);
    await upsertCoverLetter({ job_id: jobId, track_id: trackId, points, body });
    revalidatePath(`/dashboard/jobs/${jobId}`);
    return { ok: true };
  } catch (err) {
    return { error: toActionError(err) };
  }
}
```

- [ ] **Step 4: Run tests + types** — green.

- [ ] **Step 5: Commit**

```bash
git add 'src/app/dashboard/jobs/[id]/letter/'
git commit -m "feat(letter): suggest/generate/save server actions (allowlisted errors)"
```

---

### Task 6: CoverLetter panel + page wiring + RLS + final verification

**Files:**
- Create: `src/app/dashboard/jobs/[id]/CoverLetter.tsx`
- Modify: `src/app/dashboard/jobs/[id]/page.tsx` (fetch letters, render panel)
- Modify: `scripts/test-rls.mjs` (cover the new table)

**Interfaces:**
- Consumes: the three Task-5 actions; `listCoverLettersByJob` (Task 2); `LetterPoint` type.
- Produces: `CoverLetter({ jobId, tracks, existingLetters })` client component — `existingLetters: { track_id: string; points: LetterPoint[]; body: string }[]`.

- [ ] **Step 1: Implement `CoverLetter.tsx`** (styling mirrors `TailorCv.tsx` — reuse its exact class tokens and its `@phosphor-icons/react` import path):

```tsx
// src/app/dashboard/jobs/[id]/CoverLetter.tsx
'use client';
import { useMemo, useState, useTransition } from 'react';
import { Sparkle, Check, X, CopySimple, FloppyDisk } from '@phosphor-icons/react';
import type { LetterPoint } from '@/lib/letter/types';
import { suggestLetterPointsAction, generateLetterAction, saveCoverLetterAction } from './letter/actions';

interface Props {
  jobId: string;
  tracks: { id: string; name: string }[];
  existingLetters: { track_id: string; points: LetterPoint[]; body: string }[];
}

export function CoverLetter({ jobId, tracks, existingLetters }: Props) {
  const savedByTrack = useMemo(
    () => new Map(existingLetters.map((l) => [l.track_id, l])),
    [existingLetters],
  );

  const [trackId, setTrackId] = useState(tracks[0]?.id ?? '');
  const [points, setPoints] = useState<LetterPoint[] | null>(savedByTrack.get(tracks[0]?.id ?? '')?.points ?? null);
  const [accepted, setAccepted] = useState<boolean[]>(() => (points ?? []).map(() => true));
  const [body, setBody] = useState(savedByTrack.get(tracks[0]?.id ?? '')?.body ?? '');
  const [cleanBody, setCleanBody] = useState(body); // last generated/saved body — dirty check
  const [status, setStatus] = useState<'idle' | 'copied' | 'saved'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function selectTrack(id: string) {
    setTrackId(id);
    setError(null);
    setStatus('idle');
    const saved = savedByTrack.get(id);
    setPoints(saved?.points ?? null);
    setAccepted((saved?.points ?? []).map(() => true));
    setBody(saved?.body ?? '');
    setCleanBody(saved?.body ?? '');
  }

  const acceptedPoints = (points ?? []).filter((_, i) => accepted[i]);

  function suggest() {
    setError(null); setStatus('idle');
    startTransition(async () => {
      const res = await suggestLetterPointsAction(jobId, trackId);
      if ('error' in res) { setError(res.error); return; }
      setPoints(res.points);
      setAccepted(res.points.map(() => true));
    });
  }

  function generate() {
    if (body.trim() && body !== cleanBody) {
      if (!window.confirm('Overwrite your unsaved edits with a new letter?')) return;
    }
    setError(null); setStatus('idle');
    startTransition(async () => {
      const res = await generateLetterAction(jobId, trackId, JSON.stringify(acceptedPoints));
      if ('error' in res) { setError(res.error); return; }
      setBody(res.body);
      setCleanBody(res.body);
    });
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await saveCoverLetterAction(jobId, trackId, JSON.stringify(acceptedPoints), body);
      if ('error' in res) { setError(res.error); return; }
      setCleanBody(body);
      setStatus('saved');
    });
  }

  async function copy() {
    await navigator.clipboard.writeText(body);
    setStatus('copied');
  }

  return (
    <section className="app-card flex flex-col gap-5 p-5">
      <h2 className="section-title">Cover letter</h2>

      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="letter-track" className="field-label !mb-0">Track</label>
        <select id="letter-track" value={trackId} onChange={(e) => selectTrack(e.target.value)} className="field !w-auto">
          {tracks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <button type="button" onClick={suggest} disabled={isPending || !trackId} className="btn btn-primary">
          <Sparkle className="h-4 w-4" weight="fill" />
          {isPending && !points ? 'Thinking…' : 'Suggest points'}
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}

      {points && points.length === 0 && (
        <div className="empty-state">No grounded talking points found for this track — add entries or curate the track first.</div>
      )}

      {points && points.length > 0 && (
        <>
          <ul className="flex flex-col gap-3">
            {points.map((p, i) => (
              <li
                key={`${p.entry_id}:${i}`}
                className={`rounded-2xl border p-4 text-sm transition-all duration-200 ${
                  accepted[i] ? 'border-[var(--line)] bg-white' : 'border-[var(--line)]/50 bg-transparent opacity-50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[var(--ink)]">{p.text}</p>
                    <p className="mt-2 text-xs text-[var(--ink-soft)]">{p.reason}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAccepted((prev) => prev.map((v, j) => (j === i ? !v : v)))}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                      accepted[i]
                        ? 'bg-[var(--accent)] text-white'
                        : 'bg-[var(--paper-deep,#f1ede2)] text-[var(--ink-soft)]'
                    }`}
                  >
                    {accepted[i] ? (<><Check className="h-3.5 w-3.5" weight="bold" /> Accepted</>) : (<><X className="h-3.5 w-3.5" weight="bold" /> Rejected</>)}
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center gap-3 border-t border-[var(--line)]/60 pt-4">
            <button type="button" onClick={generate} disabled={isPending || acceptedPoints.length === 0} className="btn btn-primary">
              {isPending ? 'Writing…' : 'Generate letter'}
            </button>
          </div>
        </>
      )}

      {(body || cleanBody) && (
        <div className="flex flex-col gap-3">
          <textarea
            value={body}
            onChange={(e) => { setBody(e.target.value); setStatus('idle'); }}
            rows={16}
            className="field font-body leading-relaxed"
            aria-label="Cover letter text"
          />
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={save} disabled={isPending || !body.trim()} className="btn btn-primary">
              <FloppyDisk className="h-4 w-4" />
              {status === 'saved' ? 'Saved' : 'Save'}
            </button>
            <button type="button" onClick={copy} disabled={!body.trim()} className="action-link">
              <CopySimple className="h-4 w-4" />
              {status === 'copied' ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
```

NOTE for the implementer: before writing this file, open `TailorCv.tsx` and copy its exact icon import path and any pill/card class specifics that differ from the above — the component must look native next to it. If a class like `bg-[var(--paper-deep,#f1ede2)]` doesn't exist in `globals.css`, use whatever TailorCv's rejected-pill state uses.

- [ ] **Step 2: Wire the page.** In `src/app/dashboard/jobs/[id]/page.tsx`:
  - Add imports: `import { listCoverLettersByJob } from '@/lib/db/cover-letters';`, `import { CoverLetter } from './CoverLetter';`, `import { sanitizeLetterPoints } from '@/lib/letter/points';` is NOT needed — pass the stored `points` through with a light cast + runtime shape guard:
  - Extend the parallel fetch: `const [tracks, existingDocs, letters] = await Promise.all([listTracks(), listCvDocumentsByJob(id), listCoverLettersByJob(id)]);`
  - Inside the `tracks.length === 0 ? … : (` branch, render below `<TailorCv …/>` (wrap both in a fragment):

```tsx
        <CoverLetter
          jobId={job.id}
          tracks={tracks.map((t) => ({ id: t.id, name: t.name }))}
          existingLetters={letters.map((l) => ({
            track_id: l.track_id,
            points: Array.isArray(l.points)
              ? (l.points as unknown[]).filter(
                  (p): p is import('@/lib/letter/types').LetterPoint =>
                    !!p && typeof p === 'object' &&
                    typeof (p as { entry_id?: unknown }).entry_id === 'string' &&
                    typeof (p as { text?: unknown }).text === 'string' &&
                    typeof (p as { reason?: unknown }).reason === 'string',
                )
              : [],
            body: l.body,
          }))}
        />
```

- [ ] **Step 3: Extend `scripts/test-rls.mjs`.** Follow the file's existing `node_cvs` pattern exactly:
  - In the user-A setup section, after the `node_cvs` insert: `await client.query('insert into cover_letters (user_id, job_id, track_id, body) values ($1, $2, $3, $4)', [SUB_A, jobId, trackId, 'letter A']);`
  - Add to `isolationChecks`: `{ table: 'cover_letters', where: \`job_id = '${jobId}'\` },`
  - Update the setup log line's table count (10 → 11 data tables).
  - Run: `npm run test:rls` → passes with the new table covered.

- [ ] **Step 4: Full verification**

Run: `npx vitest run && npx tsc --noEmit && npx next build`
Expected: all green (target ≥ 165 tests), build clean with `/dashboard/jobs/[id]` present.

- [ ] **Step 5: Commit**

```bash
git add 'src/app/dashboard/jobs/[id]/' scripts/test-rls.mjs
git commit -m "feat(letter): CoverLetter panel — grounded points, editable letter, save/copy"
```

---

## Post-plan checklist (operator notes, not tasks)

- Live use needs `ANTHROPIC_API_KEY` (local ✓; Vercel still on the ops list).
- No Fly dependency — letters are text.
- Update `docs/HANDOFF.md` after the phase lands (MVP line 0–4 complete).
