# Lackey AI

> AI "second brain" / companion for the **EU job-seeking journey**. Persistent structured
> profile → tailored, locale-correct CVs and cover letters, plus job tracking and interview prep.
>
> **Status:** greenfield, pre-code (as of 2026-06-28). Repo dir is `Lockey`; product name is **Lackey AI**.

---

## The wedge (why this beats "just use ChatGPT")

1. **EU country-specific CV norms** — German *Lebenslauf* vs UK vs Netherlands vs France vs Europass.
   Almost no tool does this well; US tools ignore it. This is the differentiator — lead with it.
2. **The Skeleton** — one persistent, structured master profile (education, work, projects, skills).
   Every artifact is *derived* from it, so the user never re-pastes their life.

The product is the **workflow integration + EU specialization**, not any single AI call.

---

## Product scope — the 6 pillars

1. **Job search** — find/filter EU jobs to the user's criteria. *(heaviest, least differentiated — deferred; see roadmap)*
2. **CV engine** — ATS-friendly **LaTeX** master CV; generate a tailored "Node CV" per job description (JD). AI suggests diffs vs the master; user accepts, then it renders.
3. **Cover letter** — JD + Skeleton → AI recommends → user aligns → generated letter. Never from scratch; always grounded in the Skeleton.
4. **Job tracker** — application pipeline (spreadsheet-like), updated as the user applies/progresses.
5. **Interview prep** — (a) question bank by role/company; (b) **ElevenLabs** voice mock interviews. *(voice = v2)*
6. **Locale adaptation** — CV/letter standards adjust by target country. *(folded into the CV engine, not a standalone feature)*

---

## Roadmap (phased — build in dependency order, not the numbering above)

| Phase | Spec | Pillars | Depends on |
|------|------|---------|-----------|
| **0** | **Foundation** — Next.js (App Router) + Clerk + Supabase (RLS via Clerk JWT) + Sentry + PostHog, deployed to Vercel | infra | — |
| **1** | **The Skeleton** — master-profile data model + CRUD. Single source of truth. | core | 0 |
| **2** | **CV Engine** — LaTeX compile service + locale-aware ATS templates (DE/UK/NL/Europass) → Master CV PDF | 2 + 6 | 1 |
| **3** | **Node CV** — JD ingestion + AI diff vs master → accept → tailored CV. *Adds the shared JD-ingestion module.* | 2 | 1, 2 |
| **4** | **Cover Letter** — JD + Skeleton → AI recommend → align → generate. Reuses JD ingestion. | 3 | 1 |
| **5** | **Job Tracker** — pipeline table; auto-seeds an entry when a CV/CL is generated for a JD | 4 | 1 (light) |
| **6** | **Interview Prep: Question Bank** — role/company library, text practice | 5a | 0 |
| **7** | **Voice Mock Interview** — ElevenLabs realtime agent over the question bank *(v2)* | 5b | 6 |
| **8** | **Job Search** — aggregated feeds (Adzuna / Arbeitnow / EURES) + filtering *(v2, heaviest)* | 1 | 0 |

- **MVP line = phases 0–4** (a shippable, differentiated product). 5–8 are expansion.
- Phase 1 blocks 2/3/4. Phases 3 & 4 share JD-ingestion. Phase 7 needs 6. 5/6/8 are largely parallel.
- **Current focus:** first spec folds **phases 0 + 1** (Foundation + Skeleton).

---

## Architecture decisions & gotchas (read before building)

- **ATS-friendly LaTeX is a real constraint, not a label.** ATS parsers choke on multi-column / graphical
  PDFs. ATS-safe templates = **single column, standard fonts, real text layer, nothing in headers or
  graphics**. The template discipline *is* the product.
- **LaTeX does NOT compile on Vercel serverless** (no TeX runtime). Render via a **separate compile service**:
  **Tectonic in a Docker container on Fly.io (scale-to-zero)** — bake the template's packages/fonts into the
  image for fast cold compiles. Call it synchronously from a Next.js route handler at MVP; add an Upstash queue
  only if concurrency/latency demands it. Do not attempt to run TeX in a Vercel function.
