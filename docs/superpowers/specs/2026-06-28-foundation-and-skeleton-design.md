# Spec: Foundation + Skeleton (Lackey AI — Phase 0 + 1)

**Date:** 2026-06-28
**Status:** Approved (design) — pending implementation plan
**Phases covered:** 0 (Foundation) + 1 (The Skeleton)

---

## 1. Context & goal

Lackey AI is an AI companion for the EU job-seeking journey. This spec covers the first build:
stand up the application platform (auth, DB, deploy, observability) and design + implement the
**Skeleton** — the structured master profile that every later feature reads from.

Goal of this phase: a deployed, authenticated app where a user can manually build a complete
structured profile (their "Skeleton") and organize it into one or more **Career Tracks**.

No CV rendering, no AI, no JD ingestion in this phase — those are phases 2+.

---

## 2. The 3-layer model

The product separates **what you have** from **how you present it**:

| Layer | What it is | Count | Phase |
|------|-----------|-------|-------|
| **Skeleton** | Complete inventory: every job, project, bullet, skill, education entry, personal detail. The single source of truth. | 1 per user | **1** |
| **Career Track** (user-facing: "Master CV") | A curated *selection + emphasis* over the Skeleton for one direction (e.g. PM, Data, UX): which entries/skills appear, their order, a track-specific summary, default locale/template. | many per user | **1** |
| **Node CV** | Per-JD tailoring of a Career Track — picks JD-relevant *bullets*, suggests edits. | many per track | 3 |

Editing a fact in the Skeleton updates it across all Career Tracks. Career Tracks never duplicate
the underlying data — they reference it.

---

## 3. Scope

**In scope (this phase):**
- Next.js (App Router) app deployed to Vercel.
- Clerk auth, wired to Supabase via native third-party-auth integration (RLS on Clerk JWT).
- Full Skeleton data model + RLS.
- CRUD UI for all Skeleton entities (manual entry).
- Career Track creation + entry/skill selection & ordering.
- Profile photo upload (Supabase Storage).
- Sentry + PostHog wired (client + server).

**Out of scope (deferred, but designed-for):**
- AI CV/LinkedIn import → Skeleton (phase 1.5; manual entry first).
- LaTeX rendering, locale templates, translation/export (phase 2).
- Node CV / JD ingestion / bullet-level tailoring (phase 3).
- Stripe/billing, job tracker, interview prep, job search (later phases).
- Webhook-based Clerk→Supabase user sync (using upsert-on-login instead).

---

## 4. Data model (Supabase / Postgres)

Conventions:
- Every table has `user_id text not null` = the Clerk `sub`. Denormalized onto child tables so
  every RLS policy is a single predicate.
- `id uuid default gen_random_uuid() primary key` unless noted.
- `created_at timestamptz default now()`, `updated_at timestamptz default now()` on mutable tables.
- All profile content is **English-canonical** (translation happens at export, phase 2).

### 4.1 `users`
Mirror of the Clerk identity, upserted on first authenticated request.

| col | type | notes |
|-----|------|------|
| id | text PK | Clerk `sub` |
| default_locale | text | e.g. `de-DE`; default `en-GB` |
| plan | text | default `free` (Stripe later) |
| created_at | timestamptz | |

### 4.2 `personal_profile` (1:1 with user)
| col | type | notes |
|-----|------|------|
| user_id | text PK / FK→users | |
| full_name | text | |
| headline | text | |
| email | text | |
| phone | text | |
| location | text | city, country |
| links | jsonb | `[{label,url}]` (portfolio, GitHub, LinkedIn) |
| photo_url | text | Supabase Storage path — **locale-sensitive** |
| date_of_birth | date | **locale-sensitive** |
| nationality | text | **locale-sensitive** |
| marital_status | text | **locale-sensitive** |
| gender | text | **locale-sensitive** |
| driving_license | text | **locale-sensitive** |

All fields optional. Locale-sensitive fields are stored unconditionally; templates decide whether
to render them (phase 2). UI flags them — see §6.

### 4.3 `entries` (unified timeline/section items)
One table for all section types, discriminated by `kind`.

| col | type | notes |
|-----|------|------|
| id | uuid PK | |
| user_id | text FK | |
| kind | text enum | `experience` \| `education` \| `project` \| `certification` \| `award` \| `publication` \| `volunteering` |
| title | text | role / degree / project name / cert name |
| organization | text | company / institution / issuer (nullable) |
| location | text | nullable |
| start_date | date | nullable |
| end_date | date | nullable |
| is_current | boolean | default false |
| summary | text | optional free-text blurb |
| details | jsonb | kind-specific extras (see below) |
| sort_order | int | default 0 |

