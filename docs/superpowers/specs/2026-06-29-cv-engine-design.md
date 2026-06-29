# Lackey AI — CV Engine (Phase 2) Design

**Status:** approved design, pre-plan (2026-06-29)
**Depends on:** Phase 1 (the Skeleton) — done & live. Reads `personal_profile`, `entries`, `bullets`, `skills`, `languages`, and the `career_tracks` / `track_entries` / `track_skills` curation.
**Spec for:** a spec → plan → (parallel) build cycle. See [CLAUDE.md](../../../CLAUDE.md) for vision/stack and the architecture gotchas this design honors.

---

## Goal

Turn a **Career Track** into an **ATS-safe PDF CV**, formatted for one of two locales — **UK** or **Germany (Lebenslauf)**. No AI and no job-description tailoring in this phase (that is Phase 3's "Node CV"). The deliverable is the rendering pipeline + two locale templates + a compile service.

**The wedge:** locale-correct ATS CVs. "ATS-safe" is a hard constraint, not a label — single column, standard fonts, a real text layer, nothing in headers or graphics. The template discipline *is* the product.

## Scope

**In scope**
- Two locales: **UK** and **DE**. The most divergent pair, so the locale-variation mechanism is genuinely exercised.
- Input is a **Career Track** (the Phase-1 curation): one clean code path, makes Tracks immediately useful, and is the bridge to Phase 3.
- Generate → compile (Tectonic on Fly.io) → **persist** the PDF (Supabase Storage + a `cv_documents` row) → download.

**Out of scope (explicit non-goals; fast follow-ups)**
- AI / JD tailoring (Phase 3, "Node CV").
- NL and Europass templates (added after the pipeline is proven — they are "just more locale modules").
- **DE photo** — the Lebenslauf photo is deferred; MVP is a text-only Lebenslauf (keeps the compile contract a simple `{tex} → pdf` and stays ATS-text-safe). Immediate follow-up.
- **Heading translation** — section headings are English for both locales at MVP (Skeleton content is English-canonical; a half-German CV reads worse than clean English). The DE *format and which-fields* differ; the language does not. Future option.
- Cover letters (Phase 4), Upstash compile queue (add only if concurrency/latency demands it).

---

## Architecture

**Two parts, deliberately split:**

1. **The Next.js app builds the LaTeX.** The Skeleton/Track data → `.tex` source happens in TypeScript, in the app. This is where the locale rules and ATS discipline live. It is **fully unit-testable with no TeX runtime** (assert on the emitted `.tex` string).
2. **A separate Fly.io service compiles it.** A stateless, scale-to-zero Docker container running **Tectonic** exposes `POST /compile` — body is `.tex`, response is `application/pdf`. It is a dumb commodity compiler: it knows nothing about CVs, locales, or the Skeleton.

**Why the split:** LaTeX does **not** run on Vercel serverless (no TeX runtime), so a separate compile host is mandatory. Keeping *only* compilation on Fly — and all template logic in the app — means (a) the hard-to-test thing (LaTeX) is a thin, stable boundary, (b) templates/locales are pure functions we can snapshot-test and build in parallel, and (c) the service is reusable for future artifacts (cover letters) unchanged.

### Data flow

```
Track page → "Generate CV" (locale select) → server action
  → getCvData(trackId)            // resolve Track + profile + languages  (src/lib/cv/data.ts)
  → render = locales[locale]      // pick UK or DE renderer
  → tex = render(cvData)          // ATS-safe LaTeX string                (src/lib/cv/locales/*)
  → pdf = compilePdf(tex)         // POST .tex → Fly Tectonic → PDF bytes (src/lib/cv/compile.ts)
  → storagePath = upload(pdf)     // Supabase Storage `cvs` bucket, owner-scoped
  → upsertCvDocument({track,locale,storagePath})                          (src/lib/db/cv-documents.ts)
  → return signed download URL → browser downloads
```

Re-generating the same (track, locale) overwrites the stored PDF and updates the row (set-replace, same pattern as Phase-1 curation).

---

## Components

Each is a focused unit with a clear interface and dependencies.

### `src/lib/cv/latex.ts` — escaping + ATS building blocks (pure)
- `escapeLatex(s: string): string` — escape `& % $ # _ { } ~ ^ \` and friends. **The single most important safety/correctness unit** — every piece of user text passes through it. Unit-tested hard (each special char + combinations).
- Small helpers: `section(title, body)`, `itemize(items)`, `contactLine(parts)` — emit ATS-safe constructs (`\section*`, `itemize`, plain text). No graphics, no multicol.
- Depends on: nothing.

### `src/lib/cv/locales/uk.ts`, `src/lib/cv/locales/de.ts` — the locale rules (the wedge)
- Each exports `render(data: CvData): string` returning a full compilable `.tex` document.
- Encodes: which `personal_profile` fields appear, section order, date formatting, the document preamble.
- Shared preamble via a small `src/lib/cv/locales/preamble.ts` (article class, single column, standard font, minimal packages) so both locales stay ATS-consistent.
- Depends on: `latex.ts`, the `CvData` type.

### `src/lib/cv/data.ts` — the resolver
- `getCvData(trackId: string): Promise<CvData>` — loads the Track, its curated entries (ordered) with their bullets, its curated skills (ordered), the user's `personal_profile`, and the user's `languages`. Reuses Phase-1 helpers (`listEntries`, `listBullets`, `listSkills`, `getProfile`, `listLanguages`, `getTrackEntryIds`, `getTrackSkillIds`, and a `getTrack(id)` read — add to `tracks.ts` if not present).
- `type CvData` — a flat, render-ready shape (see Data shapes below). Defined here; renderers import it.
- Depends on: Phase-1 db helpers. Auth/RLS already enforced by those helpers (no `user_id` handling here).

### `src/lib/cv/compile.ts` — the compile client
- `compilePdf(tex: string): Promise<Buffer>` — `POST ${COMPILE_SERVICE_URL}/compile` with header `Authorization: Bearer ${COMPILE_SERVICE_SECRET}`, body the `.tex`. Returns PDF bytes. Throws with a clear message on non-200 / timeout. Enforces a client-side request timeout and a max `.tex` size before sending.
- Depends on: env `COMPILE_SERVICE_URL`, `COMPILE_SERVICE_SECRET`.

### `src/lib/db/cv-documents.ts` — persistence
- `upsertCvDocument(input)` / `getCvDocument(trackId, locale)` / `listCvDocuments()` over the new `cv_documents` table. Same auth pattern as every Phase-1 helper (`ensureUser()` + inject `user_id` on insert; RLS for the rest).
- Depends on: `createServerSupabaseClient`, `ensureUser`, `auth()`.

### `src/app/dashboard/tracks/[id]/...` — UI + server action
- A "Generate CV" control on the Track detail page: a locale `<select>` (default from `career_tracks.default_locale` if set, else UK) + a Generate button → server action that runs the data-flow above and returns the PDF / a download link. List previously generated CVs for the Track (from `cv_documents`) with re-download.

### `compile-service/` — the Fly.io Tectonic service (separate deploy)
- `Dockerfile` — base image with the **Tectonic** binary + the template's fonts/packages **baked in** (a warm-up compile at build time caches the bundle, so cold compiles are fast). Runs as non-root.
- A minimal HTTP handler (`POST /compile`): check the bearer secret → enforce max body size → write `.tex` to a temp dir → run `tectonic` with a **timeout** (kill on overrun) and **no shell-escape** → return the PDF bytes (or a 4xx/5xx with a short reason). `GET /health` for Fly checks.
- `fly.toml` — scale-to-zero, small machine, the secret as a Fly secret.
- Smoke test: `POST /compile` a tiny known doc → response is `%PDF` magic bytes.

---

## Data shapes

```ts
type CvData = {
  locale: 'uk' | 'de';
  profile: {
    full_name: string | null; headline: string | null;
    email: string | null; phone: string | null; location: string | null;
    links: { label: string; url: string }[];
    // DE-only fields (renderers decide whether to emit):
    date_of_birth: string | null; nationality: string | null;
    marital_status: string | null;
  };
  track: { name: string; target_title: string | null; summary: string | null };
  entries: {
    kind: EntryKind; title: string; organization: string | null;
    location: string | null; start_date: string | null; end_date: string | null;
    is_current: boolean; summary: string | null;
    details: Record<string, string>;
    bullets: string[]; // ordered bullet text
  }[]; // ordered by the Track's track_entries.sort_order
  skills: { name: string; category: string | null }[]; // ordered by track_skills.sort_order
  languages: { name: string; cefr_level: string }[];   // all of the user's languages
};
```

## Data model (one migration)

```sql
create table cv_documents (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id) on delete cascade,
  track_id uuid not null references career_tracks(id) on delete cascade,
  locale text not null,                  -- 'uk' | 'de'
  storage_path text not null,            -- path WITHIN the `cvs` bucket: <user_id>/<track_id>-<locale>.pdf (owner-prefixed for RLS)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (track_id, locale)
);
```
- **RLS** (same predicate as all Phase-1 tables): `(auth.jwt() ->> 'sub') = user_id`, owner-only for select/insert/update/delete.
- **Storage:** a **private** `cvs` bucket with the owner-prefixed-path policy (path begins `<user_id>/…`), mirroring the `profile-photos` bucket from Phase 0.
- Migration via the Node `pg` runner (`npm run db:migrate`) — the Supabase MCP is on a different account; that is the established mechanism.

## Locale rules (MVP)

| Aspect | **UK** | **DE (Lebenslauf)** |
|---|---|---|
| Personal data block | name, headline, contact, links only | + date of birth, nationality (+ marital status if present) |
| Photo | none | **none at MVP** (text-only; photo deferred) |
| Section order | Summary → Skills → Experience → Education → Projects/Certs/etc. → Languages | Personal data → Summary → Experience → Education → Skills → Languages |
| Dates | `Mon YYYY` (e.g. "Jan 2023 – Present") | `MM/YYYY` (e.g. "01/2023 – Present") — English "Present" at MVP (headings/labels English) |
| Headings | English | English (format differs, language does not — MVP) |
| Layout | single column, standard font, real text, no graphics | same ATS discipline |

Both render the same Track content; the locale module decides field inclusion, ordering, and date format.

## Security (we are compiling LaTeX)

- The service runs **Tectonic with no shell-escape** — `\write18`/shell execution is off by default. We never accept raw user LaTeX; only our own generated `.tex`.
- `POST /compile` requires a **shared-secret** bearer header; reject otherwise.
- Enforce a **max request body size** and a **compile timeout** (kill the process on overrun) to bound resource use.
- Run the container as a **non-root** user; small Fly machine bounds memory/CPU.
- `escapeLatex` neutralizes special characters in all user text so a name like `R&D % {x}` can't break or inject into the document.

## Testing

- `latex.ts` — exhaustive unit tests on `escapeLatex` (every special char + sequences) and the building blocks.
- `locales/{uk,de}.ts` — **golden-file** tests: a representative `CvData` fixture → assert key invariants in the emitted `.tex` (UK omits DOB/nationality; DE includes them; section order; dates formatted; user text escaped). No TeX runtime needed.
- `data.ts` — `getCvData` tested with mocked Phase-1 helpers (resolves/order correct; languages = all user's).
- `cv-documents.ts` — happy-path + error-path tests (the Phase-1 mock pattern: client non-thenable, chain thenable; delete/update error paths covered).
- `compile-service` — smoke test: tiny doc → `%PDF` bytes; auth rejection test.
- End-to-end (manual): generate a UK and a DE CV from a Track, confirm the PDFs open, are single-column, text-selectable (ATS), and locale-correct.

## Environment / config (new)

- App: `COMPILE_SERVICE_URL`, `COMPILE_SERVICE_SECRET` (Vercel runtime + `.env.local`).
- Service (Fly): `COMPILE_SERVICE_SECRET` (Fly secret).
- Supabase: the `cvs` bucket (created by the migration/SQL).

## Parallelizable build (for the plan)

These units are largely independent and suit concurrent, worktree-isolated agents:
- **A.** `compile-service/` (Dockerfile + handler + fly.toml + smoke test) — no app deps.
- **B.** `latex.ts` + `locales/preamble.ts` + `locales/uk.ts` + `locales/de.ts` (+ golden tests) — pure, depends only on the `CvData` type.
- **C.** `cv_documents` migration + `cv-documents.ts` db helper — depends only on Phase-1 patterns.
- **D.** `data.ts` resolver — depends on Phase-1 helpers + the `CvData` type.

Then integrate sequentially: `compile.ts` client → the server action + Track-page UI → wire env → end-to-end. The `CvData` type is the shared contract; define it first (or in the plan's Task 1) so B and D can proceed in parallel against it.

## Resolved decisions

- Locales: **UK + DE**. Input: **Career Track**. PDFs **persisted** (Storage + `cv_documents`). DE photo **deferred**. Headings **English**. Template logic **in the app**, compilation **on Fly**.