- **Pinecone is YAGNI until phase 6 or 8.** Tailoring (phases 3–4) is an LLM call with the JD + Skeleton in
  context — no vectors needed. Add Pinecone only for RAG over the question bank (6) or JD↔skill matching (8).
- **Auth model:** Clerk is the identity provider; Supabase is the DB. Wire **Clerk's JWT into Supabase RLS**
  so row-level security keys off the Clerk user id. Clerk = auth, Supabase = data — don't duplicate auth in Supabase.
- **Skeleton = the source of truth.** All derived artifacts (Node CV, cover letter) read from it. Keep it
  normalized and schema-driven.
- **JD ingestion is a shared module** (paste URL/text → parsed structured JD), consumed by phases 3, 4, and 5.
- **Monetization reality:** job seekers have low willingness-to-pay. Plan freemium boundaries early (Stripe).

---

## Tech stack

| Layer | Tool | Role | Lights up at |
|------|------|------|-------------|
| Framework | **Next.js (App Router)** | web app | phase 0 |
| Hosting | **Vercel** | deploy the Next.js app | phase 0 |
| Auth | **Clerk** | identity; JWT feeds Supabase RLS | phase 0 |
| Database | **Supabase** (Postgres) | app data + RLS | phase 0 |
| Email | **Resend** | transactional email | phase 0 |
| DNS | **Cloudflare** | DNS / domain | phase 0 |
| Analytics | **PostHog** | product analytics | phase 0 |
| Error tracking | **Sentry** | errors | phase 0 |
| **LLM** | **Anthropic Claude** | AI suggestions, generation | phase 3 |
| LaTeX compile | **Tectonic on Fly.io** (Docker, scale-to-zero) | render CV PDFs | phase 2 |
| Redis | **Upstash** | compile queue / cache / rate limit | phase 2 |
| Payments | **Stripe** | freemium / subscriptions | when gating paid features |
| Voice | **ElevenLabs** | realtime mock-interview agent | phase 7 |
| Vector DB | **Pinecone** | RAG (question bank) / JD↔skill match | phase 6 / 8 |
| VCS | **GitHub** | source control | now |

### Environment variables (per service — names indicative)
`CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` · `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
· `RESEND_API_KEY` · `ANTHROPIC_API_KEY` · `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` · `SENTRY_DSN`
· `NEXT_PUBLIC_POSTHOG_KEY` · `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` · `PINECONE_API_KEY` · `ELEVENLABS_API_KEY`

---

## Claude Code MCP servers (dev tooling)

Connected this session:

- ✅ **Supabase**, **Vercel**, **Clerk** (live)
- ⏳ **Stripe**, **Sentry**, **PostHog** — added; authenticate in-browser via `/mcp`
- ✅ **Cloudflare docs** (`cloudflare-docs`)
- ⚠️ **GitHub** — added, but its remote MCP needs a **PAT in an `Authorization: Bearer` header**
  (it doesn't support dynamic client registration, so OAuth fails). Note: `gh` CLI is **not installed**;
  GitHub repo/push ops use the cached git credential (macOS keychain) or a classic PAT (`repo` scope).

Pending API keys (local `npx` servers — not yet added):

- **Pinecone** (`@pinecone-database/mcp`, `PINECONE_API_KEY`)
- **Resend** (`resend-mcp`, `RESEND_API_KEY`)
- **Upstash** (`@upstash/mcp-server`, account email + management API key)

---

## Decisions (resolved)

- **Name:** product is **Lackey AI** (repo dir stays `Lockey` for now; rename later if desired).
- **LLM:** **Anthropic Claude**.
- **Framework:** **Next.js (App Router)**.
- **LaTeX compile host:** **Tectonic in a Docker container on Fly.io** (scale-to-zero), called synchronously at MVP.

---

## Working agreement

- Specs live in `docs/superpowers/specs/`. Each phase = its own spec → plan → build cycle.
- Build in roadmap order; respect the dependency graph above.
- Don't reach for Pinecone, ElevenLabs, or job-aggregation work before their phase.
