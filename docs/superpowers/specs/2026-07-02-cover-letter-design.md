# Lackey AI — Cover Letter (Phase 4) Design

**Status:** approved design, pre-plan (2026-07-02)
**Depends on:** Phase 1 (Skeleton), Phase 3 (Jobs / JD ingestion, `TrackSnapshot`, AI client) — all done & merged. Completes the MVP line (phases 0–4).
**Spec for:** a spec → plan → build cycle. See [CLAUDE.md](../../../CLAUDE.md) for vision/stack.

---

## Goal

For a saved **Job** and a chosen **Career Track**: AI proposes **talking points**, each grounded in a specific Skeleton entry; the user accepts/rejects them; AI writes a cover letter from **only the accepted points**; the user edits, saves, and copies the final text. Never from scratch — always grounded in the Skeleton.

**Decisions (made during brainstorming):**
- **Output = editable text** (textarea + copy button). Most applications want the letter pasted into a form or email. No PDF at MVP (a letter template through the existing LaTeX/Fly pipeline is a clean follow-up).
- **Points-first align loop** (not one-shot draft): the "user aligns" step operates on structured, per-entry-grounded points — the same anti-fabrication mechanism proven in Phase 3.
- **English only at MVP.** Language is a prompt instruction, trivially added later; `job_descriptions.parsed.language` already exists for when it is.
- **Grounding source = the Track snapshot** (`buildTrackSnapshot`), not the raw Skeleton: the letter draws from the same curated material as the CV it accompanies.

## Scope

**In scope**
- `cover_letters` table (migration `0005`), RLS, `db-verify`/`test:rls` coverage.
- `src/lib/letter/` — `suggestPoints` + `writeLetter` via the existing `callStructured`; hand-rolled validators.
- `src/lib/db/cover-letters.ts` helper + barrel export.
- **Deferred Phase-3 item folded in:** `toActionError` allowlist helper; new actions use it, existing tailor/job actions retrofitted.
- `CoverLetter` panel on `/dashboard/jobs/[id]` + server actions.

**Out of scope (explicit non-goals)**
- PDF export / locale letter templates (DIN 5008 etc.) — follow-up, reuses the compile pipeline.
- Non-English letters, tone presets, per-point text editing (the user edits the final letter instead), point reordering UI (order = suggestion order).
- Tracker auto-seeding (Phase 5).

---

## Data model (migration `supabase/migrations/0005_cover_letters.sql`)

Same conventions as `node_cvs` in 0004 (owner RLS via `auth.jwt() ->> 'sub'`, cascade FKs):

- **`cover_letters`**: `id uuid pk`, `user_id text not null references users(id) on delete cascade`, `job_id uuid not null references job_descriptions(id) on delete cascade`, `track_id uuid not null references career_tracks(id) on delete cascade`, `points jsonb not null default '[]'`, `body text not null default ''`, `created_at`, `updated_at`, **`unique (job_id, track_id)`**.
- `scripts/db-verify.mjs`: table count 12 → 13. `scripts/test-rls.mjs`: add the table (parents: a job + a track, same seeding as `node_cvs`).

## Types & AI contracts (`src/lib/letter/`)

```ts
// src/lib/letter/types.ts
type LetterPoint = {
  entry_id: string; // grounds the point in a Skeleton entry
  text: string;     // the talking point, one sentence
  reason: string;   // why it matters for THIS job (shown in the UI)
};
```

- **`suggestPoints(jd: ParsedJd, snapshot: TrackSnapshot): Promise<LetterPoint[]>`** — one `callStructured` call (strict schema: array of the three required string fields, 6–8 points requested in the prompt, `maxTokens` 4096). System prompt: extraction/matching only, never invent experience; every point must be supported by the referenced entry. **Validator** (`validateLetterPoints(raw, snapshot)`): shape failure → `null` (retry); points whose `entry_id` isn't in the snapshot → dropped.
- **`writeLetter(jd: ParsedJd, points: LetterPoint[], profile: { full_name: string | null; headline: string | null }): Promise<string>`** — one `callStructured` call returning `{ body: string }` (strict schema, `maxTokens` 4096). System prompt: professional but human tone; use ONLY the given points as factual claims; ~250–350 words; English; plain text for pasting — no address block, no date line, no placeholder brackets; greet with the company name when known, else a neutral greeting. Validator: non-empty trimmed string.
- Both mocked in all tests; live behavior needs only `ANTHROPIC_API_KEY` (already set locally and in Vercel ops list).

