# Lackey AI — Setup SOP (Phase 0 / Foundation)

Do these **in order** before the Foundation build runs. Each section ends with the env vars it
produces — drop every value into a single `.env.local` at the repo root (template at the bottom).

**Already done:** GitHub repo (github.com/maxatic/lackey-ai, private).
**Not needed yet** (later phases): Stripe, Resend, Upstash, Pinecone, ElevenLabs, Cloudflare DNS.

> Order matters: create **Clerk** and **Supabase** first, then wire the **Clerk↔Supabase integration**
> (it needs the Clerk domain), then Sentry + PostHog. **Vercel is last** — it needs all the other keys.

---

## Clerk (auth)

**What you get:** A Clerk application (dev instance) with Email + Google sign-in enabled, and two API keys for your Next.js app.

1. Go to https://dashboard.clerk.com and sign in (or create a free Clerk account).
2. On the dashboard home, select the **Create application** card.
3. In the **Application name** field, enter `Lackey AI`.
4. Under **Sign in options**, toggle on **Email** and toggle on **Google** (leave others off).
5. Click **Create application** — Clerk provisions a **Development** instance automatically (its keys start with `pk_test_` / `sk_test_`).
6. In the left sidebar, open the **API keys** page (under Configure / Developers).
7. Confirm the framework selector is set to **Next.js** so the keys render with the correct env var names.
8. Copy the **Publishable key** value (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`).
9. Reveal and copy the **Secret key** value (`CLERK_SECRET_KEY`).
10. Paste both into your project's `.env.local`.

**Env vars**
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxx
```

**Gotchas:** Dev and prod are separate instances with separate keys — `pk_test_`/`sk_test_` are the Development keys; production needs a Production instance (toggle at the top of the dashboard) which issues `pk_live_`/`sk_live_` keys plus a verified domain. `CLERK_SECRET_KEY` is server-only — never prefix it with `NEXT_PUBLIC_` and never ship it to the client.

Sources:
- [Sign-up and sign-in options | Clerk Docs](https://clerk.com/docs/guides/configure/auth-strategies/sign-up-sign-in-options)
- [Set up Clerk | Clerk Docs](https://clerk.com/docs/quickstarts/setup-clerk)
- [Next.js Quickstart | Clerk Docs](https://clerk.com/docs/quickstarts/nextjs)

---

## Supabase (database + storage)

**What you get:** A hosted Postgres + storage project, its Project URL, a publishable/anon key (client-safe), a service_role/secret key (server-only), and a Postgres connection string for migrations/psql.

1. Go to `https://supabase.com/dashboard` and sign in (or sign up with GitHub/email).
2. If prompted, create or select an **Organization** (name it e.g. "Lackey AI").
3. Click **New project**.
4. Enter **Name** = `lackey-ai`, set a strong **Database Password** (save it — it's in your connection string), and choose **Region** = **Central EU (Frankfurt) / eu-central-1** for EU users.
5. Click **Create new project** and wait for provisioning to finish (~1-2 min).
6. Open the project, then click **Connect** (top bar) and select the **Next.js** framework tab — it shows your **Project URL** and key ready to copy. (Or go to **Project Settings → API Keys** for a specific key.)
7. Copy the **Project URL** → this is `NEXT_PUBLIC_SUPABASE_URL`.
8. Copy the **anon** key (Settings → API Keys → **Legacy API Keys** tab) → this is `NEXT_PUBLIC_SUPABASE_ANON_KEY`. (New-key equivalent: the **Publishable key** `sb_publishable_...` on the **API Keys** tab.)
9. Copy the **service_role** key (same **Legacy API Keys** tab) → this is `SUPABASE_SERVICE_ROLE_KEY`. (New-key equivalent: a **Secret key** `sb_secret_...`.) Keep this server-side only — never expose it in the browser.
10. For migrations/psql, get the **connection string** from the **Connect** dialog (ORMs/psql tab) or **Project Settings → Database → Connection string**; use the **Transaction pooler** URI for serverless/Vercel and substitute your DB password.
11. Storage works out of the box — no extra keys; create buckets later under **Storage** in the dashboard.

**Env vars**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmno.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJ...xxx        # anon/publishable, client-safe
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJ...xxx            # service_role/secret, server ONLY
# For migrations / psql (not a Next.js public var):
DATABASE_URL=postgresql://postgres.[ref]:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

**Gotchas:** Region is permanent — pick `eu-central-1` now for EU latency/data residency, you can't move it later. `NEXT_PUBLIC_*` vars ship to the browser, so the service_role/secret key must NOT use that prefix. Legacy `anon`/`service_role` keys keep working until end of 2026; Supabase recommends the new `sb_publishable_...`/`sb_secret_...` keys for safer rotation — either works, but be consistent.

Sources: `supabase.com/docs/guides/auth/server-side/creating-a-client`, `.../getting-started/api-keys`, `.../getting-started/migrating-to-new-api-keys`, `.../database/connecting-to-postgres`.

---

## Clerk <-> Supabase native integration (third-party auth)

**What you get:** Supabase trusts Clerk-signed session tokens (no JWT secret shared, no JWT template), so RLS policies like `auth.jwt()->>'sub' = user_id` work against authenticated users.

1. Go to [dashboard.clerk.com](https://dashboard.clerk.com) and create/select your "Lackey AI" Clerk application (note: dev instance for local, prod instance for production — they have different domains).
2. In the Clerk Dashboard, open the **Connect with Supabase** setup page ([dashboard.clerk.com/setup/supabase](https://dashboard.clerk.com/setup/supabase)).
3. Choose your configuration options, then click **Activate Supabase integration**.
4. Copy the revealed **Clerk domain** (your issuer), shaped like `https://your-app.clerk.accounts.dev` (dev) or `https://clerk.yourdomain.com` (prod). Keep it.
5. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and create/select your Supabase project (pick a region close to your users — region is permanent).
6. In the Supabase Dashboard, go to **Authentication → Sign In / Providers** (Third-Party Auth section; also reachable at Project → Authentication → Third Party Auth).
7. Click **Add provider** and select **Clerk**.
8. Paste the **Clerk domain** from step 4 into the domain field and save.
9. For client wiring, grab `Project URL` and the publishable (anon) key from Supabase **Project Settings → API** / **Data API**; grab the Clerk publishable + secret keys from Clerk **API keys**.

**Env vars**
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxx   # (or legacy anon key eyJhbGci...)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx                              # server-only, never expose
```

**Gotchas:** Dev and prod Clerk instances have different domains — add a separate Third-Party Auth entry per Supabase environment. `CLERK_SECRET_KEY` is server-only (no `NEXT_PUBLIC_`). Do NOT use the old JWT-template integration (deprecated 1 Apr 2025). Local/CLI dev needs the same domain in `supabase/config.toml` under `[auth.third_party.clerk]` instead of the dashboard.

Sources:
- [Clerk | Supabase Docs](https://supabase.com/docs/guides/auth/third-party/clerk)
- [Integrate Supabase with Clerk | Clerk Docs](https://clerk.com/docs/guides/development/integrations/databases/supabase)
- [Supabase Third-Party Auth Integration | Clerk Changelog](https://clerk.com/changelog/2025-03-31-supabase-integration)

---

## Sentry (error tracking)

**What you get:** a Sentry org + Next.js project, a DSN (`NEXT_PUBLIC_SENTRY_DSN`), and a `SENTRY_AUTH_TOKEN` for source-map upload.

1. Go to **sentry.io** and click **Sign up** (or sign in to your existing account).
2. On the **Create a New Organization** screen, set the org name and pick your **Data Storage Location** from the dropdown — choose **EU** (Frankfurt) or **US** (Iowa). This is permanent; the only way to change it later is a new org.
3. In the dashboard, click **Projects** in the left nav, then **Create Project**.
4. Select **Next.js** as the platform, set an alert frequency, name the project (e.g. `lackey-ai`), assign a team, and click **Create Project**.
5. Skip/close the in-product install wizard (`npx @sentry/wizard@latest -i nextjs`) — wire the SDK later; this SOP stops at the dashboard.
6. Go to **Settings → Projects → lackey-ai → Client Keys (DSN)** and copy the **DSN** value.
7. Go to **Settings → Auth Tokens** (org-level), click **Create New Token**, give it the **project:releases** / org read+write scopes for source maps, and copy it once (shown only at creation).

**Env vars**
```
# Public DSN — safe to expose to the browser; @sentry/nextjs reads it in all runtimes
NEXT_PUBLIC_SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0

# Source-map upload during build only (optional initially) — SECRET, never client-side
SENTRY_AUTH_TOKEN=sntrys_xxx
```

**Gotchas:** Data region is locked at org creation — pick EU/US deliberately. The DSN is not a secret (it's a public ingest key), but `SENTRY_AUTH_TOKEN` is — keep it out of version control and never prefix it with `NEXT_PUBLIC_`. EU orgs ingest to a region-specific host (`*.ingest.de.sentry.io`); use the DSN exactly as shown, don't hand-edit it.

Sources: [Manual Setup (Next.js)](https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/), [Data Storage Location (US or EU)](https://docs.sentry.io/organization/data-storage-location/)

---

## PostHog (analytics)

**What you get:** A PostHog Cloud (EU) project + its Project API key, exposed as two public env vars for client-side capture.

1. Go to `https://eu.posthog.com/signup` and create an account (this URL pins you to the EU region / Frankfurt data residency).
2. Complete signup; PostHog auto-creates your first project. Name it "Lackey AI" when prompted (or accept default and rename later in **Settings → Project**).
3. After landing in the project, look at the onboarding/install panel — your **Project API key** (a `phc_...` value) is shown there. If you skipped it, continue below.
4. In the left sidebar, open **Settings**.
5. Under **Project**, find the **Project API key** field (it begins with `phc_`) and click **Copy**.
6. In the same settings, confirm the region host is the EU ingestion endpoint: `https://eu.i.posthog.com`.
7. Paste the key and host into your `.env.local`.

**Env vars**
```
NEXT_PUBLIC_POSTHOG_KEY=phc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
```
(PostHog's current Next.js docs name the token var `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`; the value is identical, so use whichever name your wiring expects — `NEXT_PUBLIC_POSTHOG_KEY` is the long-standing convention.)

**Gotchas:** Region is locked at signup — an EU account cannot ingest to US and vice versa, so use the `eu.posthog.com` signup URL and the `eu.i.posthog.com` host (note the `.i.`). The `phc_` Project API key is a **public, write-only** key meant for the browser — `NEXT_PUBLIC_` exposure is fine. Do not confuse it with a **Personal API key** (`phx_...`), which is a secret and must never go in client code.

Sources: [PostHog Cloud EU](https://posthog.com/blog/posthog-cloud-eu), [PostHog Next.js docs](https://posthog.com/docs/libraries/next-js), [EU signup](https://eu.posthog.com/signup)

---

## Vercel (deploy)

**What you get:** the live Production deployment of `lackey-ai`, a public `*.vercel.app` URL, and a Git integration that auto-deploys every push to `main` (Production) and every PR/branch (Preview).

1. Go to **vercel.com**, click **Sign Up** (or **Log In**) and choose **Continue with GitHub** so Vercel can see your repos.
2. In the dashboard, click **Add New… → Project**.
3. Under **Import Git Repository**, click **Adjust GitHub App Permissions** (or **Configure GitHub App**) and grant access to the private repo `maxatic/lackey-ai`, then click **Import** next to it.
4. On the **Configure Project** screen, confirm **Framework Preset = Next.js** (auto-detected) and leave **Root Directory = ./**, Build/Output/Install commands on defaults.
5. Expand **Environment Variables**. For each variable below, enter the **Key** and **Value** from your `.env.local` — paste the exact same set so build/runtime match local. Use the **target** selector to apply each to **Production**, **Preview**, and **Development** (select all three for shared values).
6. Click **Deploy**. Wait for the build to finish; Vercel assigns the Production URL `lackey-ai.vercel.app` (or similar) and runs the first deploy.
7. After deploy, the repo is connected: a push/merge to **main** auto-triggers a **Production** deploy; any other branch or PR triggers a **Preview** deploy. No further setup needed.
8. To edit vars later, go to **Project → Settings → Environment Variables** (Production/Preview/Development tabs). Changing a var requires a **redeploy** (Deployments → ⋯ → Redeploy) to take effect.

**Env vars** (exact keys, paste into Vercel; mask real secrets):
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx     # or pk_live_xxx in Production
CLERK_SECRET_KEY=sk_test_xxx                       # or sk_live_xxx in Production
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...          # anon/publishable key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...              # server-only, never NEXT_PUBLIC
SENTRY_DSN=https://xxxx@oxxxx.ingest.sentry.io/xxxx
SENTRY_AUTH_TOKEN=sntrys_xxx                        # for source-map upload at build
NEXT_PUBLIC_SENTRY_DSN=https://xxxx@oxxxx.ingest.sentry.io/xxxx
NEXT_PUBLIC_POSTHOG_KEY=phc_xxx
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com  # EU region (match your PostHog signup)
```

**Gotchas:** Only `NEXT_PUBLIC_*` vars are exposed to the browser bundle — keep `CLERK_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `SENTRY_AUTH_TOKEN` un-prefixed (server-only). Use Clerk/Supabase **test/dev** keys for the Preview target and **live/prod** keys for Production. Vercel env-var changes don't apply to existing deployments — you must redeploy.

---

## Consolidated `.env.local` (repo root)

Copy this to `.env.local` and fill every value. These exact names are what the Foundation code reads.

```bash
# --- Clerk (auth) ---
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx                 # server-only, never NEXT_PUBLIC
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# --- Supabase (database + storage) ---
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...    # anon / publishable, client-safe
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...        # service_role / secret, server ONLY
DATABASE_URL=postgresql://postgres.[ref]:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres  # migrations/psql

# --- Sentry (errors) ---
NEXT_PUBLIC_SENTRY_DSN=https://xxx@oXXX.ingest.de.sentry.io/XXX
SENTRY_AUTH_TOKEN=sntrys_xxx                  # optional at first (source-map upload)

# --- PostHog (analytics) ---
NEXT_PUBLIC_POSTHOG_KEY=phc_xxx
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
```

> `NEXT_PUBLIC_*` ships to the browser — only put client-safe values there. `CLERK_SECRET_KEY`,
> `SUPABASE_SERVICE_ROLE_KEY`, `SENTRY_AUTH_TOKEN`, and `DATABASE_URL` are server-only secrets.

## Hand-off checklist (tick before the build starts)

- [ ] Clerk app created; Email + Google enabled; both keys in `.env.local`
- [ ] Supabase project created in **eu-central-1**; URL + anon + service_role + DATABASE_URL in `.env.local`
- [ ] Clerk↔Supabase third-party auth connected (Clerk domain pasted into Supabase)
- [ ] Sentry Next.js project (EU region) created; DSN in `.env.local`
- [ ] PostHog EU project created; key + host in `.env.local`
- [ ] Vercel: **do at Task 8** (import repo + set the same env vars) — not needed to start

When the first five are ticked and `.env.local` is filled, tell me and I'll start the subagent-driven
Foundation build (I can also create the Supabase project for you via MCP if you'd rather).
