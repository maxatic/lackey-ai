# Lackey AI — Handoff

**As of:** 2026-06-29 (Phase 1 + landing shipped & **verified working in production**)
**Repo:** https://github.com/maxatic/lackey-ai (private) · branch `main` @ `f5a5528` — pushed; origin in sync
**Live:** https://lackey-ai-main.vercel.app (Vercel project **`lackey-ai-main`**, auto-deploys on push to `main`). Dashboard + all 5 Skeleton sections render correctly in prod.

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

Built via subagent-driven development (ruflo `coder`/`reviewer`, fresh agent per task, per-task spec+quality review + fix loop, two parallel opus final reviews). Pushed to `main` (`31e013a`..`f5a5528`); **deployed and verified working in production**. `npx vitest run` = 66/66 (14 files); `npx tsc --noEmit` = 0; `npx next build` = 14 routes, clean.

- **Tasks 1–7:** db barrel + dashboard nav; personal-profile CRUD (+ photo upload, locale-field flag hints); unified entries CRUD (per-kind, `details` jsonb) + entry detail; bullets CRUD (tags chip-input + reorder); skills + languages CRUD; career-tracks CRUD; track curation (`track_entries`/`track_skills` set-replace). All db helpers under `src/lib/db/*`, routes under `src/app/dashboard/*`. Full DB types regenerated for all 9 tables.
- **Notable fixes during the build:** `reorderBullets` no longer reassigns `entry_id` (same-user cross-entry data-corruption vector closed); RSC client/server boundary fixed by extracting client-safe UI metadata into `entry-kinds.ts`/`cefr.ts`; track route slug unified to `[id]`; db helpers standardized to throw the raw `PostgrestError` (preserves `.code` for Sentry).
- **Landing page** folded in (was a parallel agent's work, now owned): `(marketing)` route group as home `/` — hero/features/cv-formats/how-it-works/skeleton/companion/pricing/FAQ/footer/nav + GSAP/lenis fx. Reviewed (SSR-safe, reduced-motion, a11y) and fixed (picsum→local placeholder, double-`h1`, offscreen ticker gated, `invalidateOnRefresh`, scoped header-hide via `[data-app-header]`).
- **SDD ledger** (full per-task trail + adjudications): `.superpowers/sdd/progress.md`.

## 🟢 Production deploy & debugging (post-merge, this session)

- **THE prod bug (`f5a5528`, fixed & verified):** every `/dashboard/<section>` page threw "Something went wrong" in prod while building fine + passing tests. Root cause (found via **Sentry** `LACKEY-AI-2`): `src/lib/supabase/{server,client}.ts` built the client with **`@supabase/ssr`** (`createServerClient`/`createBrowserClient`) **+** the `accessToken` option. `@supabase/ssr` manages cookie-based Supabase Auth and internally accesses `supabase.auth.onAuthStateChange`, which supabase-js **forbids in `accessToken` mode** → threw on every authenticated query. Tests passed because they mock the client; only surfaced at runtime. **Fix:** plain `@supabase/supabase-js` `createClient` + `accessToken` (no `@supabase/ssr`, no cookies) — the documented Clerk third-party-auth pattern. `@supabase/ssr` is now an unused dep (left installed; remove later). **This confirms Clerk-JWT→Supabase RLS works end-to-end in prod** (the old "integration pending" concern is resolved).
- **Deploy gotcha:** deployment-specific URLs (`lackey-ai-main-<hash>-…vercel.app`) are pinned forever to that build. Always test the **production alias `lackey-ai-main.vercel.app`**, not a `-<hash>-` URL, or you'll see old (broken) builds.
- **MCP accounts:** Vercel MCP was reconnected to **`maxatic's projects`** (team `team_wv1LEnrHlpy3we1pBc9iGxVi`) — `lackey-ai-main` = `prj_s4W2eTqoCEeLnTsO45QKtpLry6OH`. **Sentry** MCP (org `lackey-ai`, region `de.sentry.io`) is the reliable prod-error sink — used it to root-cause. **Supabase** MCP still on the wrong account (use the `pg` runner). PostHog MCP = project 211733.

## 🔴 Known problems / open items

1. **DUPLICATE Vercel project `lackey-ai` (no `-main`) — all builds red. USER ACTION.** A second Vercel project is wired to the same repo but is **missing env vars** (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` etc.), so its build dies prerendering `/_not-found` ("Missing publishableKey"). Your live app is **`lackey-ai-main`** (has env vars, builds green). **Recommended: delete the `lackey-ai` duplicate** (Vercel → lackey-ai → Settings → Delete Project), or copy all env vars into it. Not deletable via API.

2. **`/_not-found` + Clerk (minor, open).** Sentry `LACKEY-AI-4`: `auth() was called but Clerk can't detect usage of clerkMiddleware()` on `/_not-found` (fires on 404s of matcher-excluded paths). Harmless (404 still renders) but noisy, and it's the same fragility that breaks the duplicate project's build. Fix: add a simple `src/app/not-found.tsx` that doesn't depend on Clerk auth context. Not yet done.

3. ~~**`/dashboard` throws "Something went wrong" for signed-in users.**~~ **RESOLVED.** Two layers: telemetry/upsert hardened (`b79b0cc`), then the real cause — the Supabase client (`f5a5528`, see Production section above).

2. **`/dashboard` 404s via `curl` (not a code bug).**
   Clerk **development** keys (`pk_test_`) on a `vercel.app` domain require a "dev-browser" handshake that only a real browser can do; `curl` gets a 404 rewrite (`x-clerk-auth-reason: dev-browser-missing`). Reliable fix is a Clerk **production instance** (`pk_live`) on a **custom domain** — deferred until a domain exists.

3. **Commit email vs GitHub (resolved).**
   Vercel blocked deploys because commits used `go56vum@mytum.de` (not on GitHub). Repo git email is now set to the GitHub noreply `68378768+maxatic@users.noreply.github.com`. Historical commits still carry the uni email (harmless). To use a real email on commits, add+verify it on GitHub then update `git config user.email`.

4. **Supabase MCP is on a different account.**
   The connected Supabase MCP cannot manage project `zluumpwqykxiyvknmfhk` (lackey-ai). DB work therefore uses the Node `pg` runner over `DATABASE_URL` (`npm run db:migrate` / `db:verify` / `test:rls`), not the CLI or MCP.

5. **`src/lib/db/database.types.ts` is a hand-authored stub** (only `users` typed). The other 8 tables are untyped until regenerated — **Phase 1, first task.**

---

## ⏳ Awaiting / next steps

- [ ] **USER: delete the duplicate `lackey-ai` Vercel project** (see Known problems #1) to clear the red builds.
- [ ] **Phase 2 — CV Engine** (Tectonic-on-Fly.io LaTeX compile service + locale-aware ATS templates → Master CV PDF). Phase 1 (the Skeleton it reads from) is done & live. **No spec/plan yet** — start with `superpowers:brainstorming` → spec in `docs/superpowers/specs/` → `writing-plans` → build. Architecture gotchas already in CLAUDE.md (LaTeX does NOT run on Vercel serverless → separate Tectonic/Docker/Fly.io compile service, called synchronously at MVP; ATS = single-column/standard-fonts/real-text).
  - **Parallelism (user asked):** YES — Phase 2 tasks are more independent than Phase 1's (the Fly.io compile service, the LaTeX templates, and the Next.js render route don't share a barrel), so they parallelize well. Use the **Workflow tool** (ultracode is on) to fan out, or the **Agent tool with `isolation: "worktree"`** so concurrent agents don't clobber shared files. Sequence: scout/plan inline → fan out independent impl tasks in worktrees → integrate + verify. Phase 1 went sequential only because every task edited the shared `src/lib/db/index.ts` barrel + had cross-task deps (4→3, 7→3/5/6).
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
