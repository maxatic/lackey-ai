# Lackey AI — Node CV (Phase 3) Design

**Status:** approved design, pre-plan (2026-07-01)
**Depends on:** Phase 1 (the Skeleton) and Phase 2 (CV Engine) — both done & live. Reads the Track curation and reuses the entire Phase-2 render pipeline (`CvData` → locale renderer → Fly compile → `cvs` bucket → signed URL) unchanged.
**Spec for:** a spec → plan → build cycle. See [CLAUDE.md](../../../CLAUDE.md) for vision/stack.

---

## Goal

Turn a **pasted job description** into a **tailored ("Node") CV** for a chosen Career Track: AI suggests a diff against the track's master CV, the user accepts/rejects each suggestion, and the accepted result renders through the existing UK/DE ATS pipeline.

Two product pieces ship together:

1. **JD ingestion — the shared module.** Paste JD text → AI-parsed structured JD, persisted as a first-class **Job**. Phases 4 (cover letter) and 5 (tracker) consume the same rows.
2. **The Node CV.** Parsed JD + Track snapshot → AI suggestion set → per-suggestion accept/reject → persisted overrides → tailored PDF.

**AI scope (decided):** the AI may **reorder/emphasize** entries & skills and **reword** bullets/summary/headline to echo the JD's language — always rephrasing facts already in the Skeleton, never inventing claims. Grounding is **structural**: every rewrite references the id of the source it rephrases; the suggestion schema has no slot for new content.

## Scope

**In scope**
- `job_descriptions` + `node_cvs` tables (+ `cv_documents.job_id`), RLS, migration `0004`.
- JD ingestion: **paste text only**, AI parse → `ParsedJd`, editable title/company.
- AI suggestion call → accept/reject review UI → overrides persisted → render via the existing pipeline (locale select, UK/DE).
- New **Jobs** dashboard section: `/dashboard/jobs`, `/dashboard/jobs/[id]`.
- Anthropic SDK integration (`@anthropic-ai/sdk`, new dependency) with structured (tool-use) output; fully mocked in tests.
- Deferred Phase-1 hardening explicitly parked for this phase: db `update*()`/single-row reads move from `.single()` to `.maybeSingle()` + explicit not-found handling.

**Out of scope (explicit non-goals)**
- **URL fetch for JDs** (paste only; a fetch step can later feed the same parse).
- **AI editing LaTeX directly** (rejected: unreviewable, breaks ATS discipline, injection surface). Revisit only as a conscious future decision.
- Persisting *unaccepted* suggestions (regenerate on demand; only accepted overrides are stored).
- Cover letters (Phase 4), tracker auto-seeding (Phase 5), new locales, editing Skeleton content from the review UI.

---

## Architecture

```
/dashboard/jobs → "Add job" (paste)
  → parseJd(rawText)                    // AI call #1 → ParsedJd            (src/lib/jd/parse.ts)
  → insert job_descriptions row         //                                   (src/lib/db/jobs.ts)

/dashboard/jobs/[id] → "Tailor CV" (pick track)
  → snapshot = buildTrackSnapshot(trackId)  // id-carrying data              (src/lib/cv/data.ts)
  → suggestions = suggestCvDiff(parsedJd, snapshot)   // AI call #2          (src/lib/cv/suggest.ts)
  → user accepts/rejects per suggestion (client state; nothing persisted yet)
  → "Save & Generate": upsert node_cvs.overrides (accepted set)             (src/lib/db/node-cvs.ts)
  → data = toCvData(applyOverrides(snapshot, overrides), locale)            (src/lib/cv/overrides.ts)
  → tex = render(data)                  // EXISTING locale renderer, untouched
  → pdf = compilePdf(tex)               // EXISTING compile client, untouched
  → upload + upsert cv_documents (with job_id) → signed URL → download
```

**The load-bearing decision — ids vs `CvData`.** Suggestions must reference stable ids, but `CvData` is deliberately plain text for the renderers. `getCvData` is therefore split internally:

