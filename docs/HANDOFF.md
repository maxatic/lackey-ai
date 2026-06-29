# Lackey AI — Handoff

**As of:** 2026-06-29
**Repo:** https://github.com/maxatic/lackey-ai (private) · branch `main` @ `b4aec5d`
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

## 🔴 Known problems

1. **`/dashboard` throws "Something went wrong" for signed-in users (TOP PRIORITY).**
   The route hits `global-error.tsx`. The dashboard layout runs `ensureUser()` (Supabase upsert) and the page runs a server-side PostHog `capture()`+`flush()`; either throwing crashes the route.
   - **Prime suspect (maybe already fixed):** server PostHog initialized with an empty key; fixed in `c3c9d9b` (falls back to `NEXT_PUBLIC_POSTHOG_KEY`). **Re-test first** — the latest deploy includes the fix.
   - **If still broken:** `ensureUser()` re-throws when the Supabase upsert fails (likely the Clerk token not attached → RLS rejects the INSERT). The integration test only exercised SELECT, not INSERT.
   - **Debug:** check **Sentry** (exception is captured), or Vercel runtime logs, or reproduce with `npm run dev` + sign in.
   - **Harden regardless:** wrap the page's PostHog capture and `ensureUser()` body in try/catch (report to Sentry, don't throw) so telemetry/upsert failures never blank the dashboard.
   - Files: `src/app/dashboard/layout.tsx`, `src/app/dashboard/page.tsx`, `src/lib/auth/ensure-user.ts`, `src/lib/supabase/server.ts`. (Also saved as a persistent memory note for next session.)

2. **`/dashboard` 404s via `curl` (not a code bug).**
   Clerk **development** keys (`pk_test_`) on a `vercel.app` domain require a "dev-browser" handshake that only a real browser can do; `curl` gets a 404 rewrite (`x-clerk-auth-reason: dev-browser-missing`). Reliable fix is a Clerk **production instance** (`pk_live`) on a **custom domain** — deferred until a domain exists.

3. **Commit email vs GitHub (resolved).**
   Vercel blocked deploys because commits used `go56vum@mytum.de` (not on GitHub). Repo git email is now set to the GitHub noreply `68378768+maxatic@users.noreply.github.com`. Historical commits still carry the uni email (harmless). To use a real email on commits, add+verify it on GitHub then update `git config user.email`.

4. **Supabase MCP is on a different account.**
   The connected Supabase MCP cannot manage project `zluumpwqykxiyvknmfhk` (lackey-ai). DB work therefore uses the Node `pg` runner over `DATABASE_URL` (`npm run db:migrate` / `db:verify` / `test:rls`), not the CLI or MCP.

5. **`src/lib/db/database.types.ts` is a hand-authored stub** (only `users` typed). The other 8 tables are untyped until regenerated — **Phase 1, first task.**

---

## ⏳ Awaiting / next steps

- [ ] **Re-test `/dashboard`** in a browser (signed in) — confirm issue #1 fixed or debug it.
- [ ] **Phase 1 — the Skeleton** (structured profile + entries/bullets/skills/languages + career tracks + CRUD). Plan ready: [docs/superpowers/plans/2026-06-28-skeleton.md](superpowers/plans/2026-06-28-skeleton.md). First task: regenerate full DB types.
- [ ] **Custom domain + Clerk production instance** (`pk_live`/`sk_live`) — fixes protected routes reliably.
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
