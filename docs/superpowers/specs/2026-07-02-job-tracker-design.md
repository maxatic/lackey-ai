# Lackey AI — Job Tracker (Phase 5) Design

**Status:** approved design, pre-plan (2026-07-02)
**Depends on:** Phase 3 (Jobs), Phase 4 (cover letters) — both merged. First post-MVP phase.
**Spec for:** a spec → plan → build cycle. See [CLAUDE.md](../../../CLAUDE.md) for vision/stack.

---

## Goal

Turn the Jobs section into the **application pipeline tracker**: every job carries a status (`saved → prepared → applied → interviewing → offer → rejected`), an applied-on date, and notes; `/dashboard/jobs` becomes a spreadsheet-like table with inline status editing and a status filter; generating a CV or saving a cover letter **auto-advances** a saved job to `prepared` (the roadmap's "auto-seeds an entry when a CV/CL is generated").

**Decisions (made during brainstorming):**
- **Jobs = the tracker.** No separate `applications` entity — a job is the application target; status lives on `job_descriptions`. No sync logic, no duplicate navigation.
- **Table view at MVP** (per CLAUDE.md "spreadsheet-like"). Kanban is out of scope.
- **Six statuses**, stored (not derived), `check`-constrained text — adding a status later is a one-line migration, unlike a PG enum.
- **Auto-advance is forward-only and best-effort**: `saved → prepared` only; never downgrades; a failed bump never fails the generation/save that triggered it.

## Scope

**In scope**
- Migration `0006`: `status` + `applied_at` + `notes` on `job_descriptions` (existing owner RLS covers new columns; table count stays 13 — `db-verify`/`test:rls` unchanged).
- `src/lib/db/job-status.ts` (client-safe constants + labels), helper additions in `jobs.ts`, job-id listers in `cv-documents.ts`/`cover-letters.ts`.
- Write-throughs in `generateNodeCvAction` and `saveCoverLetterAction`.
- Pipeline table on `/dashboard/jobs` + status filter; Notes card on `/dashboard/jobs/[id]`.
- `updateJobStatusAction` / `updateJobNotesAction` with allowlisted errors.

**Out of scope (explicit non-goals)**
- Kanban board, drag-and-drop, status history / audit trail (`status_events` can be added later without reshaping `0006`), reminders/follow-ups, bulk actions, analytics, deriving `prepared` from artifact existence.

---

## Data model (migration `supabase/migrations/0006_job_pipeline.sql`)

```sql
alter table job_descriptions
  add column status text not null default 'saved'
    constraint job_descriptions_status_check
    check (status in ('saved','prepared','applied','interviewing','offer','rejected')),
  add column applied_at timestamptz,
  add column notes text not null default '';
```

No new table, no new RLS. `database.types.ts`: `job_descriptions` Row/Insert/Update gain `status: string`, `applied_at: string | null`, `notes: string` (Insert/Update optional — all have defaults or are nullable).

## Shared constants (`src/lib/db/job-status.ts`)

Client-safe (no server imports), same pattern as `entry-kinds.ts`:

```ts
export const JOB_STATUSES = ['saved','prepared','applied','interviewing','offer','rejected'] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];
export const JOB_STATUS_LABELS: Record<JobStatus, string>; // 'Saved', 'Prepared', 'Applied', 'Interviewing', 'Offer', 'Rejected'
```

## db helpers

- **`updateJobStatus(id, status: JobStatus): Promise<Job>`** (in `jobs.ts`) — single update owning the `applied_at` rule: entering `applied` stamps `applied_at = now()` only if currently null; moving to `saved` or `prepared` clears it; `interviewing`/`offer`/`rejected` leave it untouched. Implementation reads the current row first (`getJob`) to decide the patch; `maybeSingle` + `'Job not found'` like the other update helpers.
- **`updateJob`** — patch type extended to `Partial<{ title; company; notes }>`.
- **`advanceJobToPrepared(id): Promise<void>`** (in `jobs.ts`) — `update ... set status='prepared', updated_at=now() where id = ? and status = 'saved'` via `.eq('id', id).eq('status', 'saved')`, no `.single()`: zero rows matched is a silent no-op (job deleted, or already past `saved`). Throws only on a real db error.
- **`listCvDocumentJobIds(): Promise<string[]>`** (in `cv-documents.ts`) — `select job_id where job_id is not null`, RLS-scoped, deduped in JS.
- **`listCoverLetterJobIds(): Promise<string[]>`** (in `cover-letters.ts`) — `select job_id`, deduped.

## Auto-advance write-throughs

In `generateNodeCvAction` (after `upsertCvDocument`, before returning the signed URL) and `saveCoverLetterAction` (after `upsertCoverLetter`, before returning `{ ok: true }`):

```ts
try { await advanceJobToPrepared(jobId); } catch { /* best-effort — status bump must never fail a succeeded generation */ }
```

## UX

**`/dashboard/jobs` — the pipeline table** (replaces the card list; `AddJobForm` and empty-state stay):
- Server page fetches `listJobs()`, `listCvDocumentJobIds()`, `listCoverLetterJobIds()` in parallel; passes rows + flags to a client `JobsTable` component.
- Columns: **Job** (title + company, links to detail) · **Status** (inline `<select>` per row → `updateJobStatusAction`; optimistic UI with error rollback) · **Applied** (date or —) · **CV** / **Letter** (dot/check when the job has one) · **Notes** (truncated ~60 chars, read-only) · **Added** (created date).
- Status filter chips above the table (All + one per status, client-side filtering; counts per status shown on the chips).
- Styling: existing design tokens (`app-card`, `chip`, `field`, table typography consistent with the dashboard refresh).

**`/dashboard/jobs/[id]` — Notes card + status control:** a card below the parsed-JD section with the same status `<select>` and a notes `<textarea>` (5,000-char cap, Save button → `updateJobNotesAction`). Status changes here and in the table hit the same action.

## Server actions (`src/app/dashboard/jobs/actions.ts`)

- `updateJobStatusAction(id: string, status: string): Promise<{ error?: string }>` — validates `status` against `JOB_STATUSES` (invalid → `'Invalid status'`, added to the `toActionError` allowlist), calls `updateJobStatus`, `revalidatePath` for list + detail.
- `updateJobNotesAction(id: string, notes: string): Promise<{ error?: string }>` — rejects `notes.length > 5000` with `'Notes are too long (max 5,000 characters)'` (allowlisted), calls `updateJob(id, { notes })`, revalidates detail.
- Both catch → `{ error: toActionError(err) }`.

## Testing

All mocked (no DB/network):
- `updateJobStatus` matrix: → applied stamps `applied_at` once (not re-stamped if set); → saved/prepared clears it; → interviewing/offer/rejected preserves it; unknown id → `'Job not found'`.
- `advanceJobToPrepared`: updates when `saved`; silent no-op when already `prepared`/`applied`/missing; throws on db error.
- Write-throughs: existing `generateNodeCvAction`/`saveCoverLetterAction` tests gain assertions that `advanceJobToPrepared(jobId)` is called on success AND that a bump rejection does not change the action's result.
- Actions: valid/invalid status, notes cap, allowlist round-trip for the two new messages.
- Job-id listers: dedup + null-filter.
- Suite (baseline 164) + `tsc` + `next build` green. `db:migrate`/`db:verify` pass (13 tables unchanged).

## Environment

No new variables. No AI calls in this phase — works fully without `ANTHROPIC_API_KEY` or the Fly service.