## db helper (`src/lib/db/cover-letters.ts`)

Clones the `node-cvs.ts` shapes:
- `type CoverLetter = Database['public']['Tables']['cover_letters']['Row']`
- `upsertCoverLetter(input: { job_id; track_id; points: Json; body: string })` — `onConflict: 'job_id,track_id'`, `ensureUser()` + `auth()` on write.
- `getCoverLetter(jobId, trackId): Promise<CoverLetter | null>` (`maybeSingle`).
- `listCoverLettersByJob(jobId): Promise<CoverLetter[]>` (updated_at desc).
- Barrel export in `src/lib/db/index.ts`. `database.types.ts` gains the table (hand-authored, existing conventions).

## Error-message allowlist (deferred Phase-3 review item)

`src/lib/action-error.ts` — `toActionError(err: unknown): string`. Returns `err.message` only when it matches a known-safe set (exact strings and prefixes): `Missing ANTHROPIC_API_KEY`, `AI returned an unexpected response — please try again`, `Job description is empty`, `Job description is too long (max 20,000 characters)`, `Job not found`, `This job has no parsed data — re-add it`, `<Entity> not found` (Track/Entry/Bullet/Skill/Language), `Not authenticated`, `Missing job or track`, `Invalid locale`. Anything else → `'Something went wrong — please try again'`. Unit-tested. **Used by:** all new letter actions; retrofit `createJobAction`/`updateJobAction` and `suggestTailoringAction` (replacing their raw `err.message` passthrough).

## UX — `CoverLetter` panel on `/dashboard/jobs/[id]`

Rendered below the Tailor CV panel, same visual conventions (post design-refresh styling). Client component `CoverLetter.tsx`:

1. Track `<select>` (same `tracks` prop as TailorCv). Changing track loads that (job, track)'s saved letter if one exists (server provides `existingLetters` keyed by track).
2. **Suggest points** → point cards: point text + reason, accept/reject toggle, default all accepted. No reorder UI.
3. **Generate letter** → fills the `<textarea>` (min-height comfortable for ~350 words). If the textarea holds unsaved manual edits, `window.confirm` before overwriting.
4. **Save** → persists accepted points + current body via upsert. **Copy** → `navigator.clipboard.writeText` with a brief "Copied" state.
5. Errors from actions shown inline (already allowlisted server-side).

## Server actions (`src/app/dashboard/jobs/[id]/letter/actions.ts`)

- `suggestLetterPointsAction(jobId, trackId)` → `{ points: LetterPoint[] } | { error }`. Loads job (`getJob`, not-found → error), validates `parsed` via `validateParsedJd`, builds snapshot, calls `suggestPoints`.
- `generateLetterAction(jobId, trackId, pointsJson: string)` → `{ body } | { error }`. Parses + re-validates the client-supplied points **against a fresh snapshot** (trust boundary — same rationale as `validateOverrides`), loads profile basics from the snapshot, calls `writeLetter`.
- `saveCoverLetterAction(jobId, trackId, pointsJson, body)` → `{ ok: true } | { error }`. Sanitizes points, upserts, `revalidatePath`.
- All catch blocks return `{ error: toActionError(err) }`.

## Testing

All AI mocked; no network/DB/key needed:
- `validateLetterPoints`: good shape passes; bad shapes null; unknown `entry_id` dropped; empty array valid.
- Prompt builders: snapshot ids + JD serialized into `suggestPoints`' user prompt; ONLY accepted points in `writeLetter`'s prompt; profile basics included.
- `toActionError`: each allowlisted message passes; PostgrestError-ish and random errors collapse to generic.
- `cover-letters.ts`: mock-builder tests (upsert payload + onConflict string, getCoverLetter null path).
- Actions: happy paths + AI-failure + hostile `pointsJson` (invalid JSON, wrong shapes, foreign entry_ids).
- Retrofit check: existing action tests updated where they asserted raw messages.
- Full suite (147 + new), `tsc --noEmit`, `next build` green; `npm run test:rls` extended.

## Environment

No new variables. `ANTHROPIC_API_KEY` (Phase 3) gates live AI; absent → clean allowlisted error. Fly compile service irrelevant to this phase (text output).