`details` expected keys by kind (all optional):
- `experience`: `employment_type`
- `education`: `degree`, `field_of_study`, `grade`
- `project`: `url`, `role`
- `certification`: `credential_id`, `url`, `issued`, `expires`
- `publication`: `url`, `venue`
- `award`: `issuer`
- `volunteering`: `cause`

### 4.4 `bullets`
Discrete achievement lines under an entry. The unit that makes Node-CV tailoring possible (phase 3).

| col | type | notes |
|-----|------|------|
| id | uuid PK | |
| user_id | text FK | |
| entry_id | uuid FK→entries (on delete cascade) | |
| text | text | English-canonical |
| tags | text[] | free-form skills/keywords; GIN-indexed for later matching |
| sort_order | int | |

### 4.5 `skills`
| col | type | notes |
|-----|------|------|
| id | uuid PK | |
| user_id | text FK | |
| name | text | free-form |
| category | text | nullable (e.g. "Languages", "Tools") |
| proficiency | text | nullable |
| sort_order | int | |

### 4.6 `languages`
| col | type | notes |
|-----|------|------|
| id | uuid PK | |
| user_id | text FK | |
| name | text | e.g. "German" |
| cefr_level | text | `A1`..`C2` \| `native` |

### 4.7 `career_tracks`
| col | type | notes |
|-----|------|------|
| id | uuid PK | |
| user_id | text FK | |
| name | text | e.g. "Product Manager" |
| target_title | text | headline used on the CV |
| summary | text | **track-specific** profile statement |
| default_locale | text | e.g. `de-DE` (consumed at export, phase 2) |
| default_template | text | template id (phase 2) |
| sort_order | int | |

### 4.8 `track_entries` / `track_skills` (curation)
Which Skeleton items a track includes, and in what order. Inclusion = row presence.

`track_entries`: `id`, `user_id`, `track_id` FK (cascade), `entry_id` FK (cascade), `sort_order`.
`track_skills`: `id`, `user_id`, `track_id` FK (cascade), `skill_id` FK (cascade), `sort_order`.

> Bullet-level selection is **not** modeled here. A track renders all bullets of its selected
> entries; choosing a subset of bullets is the Node CV's job (phase 3).

---

## 5. Row-Level Security

- RLS enabled on every table.
- Single policy per table for all operations: `user_id = auth.jwt() ->> 'sub'`.
- Supabase Storage bucket `profile-photos`: path prefixed by `user_id`; storage policy restricts
  read/write to the owning user.
- Clerk configured as a Supabase third-party auth provider; the client passes the Clerk session
  JWT to Supabase.

---

## 6. Locale field hints (frontend)

A static config maps each locale-sensitive personal field → the locales that conventionally expect
it, rendered as flag emojis beside the field in the form:

```
photo:           🇩🇪 🇦🇹 🇨🇭 🇫🇷
date_of_birth:   🇩🇪 🇦🇹 🇨🇭
nationality:     🇩🇪 🇦🇹 🇫🇷
marital_status:  🇩🇪 🇦🇹
gender:          🇩🇪
driving_license: 🇩🇪 🇫🇷
```

(Exact mapping is product-tunable; this is UI metadata, not DB.) UK/IE intentionally have no flags —
these fields are omitted there for anti-discrimination reasons.

---

## 7. Foundation / infra

- **Next.js App Router** on **Vercel**.
- **Clerk** for auth (sign-in/up, session). Native third-party integration with Supabase.
- **`users` upsert on first authenticated request** (server action / route handler) — no webhook
  this phase.
- **Supabase Storage** bucket for profile photos, RLS-scoped by `user_id`.
- **Sentry** (client + server error tracking) and **PostHog** (product analytics) wired at the root.
- **Resend** configured but minimally used this phase (Clerk handles auth emails).

---

## 8. Onboarding (this phase)

Manual entry only. Forms for: personal profile, entries (per kind), bullets, skills, languages,
career tracks + selection. Designed so an AI-import path (paste/upload existing CV → extract into
these same tables) can be added later without schema changes (#7 deferred).

---

## 9. Testing

Lean, focused on the security-critical and load-bearing paths:
- **RLS isolation test:** user A cannot read/write user B's rows (one test across the core tables).
- **Migration applies cleanly** on a fresh database.
- **users upsert-on-login** creates exactly one row and is idempotent.

No exhaustive per-form tests this phase.

---

## 10. Open questions

None blocking. Tunable later: exact locale→field flag mapping (§6); whether `track_default_locale`
should fall back to `users.default_locale`.
