# Lackey AI — Handoff

**As of:** 2026-06-30 (Phase 2 CV Engine built, reviewed & **pushed to prod**; Phase 1 + landing already verified live)
**Repo:** https://github.com/maxatic/lackey-ai (private) · branch `main` @ `c20c52a` — pushed; origin in sync

> ## ▶ RESUME HERE (next session — likely from the Windows 11 PC)
> **All code is committed & pushed — `git pull` on the Windows box to sync.** Phase 2 (CV Engine) is done and live in prod. **The one remaining task is an ops step: deploy the Fly.io compile service + set 2 env vars**, after which "Generate CV" produces real PDFs. Until then the button shows a clean `Missing COMPILE_SERVICE_URL` error and nothing else is affected. Full step-by-step is in **[Awaiting / next steps](#-awaiting--next-steps)** below and `compile-service/README.md`.
>
> **Why the switch to Windows:** the local Docker smoke test failed on the Mac with `rosetta error: failed to open elf …ld-linux-x86-64.so.2` — purely an **Apple-Silicon emulation** issue (the image pins the **x86_64** Tectonic binary). On **Windows 11 (amd64)** the image runs natively, matching Fly. **You may not even need local Docker:** `fly deploy` builds the image remotely on Fly's amd64 builders, so you can deploy straight from any machine with `flyctl` + a Fly account. The local Docker test (Step 0) is optional verification only.
**Live:** https://lackey-ai-main.vercel.app (Vercel project **`lackey-ai-main`**, auto-deploys on push to `main`). Dashboard + all 5 Skeleton sections render correctly in prod. **CV-engine UI is live but "Generate CV" needs the Fly compile service + 2 env vars (ops step below) before it produces PDFs.**

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

## ✅ Done — Phase 2 (CV Engine) — built, reviewed, pushed (this session)

Built via subagent-driven development with **parallel** execution: Task 1 (CvData contract, `e423fe0`) first, then **Wave A = 5 agents in one shot** (latex, cv_documents, resolver, compile-client, Fly service) on disjoint files with scoped per-agent tests + central integration; then Task 3 (renderers) and Task 8 (UI) sequentially. Branch `e423fe0..a3eef2d` (9 commits) on `main`, pushed. `npx vitest run` = **100/100** (19 files); `tsc --noEmit` = 0; `next build` clean.

**The pipeline:** Career Track → `getCvData` resolver (Skeleton + curation, ordered) → locale renderer builds ATS-safe `.tex` → `compilePdf` POSTs to the Fly Tectonic service → PDF stored in the private `cvs` bucket → signed download URL. UI on the Track page (`/dashboard/tracks/[id]`): locale `<select>` (UK/DE) + Generate + re-download list.

- **The wedge (locale correctness):** UK omits DOB/nationality; **DE *Lebenslauf*** emits a personal-data block (Geburtsdatum/Staatsangehörigkeit/Familienstand), **German section headings** (Berufserfahrung/Ausbildung/Kenntnisse/Sprachen/Persönliche Daten/Profil), `mm/yyyy` dates and **"heute"** for current roles. Both share one ATS-safe preamble (single column, standard fonts, real text, no graphics).
- **DB:** `0003_cv_documents.sql` — `cv_documents` table (`unique(track_id, locale)`) + RLS + private `cvs` bucket + 4 owner storage policies. **Applied to the live DB & verified** (RLS on, 1 table policy, 4 storage policies, bucket private). Path convention `<clerk_sub>/<trackId>-<locale>.pdf`.
- **Compile service** (`compile-service/`, NOT part of the Next app): Node `http` + **Tectonic 0.16.9**, `POST /compile` (Bearer, 256 KB cap, 25 s kill-timeout, no shell-escape, **constant-time** auth, no stderr/path leak) → PDF; `GET /health`. Dockerfile warms the TeX bundle; `fly.toml` scale-to-zero. **Not deployed yet — ops step below.**
- **Final review:** adversarial 5-lens Workflow (57 agents — correctness/security/RSC/ATS/contracts, each finding refuted by 3 skeptics). Verdict *fix-then-ship*. Fixed (`a3eef2d`): **DE silently dropped project/cert/award/publication/volunteering entries** (data loss — added the catch-all block + test), the German-headings wedge gap, compile-service timing-oracle + error leak, `links` shape guard, out-of-set `default_locale` `<select>` desync. Review confirmed the storage/RLS ownership flow is safe (write path uses the `auth()` sub prefix; `getTrack` is RLS-scoped). Deferred (non-blocking): rendering `details` fields (degree/grade/issuer), `window.open` trusted-gesture nit.

## 🟢 Production deploy & debugging (post-merge, this session)

- **THE prod bug (`f5a5528`, fixed & verified):** every `/dashboard/<section>` page threw "Something went wrong" in prod while building fine + passing tests. Root cause (found via **Sentry** `LACKEY-AI-2`): `src/lib/supabase/{server,client}.ts` built the client with **`@supabase/ssr`** (`createServerClient`/`createBrowserClient`) **+** the `accessToken` option. `@supabase/ssr` manages cookie-based Supabase Auth and internally accesses `supabase.auth.onAuthStateChange`, which supabase-js **forbids in `accessToken` mode** → threw on every authenticated query. Tests passed because they mock the client; only surfaced at runtime. **Fix:** plain `@supabase/supabase-js` `createClient` + `accessToken` (no `@supabase/ssr`, no cookies) — the documented Clerk third-party-auth pattern. `@supabase/ssr` is now an unused dep (left installed; remove later). **This confirms Clerk-JWT→Supabase RLS works end-to-end in prod** (the old "integration pending" concern is resolved).
- **Deploy gotcha:** deployment-specific URLs (`lackey-ai-main-<hash>-…vercel.app`) are pinned forever to that build. Always test the **production alias `lackey-ai-main.vercel.app`**, not a `-<hash>-` URL, or you'll see old (broken) builds.
- **MCP accounts:** Vercel MCP was reconnected to **`maxatic's projects`** (team `team_wv1LEnrHlpy3we1pBc9iGxVi`) — `lackey-ai-main` = `prj_s4W2eTqoCEeLnTsO45QKtpLry6OH`. **Sentry** MCP (org `lackey-ai`, region `de.sentry.io`) is the reliable prod-error sink — used it to root-cause. **Supabase** MCP still on the wrong account (use the `pg` runner). PostHog MCP = project 211733.

## 🔴 Known problems / open items

1. **DUPLICATE Vercel project `lackey-ai` (no `-main`) — all builds red. USER ACTION.** A second Vercel project is wired to the same repo but is **missing env vars** (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` etc.), so its build dies prerendering `/_not-found` ("Missing publishableKey"). Your live app is **`lackey-ai-main`** (has env vars, builds green). **Recommended: delete the `lackey-ai` duplicate** (Vercel → lackey-ai → Settings → Delete Project), or copy all env vars into it. Not deletable via API.

2. ~~**`/_not-found` + Clerk (minor, open).**~~ **RESOLVED (2026-07-01).** Sentry `LACKEY-AI-4`: `auth() was called but Clerk can't detect usage of clerkMiddleware()` on `/_not-found` (404s of matcher-excluded paths — locally these actually returned **500**, not 404). The originally prescribed fix (a Clerk-free `not-found.tsx`) was tested and does NOT fix it — the root layout's `<SignedIn>/<SignedOut>` were the ones calling server-side `auth()`. Real fix: header moved to a `'use client'` component (`src/components/auth-header.tsx`) so Clerk control components read provider context instead of calling `auth()`; plus a custom `src/app/not-found.tsx`. Verified: excluded-path 404 → 404 (no Clerk error), `/_not-found` and `/` now prerender static, 100/100 tests, tsc + build clean.

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
- [ ] **USER/OPS: deploy the Fly compile service so "Generate CV" works** (Phase 2 is otherwise done & live). One-time:
  1. `cd compile-service && fly launch --no-deploy` (pick a unique app name; region defaults to `ams` — fine for EU).
  2. `fly secrets set COMPILE_SERVICE_SECRET=$(openssl rand -hex 32)` (save this value).
  3. `fly deploy` → note the URL, e.g. `https://<app>.fly.dev`.
  4. In **Vercel** (`lackey-ai-main`) set `COMPILE_SERVICE_URL=https://<app>.fly.dev` and `COMPILE_SERVICE_SECRET=<same value>`, then redeploy. Also add both to local `.env.local`.
  5. **(optional) Local smoke** — run every command from the **repo root** (the earlier "path not found"/`ECONNREFUSED` errors were just from running them in `~`): `docker build -t cv-svc compile-service && docker run -e COMPILE_SERVICE_SECRET=test -p 8080:8080 cv-svc`, then in a 2nd terminal `COMPILE_SERVICE_SECRET=test node compile-service/smoke.mjs` (expects `OK … %PDF`). See `compile-service/README.md`.
  - **`fly deploy` does NOT need local Docker** — it builds remotely on Fly's amd64 builders. The local smoke is optional verification.
  - **Platform note:** the image pins the **x86_64** Tectonic binary, so the local Docker test runs natively on **Windows 11 (amd64)** but fails on **Apple-Silicon Macs** under Rosetta (`rosetta error: …ld-linux-x86-64.so.2`). That error is local-emulation-only and does **not** affect Fly (real x86_64).
  - The `Dockerfile` was hardened (`c20c52a`) to bake the Tectonic bundle into a shared cache dir (`TECTONIC_CACHE_DIR=/var/cache/tectonic`) so cold-start compiles don't re-download it — important under scale-to-zero.
  - Until this whole step is done, the Generate button throws a clean `Missing COMPILE_SERVICE_URL` error; the rest of the app is unaffected.
- [ ] **Phase 2 — CV Engine: DONE & pushed** (see the Phase 2 section above). [spec](superpowers/specs/2026-06-29-cv-engine-design.md), [plan](superpowers/plans/2026-06-29-cv-engine.md). Deferred follow-ups (non-blocking): render `details` fields (education degree/field/grade, cert issuer/url) in `renderEntry`; NL/Europass templates; translated headings beyond DE; DE photo block; swap the per-entry `listBullets` N+1 for a batched query if it ever matters.
- [ ] **Phase 3 — Node CV** (next per roadmap): JD ingestion (paste URL/text → structured JD; shared module reused by Phase 4) + AI diff vs the master CV (Anthropic Claude) → accept → tailored "Node CV". Reads the same `CvData`/renderer pipeline just built. ANTHROPIC_API_KEY lights up here.
  - **Parallelism worked well:** Wave A ran 5 agents at once on disjoint files (own-test-only, no agent commits, central integration) with zero conflicts — repeat that pattern. The only shared-file seam was `database.types.ts`; keep such seams to one agent.
- [ ] **Deferred from Phase 1 review** (non-blocking): switch db `update*().single()` → `.maybeSingle()` + null-handling so a stale/cross-tenant id returns not-found instead of an opaque 500 (do in Phase 3 when ids arrive from JD ingestion); swap the landing `companion` placeholder gradient for real brand art; route the bespoke SplitText reveals through the shared `SplitReveal` primitive.
- [ ] **Custom domain + Clerk production instance** (`pk_live`/`sk_live`) — fixes protected routes reliably (`curl`/`pk_test` dev-browser issue, #2 below).
- [ ] **Before serious production:** add CI secret-scan (gitleaks/trufflehog) + a CI `npm run build`. (`.gitignore` uses a broad `.env*` with `!.env.example`.)
- [ ] **Optional dev tooling still pending API keys** (from setup): local MCP servers — Pinecone (`@pinecone-database/mcp`), Resend (`resend-mcp`), Upstash (`@upstash/mcp-server`); and the GitHub MCP needs a PAT (note: `gh` CLI is NOT installed — GitHub ops currently use the cached git credential).

---

## How to run

```bash
npm run dev            # local dev server
npm test               # unit tests (100/100)
npm run build          # production build
npm run db:migrate     # apply pending SQL migrations (pg runner, reads DATABASE_URL)
npm run db:verify      # assert schema + RLS + storage present
npm run test:rls       # RLS cross-user isolation integration test
```
All read secrets from `.env.local` (gitignored). Template + per-service setup: [docs/SETUP.md](SETUP.md).

## Environment variables

- **Needed in Vercel (runtime):** `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`.
- **Phase 2 CV engine (Vercel runtime + `.env.local`):** `COMPILE_SERVICE_URL`, `COMPILE_SERVICE_SECRET` — point at the deployed Fly service (ops step above). Set `COMPILE_SERVICE_SECRET` to the same value on the Fly side. Without these, CV generation throws `Missing COMPILE_SERVICE_URL`.
- **Local-only (not Vercel):** `DATABASE_URL` (migration scripts).
- **Not used in Phase 0** (add when a feature needs it): `SUPABASE_SERVICE_ROLE_KEY`.
- **Optional (build-time source maps):** `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`.

## Key docs

- [CLAUDE.md](../CLAUDE.md) — vision, stack, roadmap, architecture gotchas
- [docs/SETUP.md](SETUP.md) — per-service setup SOP + `.env.local` template
- [docs/superpowers/specs/2026-06-28-foundation-and-skeleton-design.md](superpowers/specs/2026-06-28-foundation-and-skeleton-design.md) — Phase 0+1 spec (3-layer model, schema, RLS)
- [docs/superpowers/plans/2026-06-28-foundation.md](superpowers/plans/2026-06-28-foundation.md) — Phase 0 plan (+ build-time deviations)
- [docs/superpowers/plans/2026-06-28-skeleton.md](superpowers/plans/2026-06-28-skeleton.md) — Phase 1 plan
