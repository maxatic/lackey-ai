# Lackey AI — Handoff

**As of:** 2026-06-29 (Phase 1 + landing complete)
**Repo:** https://github.com/maxatic/lackey-ai (private) · branch `main` @ `afa09b6` — **local, NOT yet pushed** (origin still at `b79b0cc`; pushing auto-deploys to Vercel prod)
**Live:** https://lackey-ai-main.vercel.app (Vercel, auto-deploys on push to `main`)

Lackey AI — an AI companion for the EU job-seeking journey (structured profile → locale-correct tailored CVs & cover letters, job tracking, interview prep). See [CLAUDE.md](../CLAUDE.md) for vision, stack, and the full phased roadmap.

---

## ✅ Done — Phase 0 (Foundation), shipped & deployed

Built via subagent-driven development (one implementer + reviewer + fix loop per task), final whole-branch review passed, merged to `main`, pushed, deployed.

| Task | What | Verified |
|------|------|----------|
| 1 | Next.js 15 (App Router) + TS + Tailwind v4 + Vitest scaffold | build + smoke test |
| 2 | Clerk v6 auth (provider, `clerkMiddleware`, sign-in/up routes, protected `/dashboard`) | live home + `/sign-in` = 200 |
| 3 | Supabase clients via Clerk **third-party auth** (`accessToken`) | **verified end-to-end** — minted Clerk JWT → Supabase REST = 200 |
| 4 | 9-table schema + Node `pg` migration runner | applied + independently verified in DB |
| 5 | RLS on all tables + `profile-photos` storage bucket | **isolation proven** — cross-user read=0, writes rejected (all 8 data tables + storage) |
| 6 | `ensureUser` upsert-on-login (authenticated client, idempotent) | unit tested (see open issue #1) |
| 7 | Sentry (client/server/edge) + PostHog (client/server) | live (Sentry release tag visible; build resilient w/o auth token) |
| 8 | Vercel deploy | live; auto-deploy wired |

**Tests:** `npm test` → 8/8 (5 files). Plus `npm run test:rls` (RLS integration) and `npm run db:verify` (schema/RLS smoke check).

---

## ✅ Done — Phase 1 (Skeleton) + Landing page (this session)

Built via subagent-driven development (ruflo `coder`/`reviewer`, fresh agent per task, per-task spec+quality review + fix loop, two parallel opus final reviews). All committed locally on `main` (`31e013a`..`afa09b6`); **not yet pushed**. `npx vitest run` = 66/66 (14 files); `npx tsc --noEmit` = 0; `npx next build` = 14 routes, clean.

- **Tasks 1–7:** db barrel + dashboard nav; personal-profile CRUD (+ photo upload, locale-field flag hints); unified entries CRUD (per-kind, `details` jsonb) + entry detail; bullets CRUD (tags chip-input + reorder); skills + languages CRUD; career-tracks CRUD; track curation (`track_entries`/`track_skills` set-replace). All db helpers under `src/lib/db/*`, routes under `src/app/dashboard/*`. Full DB types regenerated for all 9 tables.
- **Notable fixes during the build:** `reorderBullets` no longer reassigns `entry_id` (same-user cross-entry data-corruption vector closed); RSC client/server boundary fixed by extracting client-safe UI metadata into `entry-kinds.ts`/`cefr.ts`; track route slug unified to `[id]`; db helpers standardized to throw the raw `PostgrestError` (preserves `.code` for Sentry).
- **Landing page** folded in (was a parallel agent's work, now owned): `(marketing)` route group as home `/` — hero/features/cv-formats/how-it-works/skeleton/companion/pricing/FAQ/footer/nav + GSAP/lenis fx. Reviewed (SSR-safe, reduced-motion, a11y) and fixed (picsum→local placeholder, double-`h1`, offscreen ticker gated, `invalidateOnRefresh`, scoped header-hide via `[data-app-header]`).
- **SDD ledger** (full per-task trail + adjudications): `.superpowers/sdd/progress.md`.

## 🔴 Known problems

1. ~~**`/dashboard` throws "Something went wrong" for signed-in users.**~~ **RESOLVED (`b79b0cc`).** The PostHog server key now falls back to `NEXT_PUBLIC_POSTHOG_KEY` (`c3c9d9b`), and both the page's PostHog `capture()`/`flush()` and `ensureUser()`'s upsert are wrapped in report-to-Sentry try/catch, so telemetry/upsert failures never blank the dashboard. Pushed to origin. (Browser re-test on a real signed-in session still worthwhile, but the route is now resilient by construction.)

2. **`/dashboard` 404s via `curl` (not a code bug).**
   Clerk **development** keys (`pk_test_`) on a `vercel.app` domain require a "dev-browser" handshake that only a real browser can do; `curl` gets a 404 rewrite (`x-clerk-auth-reason: dev-browser-missing`). Reliable fix is a Clerk **production instance** (`pk_live`) on a **custom domain** — deferred until a domain exists.

3. **Commit email vs GitHub (resolved).**
   Vercel blocked deploys because commits used `go56vum@mytum.de` (not on GitHub). Repo git email is now set to the GitHub noreply `68378768+maxatic@users.noreply.github.com`. Historical commits still carry the uni email (harmless). To use a real email on commits, add+verify it on GitHub then update `git config user.email`.

4. **Supabase MCP is on a different account.**
   The connected Supabase MCP cannot manage project `zluumpwqykxiyvknmfhk` (lackey-ai). DB work therefore uses the Node `pg` runner over `DATABASE_URL` (`npm run db:migrate` / `db:verify` / `test:rls`), not the CLI or MCP.

5. **`src/lib/db/database.types.ts` is a hand-authored stub** (only `users` typed). The other 8 tables are untyped until regenerated — **Phase 1, first task.**

---

## ⏳ Awaiting / next steps

- [ ] **Push `main` to origin** (`b79b0cc`..`afa09b6`) — auto-deploys Phase 1 + landing to Vercel prod. Awaiting go-ahead; build is green locally.
- [ ] **Phase 2 — CV Engine** (Tectonic-on-Fly.io LaTeX compile service + locale-aware ATS templates → Master CV PDF). Phase 1 (the Skeleton it reads from) is done. No spec/plan yet — next is a spec → plan → build cycle.
- [ ] **Deferred from Phase 1 review** (non-blocking): switch db `update*().single()` → `.maybeSingle()` + null-handling so a stale/cross-tenant id returns not-found instead of an opaque 500 (do in Phase 3 when ids arrive from JD ingestion); swap the landing `companion` placeholder gradient for real brand art; route the bespoke SplitText reveals through the shared `SplitReveal` primitive.
- [ ] **Custom domain + Clerk production instance** (`pk_live`/`sk_live`) — fixes protected routes reliably (`curl`/`pk_test` dev-browser issue, #2 below).
- [ ] **Before serious production:** add CI secret-scan (gitleaks/trufflehog) + a CI `npm run build`. (`.gitignore` uses a broad `.env*` with `!.env.example`.)
- [ ] **Optional dev tooling still pending API keys** (from setup): local MCP servers — Pinecone (`@pinecone-database/mcp`), Resend (`resend-mcp`), Upstash (`@upstash/mcp-server`); and the GitHub MCP needs a PAT (note: `gh` CLI is NOT installed — GitHub ops currently use the cached git credential).

---

## How to run

```bash
npm run dev            # local dev server
npm test               # unit tests (8/8)
npm run build          # production build
npm run db:migrate     # apply pending SQL migrations (pg runner, reads DATABASE_URL)
npm run db:verify      # assert schema + RLS + storage present
npm run test:rls       # RLS cross-user isolation integration test
```
All read secrets from `.env.local` (gitignored). Template + per-service setup: [docs/SETUP.md](SETUP.md).

## Environment variables

- **Needed in Vercel (runtime):** `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`.
- **Local-only (not Vercel):** `DATABASE_URL` (migration scripts).
- **Not used in Phase 0** (add when a feature needs it): `SUPABASE_SERVICE_ROLE_KEY`.
- **Optional (build-time source maps):** `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`.

## Key docs

- [CLAUDE.md](../CLAUDE.md) — vision, stack, roadmap, architecture gotchas
- [docs/SETUP.md](SETUP.md) — per-service setup SOP + `.env.local` template
- [docs/superpowers/specs/2026-06-28-foundation-and-skeleton-design.md](superpowers/specs/2026-06-28-foundation-and-skeleton-design.md) — Phase 0+1 spec (3-layer model, schema, RLS)
- [docs/superpowers/plans/2026-06-28-foundation.md](superpowers/plans/2026-06-28-foundation.md) — Phase 0 plan (+ build-time deviations)
- [docs/superpowers/plans/2026-06-28-skeleton.md](superpowers/plans/2026-06-28-skeleton.md) — Phase 1 plan