- `buildTrackSnapshot(trackId): Promise<TrackSnapshot>` — the current resolver logic, but keeping ids: entries as `{id, …fields, bullets: {id, text}[]}`, skills as `{id, name, category}`, plus profile/track/languages as today.
- `toCvData(snapshot, locale): CvData` — strips ids into today's exact `CvData` shape.
- `getCvData(trackId, locale)` becomes `toCvData(await buildTrackSnapshot(trackId), locale)` — **behavior identical; renderers, `compilePdf`, and the Fly service are untouched.** The existing renderer/data tests are the regression guard.

## Data model (migration `supabase/migrations/0004_node_cv.sql`)

Follows the 0003 conventions (text `user_id` → `users(id)` cascade, owner RLS, `updated_at` trigger if present in prior migrations).

- **`job_descriptions`**: `id uuid pk`, `user_id text not null references users(id) on delete cascade`, `title text not null`, `company text`, `raw_text text not null`, `parsed jsonb not null default '{}'`, `created_at`, `updated_at`. Owner RLS (all four ops).
- **`node_cvs`**: `id uuid pk`, `user_id` (as above), `job_id uuid not null references job_descriptions(id) on delete cascade`, `track_id uuid not null references career_tracks(id) on delete cascade`, `overrides jsonb not null default '{}'`, `created_at`, `updated_at`, **`unique (job_id, track_id)`** (set-replace upsert, same pattern as curation). Owner RLS.
- **`cv_documents`**: add `job_id uuid null references job_descriptions(id) on delete cascade`. Keep the existing `unique (track_id, locale)`? **No** — it would block a node CV row for the same (track, locale). Replace with two partial unique indexes: `(track_id, locale) where job_id is null` (master CVs, semantics unchanged) and `(track_id, locale, job_id) where job_id is not null` (node CVs). Existing rows all have `job_id null` → migration is safe on live data.
- **Storage path**: master unchanged (`<sub>/<trackId>-<locale>.pdf`); node CVs `<sub>/<trackId>-<locale>-<jobId>.pdf`. Same private `cvs` bucket and owner policies (prefix rule already covers it).

## Types & contracts

```ts
// src/lib/jd/types.ts
type ParsedJd = {
  title: string;              // best-effort; user-editable after save
  company: string | null;
  location: string | null;
  language: string | null;    // e.g. 'en', 'de' — informational at MVP
  requirements: string[];     // distilled requirement lines
  keywords: string[];         // ATS-relevant terms
};

// src/lib/cv/suggest.ts
type CvSuggestions = {
  entry_order: string[];       // entry ids, tailored order — ids not in the snapshot are ignored
  entry_exclude: string[];     // entry ids to drop for this job
  skill_order: string[];
  skill_exclude: string[];
  bullet_rewrites: { bullet_id: string; suggested_text: string; reason: string }[];
  summary_rewrite: { suggested_text: string; reason: string } | null;
  headline_rewrite: { suggested_text: string; reason: string } | null;
};

// node_cvs.overrides — the ACCEPTED subset, same shape as CvSuggestions
// (`reason` fields included as-is; harmless to store and useful for future UI);
// a missing key = no override of that aspect.
```

`applyOverrides(snapshot, overrides)` is a **pure function**: filters/orders entries & skills by id, substitutes bullet/summary/headline text by id, and **silently ignores stale ids** (Skeleton edited after suggestions → those suggestions no-op). Unknown/extra keys in `overrides` are ignored.

## AI layer

- **`src/lib/ai/client.ts`** — thin wrapper around `@anthropic-ai/sdk`: lazily constructed client; throws `Missing ANTHROPIC_API_KEY` (same clean pattern as `Missing COMPILE_SERVICE_URL`); exports `callStructured<T>(params)` that issues a single-tool tool-choice-forced message and returns the tool input. One retry on transient failure (5xx/timeout/overloaded), then throw. Default model in one constant — `claude-sonnet-5` (verify current model ids against the Claude API docs at implementation time).
- **`src/lib/jd/parse.ts`** — `parseJd(rawText)`: caps input at 20k chars (clear error beyond), prompts for extraction only, returns schema-validated `ParsedJd`.
- **`src/lib/cv/suggest.ts`** — `suggestCvDiff(parsedJd, snapshot)`: serializes the snapshot with ids + the parsed JD; system prompt forbids inventing facts and requires `reason` per suggestion; returns schema-validated `CvSuggestions`.
- **Validation at the trust boundary**: AI output passes hand-rolled type guards (codebase has no zod; follow the existing `links` guard pattern in `data.ts`). Invalid shape → treated as a failed call (retry once, then user-facing error). Bullet rewrites that reference unknown ids are dropped at validation time.

## UX

- **Nav**: add **Jobs** to the dashboard nav (`src/app/dashboard/*` conventions from Phase 1).
- **`/dashboard/jobs`** — list (title, company, created date) + "Add job": a paste `<textarea>` → server action `createJob(rawText)` (parse + insert) → redirect to the job page. Parse failure keeps the user on the form with the error and their text intact.
- **`/dashboard/jobs/[id]`** —
  - Parsed JD card: title/company inline-editable (parse can err); requirements/keywords read-only chips. Delete job (cascades node CVs/documents).
  - **Tailor CV** panel: track `<select>` (reuses `listTracks`) → "Suggest tailoring" server action → suggestion cards grouped by type (ordering, exclusions, bullet rewrites with before/after + reason, summary/headline). Accept/reject toggle per card, **default accepted**. Client-side state only.
  - **Save & Generate**: locale `<select>` (UK/DE, same component behavior as the track page) → one server action: upsert `node_cvs`, resolve+override+render+compile+store, return signed URL → browser download. Re-download list of existing node-CV documents for this job (same pattern as the track page).
- A job with no tracks yet → the panel links to `/dashboard/tracks/new`.

## Error handling

- AI: one retry on transient/shape failure → then a clear message ("Couldn't parse this job description — try trimming it"); never a 500 with internals. Missing `ANTHROPIC_API_KEY` → explicit config error (mirrors compile-service envs).
- JD paste: reject empty / >20k chars with inline validation before any AI call.
- Compile/storage failures: existing Phase-2 behavior (clean thrown message) — unchanged.
- **`.maybeSingle()` hardening**: `getTrack`-style single-row reads and `update*()` helpers return not-found instead of an opaque `PostgrestError` 500 when an id is stale/cross-tenant (RLS returns 0 rows). Applied across `src/lib/db/*` this phase, as deferred from the Phase-1 review.

## Testing

All AI calls mocked (no `ANTHROPIC_API_KEY` or Fly service needed to build/test the whole phase):

- `applyOverrides`: selection, reordering, rewrite substitution, stale/unknown ids, empty overrides = identity.
- Snapshot refactor: `getCvData` output is **byte-identical** to pre-refactor for the master path (regression test against existing fixtures); existing renderer/data tests stay green untouched.
- `parseJd` / `suggestCvDiff`: prompt-builder unit tests (snapshot serialization includes ids; caps enforced) + validator tests (good shape passes; bad/hostile shapes rejected; unknown bullet ids dropped).
- db helpers (`jobs.ts`, `node-cvs.ts`): unit tests per Phase-1 pattern; `.maybeSingle()` not-found paths.
- Server actions: happy path + AI-failure path with mocked layers.
- RLS: extend `test:rls` to the two new tables.

## Environment

- **New**: `ANTHROPIC_API_KEY` (Vercel runtime + `.env.local`). Absent → Jobs pages render, AI actions fail with the clean config error.
- Unchanged: `COMPILE_SERVICE_URL` / `COMPILE_SERVICE_SECRET` still gate only the final PDF step (node CV generation shares the master CV's dependency and error behavior).
