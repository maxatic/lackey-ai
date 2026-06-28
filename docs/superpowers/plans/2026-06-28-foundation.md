# Lackey AI — Foundation (Phase 0) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a deployed, authenticated Next.js app backed by Supabase with the full Skeleton schema, row-level security, profile-photo storage, and observability.

**Architecture:** Next.js App Router on Vercel; Clerk for identity wired into Supabase via native third-party auth so RLS keys off the Clerk `sub`. The 9-table Skeleton schema and its RLS/storage policies are applied as Supabase CLI migrations. Sentry and PostHog are initialized at the app root.

**Tech Stack:** Next.js 15 (App Router) + TypeScript + Tailwind, npm. Clerk (auth) + Supabase (Postgres, RLS, Storage). Vitest tests. Sentry + PostHog.

## Global Constraints

- Next.js 15 App Router, TypeScript, Tailwind, npm. Path alias `@/*` -> `src/*`.
- Auth: `@clerk/nextjs` v6. DB: `@supabase/ssr` + `@supabase/supabase-js`.
- Tests: Vitest `^2`. Errors: `@sentry/nextjs` `^8`. Analytics: `posthog-js` + `posthog-node`.
- Migrations: Supabase CLI, files in `supabase/migrations/NNNN_name.sql`, applied with `supabase db push`.
- Auth model: Clerk = identity; Supabase = data via native third-party auth (Clerk session JWT passed through the `@supabase/ssr` `accessToken` option).
- RLS predicate on EVERY table: `(auth.jwt() ->> 'sub') = user_id`. `user_id` is `text` = the Clerk `sub`.
- All Skeleton content is English-canonical (translation happens at export, Phase 2 — out of scope here).
- VERSION NOTE: the exact Clerk v6 + `@supabase/ssr` `accessToken` wiring is version-sensitive — confirm against installed package versions at execution.

> Spec: [docs/superpowers/specs/2026-06-28-foundation-and-skeleton-design.md](../specs/2026-06-28-foundation-and-skeleton-design.md)

---

### Task 1: Project scaffold (Next.js + TS + Tailwind + Vitest)

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `tailwind.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css` (all via `create-next-app`)
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `src/app/page.test.tsx` (smoke test)
- Modify: `package.json` (add `test` script)
- Test: `src/app/page.test.tsx`

**Interfaces:**
- Consumes: nothing (first task; bootstraps the repo).
- Produces: a runnable Next.js 15 App Router project with the canonical layout (`src/` dir, `@/* -> src/*` alias, Tailwind, npm) that every later task builds on. Establishes the Vitest harness (`npm test`) that all TDD steps in Tasks 2+ rely on. No code-level exported symbols.

> NOTE: This repo root already contains `docs/` and a git history. Run `create-next-app` into the **current directory** (`.`), not a subfolder.

- [ ] **Step 1: Scaffold the Next.js app into the repo root.**
  Run from the repo root. The `.` target scaffolds in place; the flags pin every contract choice (TS, Tailwind, App Router, `src/`, `@/*` alias, no Turbopack flag noise).
  ```bash
  npx create-next-app@15 . --ts --tailwind --app --src-dir --eslint --import-alias "@/*" --use-npm --no-turbopack --yes
  ```
  `@15` is pinned deliberately: `@latest` now resolves to Next 16, which the contract does not target. If it refuses because the directory is non-empty, allow it to proceed (it merges; it does not delete `docs/` or `.git`). When prompted to install/overwrite anything, accept defaults.

- [ ] **Step 2: Verify the scaffold landed with the contract's choices.**
  ```bash
  cat package.json | grep -E '"(next|react|typescript|tailwindcss)"' \
    && grep '"@/\*"' tsconfig.json \
    && ls src/app/page.tsx src/app/layout.tsx
  ```
  Expected output: a `next` line at version `15.x`, a `tailwindcss` line, a `typescript` line, the `"@/*": ["./src/*"]` alias line from `tsconfig.json`, and the two file paths echoed back (no "No such file"). The `next` version must be `15.x` (Step 1's `@15` pin guarantees this).

- [ ] **Step 3: Confirm the dev server serves.**
  ```bash
  (npm run dev &) && sleep 8 && curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:3000 ; pkill -f "next dev"
  ```
  Expected output: `200`. Then `pkill` stops the background dev server. (Deliverable check: `npm run dev` serves.)

- [ ] **Step 4: Install the Vitest test harness.**
  Pins Vitest 2 per the contract, plus the React testing stack and the jsdom environment the smoke test renders into.
  ```bash
  npm install -D vitest@^2 @vitejs/plugin-react jsdom \
    @testing-library/react @testing-library/jest-dom @testing-library/dom
  ```
  Expected: install completes with no `ERESOLVE` errors. If `ERESOLVE` appears (React 19 peer ranges), re-run with `--legacy-peer-deps`.

- [ ] **Step 5: Create the Vitest config.**
  Maps the `@/*` alias so test files import the same way app code does, enables jsdom + globals, and loads the jest-dom matchers via setup.
  Create `vitest.config.ts`:
  ```ts
  import { defineConfig } from 'vitest/config';
  import react from '@vitejs/plugin-react';
  import { fileURLToPath } from 'node:url';

  export default defineConfig({
    plugins: [react()],
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./vitest.setup.ts'],
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  });
  ```

- [ ] **Step 6: Create the Vitest setup file.**
  Registers `@testing-library/jest-dom` matchers (e.g. `toBeInTheDocument`) for every test.
  Create `vitest.setup.ts`:
  ```ts
  import '@testing-library/jest-dom/vitest';
  ```

- [ ] **Step 7: Add the `test` script.**
  In `package.json`, inside `"scripts"`, add the `test` line (keep the existing `dev`/`build`/`start`/`lint` lines):
  ```json
    "scripts": {
      "test": "vitest run"
    }
  ```
  (Merge into the existing `scripts` object — do not replace it.)

- [ ] **Step 8: Write the failing smoke test (TDD red).**
  Create `src/app/page.test.tsx`:
  ```tsx
  import { render, screen } from '@testing-library/react';
  import { describe, it, expect } from 'vitest';
  import Page from '@/app/page';

  describe('home page', () => {
    it('renders without crashing', () => {
      render(<Page />);
      expect(document.body).toBeInTheDocument();
    });
  });
  ```

- [ ] **Step 9: Run the smoke test — expect it to be green already, but prove the harness wires up.**
  ```bash
  npm test
  ```
  Expected output: `Test Files  1 passed (1)` and `Tests  1 passed (1)`.
  To prove the harness actually fails on a broken import (red check before trusting green), temporarily change the import in `src/app/page.test.tsx` to `import Page from '@/app/does-not-exist';`, run `npm test`, confirm it reports `Failed to resolve import`, then revert the line and re-run `npm test` to confirm `1 passed` again.

- [ ] **Step 10: Confirm the production build succeeds.**
  ```bash
  npm run build
  ```
  Expected output: ends with `✓ Compiled successfully` and a route table listing `/` (no TypeScript or lint errors). (Deliverable check: `npm run build` succeeds.)

- [ ] **Step 11: Add a `.gitignore` guard and stage.**
  `create-next-app` writes a `.gitignore` that already excludes `node_modules`, `.next`, and `.env*`. Verify before committing so build artifacts and secrets stay out of git:
  ```bash
  grep -E "node_modules|\.next|\.env" .gitignore
  ```
  Expected output: lines for `/node_modules`, `/.next/`, and `.env*`. If `.env*` is missing, append it.

- [ ] **Step 12: Commit.**
  ```bash
  git add -A
  git commit -m "chore: scaffold Next.js 15 app with TypeScript, Tailwind, and Vitest smoke test"
  ```

---

### Task 2: Clerk authentication

**Files:**
- Create: `src/app/sign-in/[[...sign-in]]/page.tsx`
- Create: `src/app/sign-up/[[...sign-up]]/page.tsx`
- Create: `src/app/dashboard/page.tsx`
- Modify: `src/middleware.ts`
- Modify: `src/app/layout.tsx`
- Modify: `.env.example`
- Modify: `.env.local` (gitignored, not committed)
- Test: `tests/middleware.test.ts`

**Interfaces:**
- Consumes: scaffolded Next.js 15 App Router project from Task 1 (`src/app/layout.tsx`, `src/middleware.ts` exist; `@/*` -> `src/*` alias; Vitest configured).
- Produces:
  - `src/middleware.ts` exporting `clerkMiddleware` config that protects `/dashboard(.*)`.
  - `ClerkProvider`-wrapped root layout.
  - Env contract: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` (consumed by Task 3 `createServerSupabaseClient` / `createBrowserSupabaseClient` via Clerk session token, and by Task 4 `ensureUser` via Clerk `auth()`).
- Note: `@clerk/nextjs@^6` middleware uses `clerkMiddleware` + `createRouteMatcher` and `auth.protect()`. **Confirm against the installed `@clerk/nextjs` version at execution** — the v6 `auth()` is async and `auth.protect()` is the v6 redirect helper; if a v6.x patch changes this, follow the installed package's `clerkMiddleware` docs.

---

- [ ] **Step 1: Manual — create the Clerk application.**
  In the Clerk dashboard (https://dashboard.clerk.com): click "Create application", name it `Lackey AI`, enable "Email" and "Google" sign-in providers, click "Create application". This generates the dev instance.

- [ ] **Step 2: Manual — copy the API keys.**
  In the new app, open "API keys" (or the "Next.js" quickstart tab). Copy the **Publishable key** (starts `pk_test_`) and the **Secret key** (starts `sk_test_`). Keep this tab open for Step 4.

- [ ] **Step 3: Install `@clerk/nextjs` v6.**
  ```bash
  npm install @clerk/nextjs@^6
  ```
  Verify:
  ```bash
  npm ls @clerk/nextjs
  ```
  Expected output (version 6.x):
  ```
  └── @clerk/nextjs@6.x.x
  ```

- [ ] **Step 4: Write env files.**
  Append to `.env.example` (placeholders, committed):
  ```dotenv
  # Clerk
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
  CLERK_SECRET_KEY=sk_test_xxx
  NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
  NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
  ```
  Create/append to `.env.local` (real keys from Step 2, gitignored — NOT committed):
  ```dotenv
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_<paste real>
  CLERK_SECRET_KEY=sk_test_<paste real>
  NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
  NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
  ```
  Verify `.env.local` is ignored:
  ```bash
  git check-ignore .env.local
  ```
  Expected output:
  ```
  .env.local
  ```

- [ ] **Step 5: Write the failing middleware test.**
  Create `tests/middleware.test.ts`:
  ```ts
  import { describe, it, expect } from 'vitest';
  import { config } from '@/middleware';

  describe('clerk middleware', () => {
    it('matches /dashboard so the route runs through auth', () => {
      const matcher = config.matcher.join(' ');
      expect(matcher).toContain('dashboard');
    });

    it('does not skip Next internals / static files', () => {
      // The negative-lookahead matcher should exclude _next and static assets.
      const matcher = config.matcher.join(' ');
      expect(matcher).toContain('_next');
    });
  });
  ```

- [ ] **Step 6: Run the test — expect FAIL.**
  ```bash
  npx vitest run tests/middleware.test.ts
  ```
  Expected: FAIL — `Failed to resolve import "@/middleware"` (the file still holds Task 1's placeholder middleware with no `dashboard`/`_next` matcher).

- [ ] **Step 7: Implement `src/middleware.ts`.**
  Replace the contents of `src/middleware.ts`:
  ```ts
  import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

  const isProtectedRoute = createRouteMatcher(['/dashboard(.*)']);

  export default clerkMiddleware(async (auth, req) => {
    if (isProtectedRoute(req)) {
      await auth.protect();
    }
  });

  export const config = {
    matcher: [
      // Skip Next.js internals and static files, unless found in search params
      '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
      // Always run for API routes
      '/(api|trpc)(.*)',
    ],
  };
  ```

- [ ] **Step 8: Run the test — expect PASS.**
  ```bash
  npx vitest run tests/middleware.test.ts
  ```
  Expected: PASS (2 tests passing).

- [ ] **Step 9: Wrap the root layout in `ClerkProvider`.**
  Edit `src/app/layout.tsx` to wrap the existing tree and add header auth controls:
  ```tsx
  import type { Metadata } from 'next';
  import {
    ClerkProvider,
    SignInButton,
    SignUpButton,
    SignedIn,
    SignedOut,
    UserButton,
  } from '@clerk/nextjs';
  import './globals.css';

  export const metadata: Metadata = {
    title: 'Lackey AI',
    description: 'Your AI companion for the EU job-seeking journey.',
  };

  export default function RootLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return (
      <ClerkProvider>
        <html lang="en">
          <body>
            <header className="flex justify-end items-center gap-4 p-4 h-16">
              <SignedOut>
                <SignInButton />
                <SignUpButton />
              </SignedOut>
              <SignedIn>
                <UserButton />
              </SignedIn>
            </header>
            {children}
          </body>
        </html>
      </ClerkProvider>
    );
  }
  ```

- [ ] **Step 10: Add the sign-in catch-all route.**
  Create `src/app/sign-in/[[...sign-in]]/page.tsx`:
  ```tsx
  import { SignIn } from '@clerk/nextjs';

  export default function SignInPage() {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <SignIn />
      </main>
    );
  }
  ```

- [ ] **Step 11: Add the sign-up catch-all route.**
  Create `src/app/sign-up/[[...sign-up]]/page.tsx`:
  ```tsx
  import { SignUp } from '@clerk/nextjs';

  export default function SignUpPage() {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <SignUp />
      </main>
    );
  }
  ```

- [ ] **Step 12: Add the protected dashboard placeholder.**
  Create `src/app/dashboard/page.tsx` (Task 4 replaces the body with `ensureUser()` + real UI):
  ```tsx
  export default function DashboardPage() {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-2 text-gray-600">You are signed in. Skeleton coming soon.</p>
      </main>
    );
  }
  ```

- [ ] **Step 13: Type-check passes.**
  ```bash
  npx tsc --noEmit
  ```
  Expected output: no errors (exit code 0, no output).

- [ ] **Step 14: Manual smoke test of the redirect deliverable.**
  ```bash
  npm run dev
  ```
  In a private/incognito window (signed out) visit `http://localhost:3000/dashboard`.
  Expected: redirected to `http://localhost:3000/sign-in?...` (Clerk sign-in form renders). After completing sign-in, expected: lands on `/dashboard` showing the "Dashboard / You are signed in." placeholder, with `UserButton` in the header. Stop dev with Ctrl+C.

- [ ] **Step 15: Commit.**
  ```bash
  git add src/middleware.ts src/app/layout.tsx \
    "src/app/sign-in/[[...sign-in]]/page.tsx" \
    "src/app/sign-up/[[...sign-up]]/page.tsx" \
    src/app/dashboard/page.tsx \
    tests/middleware.test.ts .env.example package.json package-lock.json
  git commit -m "feat(auth): add Clerk v6 auth with protected /dashboard"
  ```

---

### Task 3: Supabase project + clients (Clerk third-party auth)

**Files:**
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/client.ts`
- Create: `.env.example` (or Modify if it exists from Task 1/2)
- Modify: `.env.local` (gitignored — local secrets)
- Create: `src/app/_probe/page.tsx` (temporary auth-probe server component; deleted at task end)
- Test: `src/lib/supabase/server.test.ts`

**Interfaces:**
- Produces: `createServerSupabaseClient(): Promise<SupabaseClient<Database>>` — server; injects Clerk session token via the `@supabase/ssr` `accessToken` option.
- Produces: `createBrowserSupabaseClient(): SupabaseClient<Database>` — browser; `accessToken` resolved via Clerk `useSession().session?.getToken()`.
- Consumes: `Database` from `src/lib/db/database.types.ts` (Task 4 generates the real one; this task adds a minimal stub if absent so types compile).
- Consumes: Clerk `auth()` / `useSession()` from `@clerk/nextjs` (Task 2).

> VERSION NOTE: the `@supabase/ssr` `accessToken` option + Clerk v6 native third-party wiring is version-sensitive. The code below is the current pattern for `@clerk/nextjs@^6` + `@supabase/ssr@latest`. At execution, confirm against installed versions: `npm ls @clerk/nextjs @supabase/ssr @supabase/supabase-js`. If `accessToken` is not accepted by the installed `createServerClient`/`createBrowserClient`, upgrade `@supabase/ssr` (native Clerk integration requires a recent `ssr`).

---

- [ ] **Step 1: Create the Supabase project and capture credentials.**
  Option A (MCP, preferred if available): call `mcp__claude_ai_Supabase__create_project` with `name: "lackey-ai"`, your org id (from `list_organizations`), region `eu-central-1` (EU data residency), then `get_project_url` and `get_publishable_keys`. Also grab the `service_role` key from the dashboard (MCP does not return it).
  Option B (dashboard): https://supabase.com/dashboard → New project → name `lackey-ai`, region `Central EU (Frankfurt)`, set a DB password. After provisioning: Settings → API → copy **Project URL**, **anon/publishable** key, and **service_role** key.
  Record all three values for Step 2.

- [ ] **Step 2: Write env vars into `.env.local`.**
  Append (replace the placeholder values with the real ones from Step 1):
  ```bash
  NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key
  SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key
  ```
  Verify it loads (and that `.env.local` is gitignored):
  ```bash
  grep -q '^\.env\.local' .gitignore && echo "gitignored OK"
  grep -c '^NEXT_PUBLIC_SUPABASE_URL=' .env.local
  ```
  Expected output:
  ```
  gitignored OK
  1
  ```

- [ ] **Step 3: Document the same keys in `.env.example` (no secret values).**
  Create or append to `.env.example`:
  ```bash
  # Supabase (Task 3)
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_ANON_KEY=
  SUPABASE_SERVICE_ROLE_KEY=
  ```
  Verify:
  ```bash
  grep -c 'SUPABASE' .env.example
  ```
  Expected output: `3`

- [ ] **Step 4: Install the Supabase packages.**
  ```bash
  npm install @supabase/ssr @supabase/supabase-js
  ```
  Verify:
  ```bash
  npm ls @supabase/ssr @supabase/supabase-js
  ```
  Expected output (versions may differ; both present, no `UNMET DEPENDENCY`):
  ```
  lackey-ai@0.1.0 ...
  ├── @supabase/ssr@0.x.x
  └── @supabase/supabase-js@2.x.x
  ```

- [ ] **Step 5: Ensure a `Database` type exists so the clients compile.**
  Task 4 generates the real types. If `src/lib/db/database.types.ts` does not yet exist, create this stub (Task 4 overwrites it):
  ```ts
  // src/lib/db/database.types.ts
  // ponytail: stub — Task 4 replaces this with `supabase gen types`. Keeps clients type-checked meanwhile.
  export type Database = {
    public: { Tables: Record<string, never>; Views: Record<string, never>; Functions: Record<string, never> };
  };
  ```
  Verify:
  ```bash
  test -f src/lib/db/database.types.ts && echo "exists"
  ```
  Expected output: `exists`

- [ ] **Step 6: Write the failing test for `createServerSupabaseClient`.**
  This asserts the helper returns a Supabase client wired with the Clerk token (mocking `@clerk/nextjs/server` and `@supabase/ssr` so no network is needed). Create `src/lib/supabase/server.test.ts`:
  ```ts
  import { describe, it, expect, vi, beforeEach } from 'vitest';

  const getToken = vi.fn().mockResolvedValue('clerk.jwt.token');
  const createServerClient = vi.fn().mockReturnValue({ __client: true });

  vi.mock('@clerk/nextjs/server', () => ({
    auth: vi.fn().mockResolvedValue({ getToken }),
  }));
  vi.mock('@supabase/ssr', () => ({ createServerClient }));

  describe('createServerSupabaseClient', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://x.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    });

    it('builds a client with url, anon key, and a Clerk accessToken resolver', async () => {
      const { createServerSupabaseClient } = await import('./server');
      const client = await createServerSupabaseClient();

      expect(client).toEqual({ __client: true });
      expect(createServerClient).toHaveBeenCalledTimes(1);
      const [url, key, opts] = createServerClient.mock.calls[0];
      expect(url).toBe('https://x.supabase.co');
      expect(key).toBe('anon-key');
      expect(typeof opts.accessToken).toBe('function');

      // accessToken must resolve the live Clerk session token
      const token = await opts.accessToken();
      expect(token).toBe('clerk.jwt.token');
      expect(getToken).toHaveBeenCalledTimes(1);
    });
  });
  ```

- [ ] **Step 7: Run the test — expect FAIL (module not found).**
  ```bash
  npx vitest run src/lib/supabase/server.test.ts
  ```
  Expected: FAIL — `Error: Failed to load url ./server` / `Cannot find module './server'`.

- [ ] **Step 8: Implement `createServerSupabaseClient`.**
  Create `src/lib/supabase/server.ts`:
  ```ts
  import { createServerClient } from '@supabase/ssr';
  import { auth } from '@clerk/nextjs/server';
  import type { SupabaseClient } from '@supabase/supabase-js';
  import type { Database } from '@/lib/db/database.types';

  // ponytail: cookies is a no-op stub — Clerk owns the session, so Supabase auth comes
  // entirely from accessToken; createServerClient still requires the cookies option present.
  export async function createServerSupabaseClient(): Promise<SupabaseClient<Database>> {
    const { getToken } = await auth();
    return createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: { getAll: () => [], setAll: () => {} },
        accessToken: async () => (await getToken()) ?? null,
      },
    );
  }
  ```

- [ ] **Step 9: Run the test — expect PASS.**
  ```bash
  npx vitest run src/lib/supabase/server.test.ts
  ```
  Expected: `1 passed`.

- [ ] **Step 10: Implement `createBrowserSupabaseClient`.**
  Create `src/lib/supabase/client.ts`. The browser client cannot call `useSession` at module scope, so it takes the session's `getToken` from the caller (a `'use client'` component using `useSession()`):
  ```ts
  'use client';
  import { createBrowserClient } from '@supabase/ssr';
  import type { SupabaseClient } from '@supabase/supabase-js';
  import type { Database } from '@/lib/db/database.types';

  // Pass session?.getToken from `useSession()` (Clerk v6). Called inside a component / useMemo.
  export function createBrowserSupabaseClient(
    getToken: () => Promise<string | null>,
  ): SupabaseClient<Database> {
    return createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { accessToken: async () => (await getToken()) ?? null },
    );
  }
  ```
  > Contract note: the contract lists `createBrowserSupabaseClient(): SupabaseClient<Database>`. Clerk v6 exposes `getToken` only via the React `useSession()` hook, so the token resolver must be injected by the calling component. Confirm at execution; if a hookless global token API exists in the installed Clerk version, drop the parameter to match the bare signature.
  Verify it type-checks:
  ```bash
  npx tsc --noEmit
  ```
  Expected output: (no output, exit 0).

- [ ] **Step 11: Configure Clerk as a Supabase third-party auth provider (manual dashboard).**
  Supabase dashboard → Authentication → Sign In / Providers → **Third-Party Auth** → Add provider → **Clerk**. Paste your Clerk **Frontend API URL / domain** (Clerk dashboard → Configure → API keys → "Frontend API URL", e.g. `https://your-app.clerk.accounts.dev`).
  Then in the **Clerk** dashboard → Configure → **Supabase integration** → "Activate Supabase integration" (this makes Clerk session JWTs carry the `role: authenticated` and `sub` claims Supabase RLS reads).
  No env var change is needed — the client passes the token via `accessToken`.

- [ ] **Step 12: Add a temporary authenticated server-component probe.**
  Create `src/app/_probe/page.tsx`. RLS tables land in Task 5; until then query `pg_catalog` to prove the authorized round-trip returns no error:
  ```tsx
  import { createServerSupabaseClient } from '@/lib/supabase/server';

  // ponytail: throwaway probe — Task 3 deliverable proof, deleted in the same commit's follow-up. Remove after verifying.
  export default async function ProbePage() {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.rpc('version'); // built-in; needs only a valid authorized connection
    return (
      <pre>
        {JSON.stringify({ ok: !error, error: error?.message ?? null, data }, null, 2)}
      </pre>
    );
  }
  ```

- [ ] **Step 13: Verify the deliverable — authenticated, authorized, no-error result.**
  ```bash
  npm run dev
  ```
  In a browser, sign in (Clerk), then visit `http://localhost:3000/_probe`.
  Expected: the page renders JSON with `"ok": true` and `"error": null` (an authorized round-trip with no auth/RLS error). If signed out, Clerk redirects to sign-in (middleware from Task 2) — confirming the token path is live. Stop dev (`Ctrl-C`).

- [ ] **Step 14: Remove the probe (it was proof, not product).**
  ```bash
  rm -rf src/app/_probe
  test ! -d src/app/_probe && echo "probe removed"
  ```
  Expected output: `probe removed`.

- [ ] **Step 15: Final check — test suite + typecheck green.**
  ```bash
  npx vitest run src/lib/supabase/server.test.ts && npx tsc --noEmit
  ```
  Expected: `1 passed` then no output (exit 0).

- [ ] **Step 16: Commit.**
  ```bash
  git add src/lib/supabase src/lib/db/database.types.ts .env.example package.json package-lock.json
  git commit -m "feat(supabase): add Clerk-authed server/browser clients via third-party auth"
  ```

---

### Task 4: Database schema migration

**Files:**
- Create: `supabase/migrations/0001_schema.sql`
- Create: `supabase/config.toml` (generated by `supabase init`)
- Modify: `.env.local` (append `SUPABASE_ACCESS_TOKEN` reference note — actual token stays in shell env, not committed)
- Modify: `.gitignore` (ensure `supabase/.temp/` and `supabase/.branches/` ignored — `supabase init` writes this)
- Verify: ad-hoc SQL query run via `supabase db push` + a `psql`/SQL verification (no unit test — this is INFRA)

**Interfaces:**
- Consumes: a live Supabase project (created in an earlier Foundation task) with its project ref and DB connection available. Requires the Supabase CLI installed and an access token in the shell (`SUPABASE_ACCESS_TOKEN`).
- Produces: 9 tables (`users`, `personal_profile`, `entries`, `bullets`, `skills`, `languages`, `career_tracks`, `track_entries`, `track_skills`), the `entry_kind` enum, and indexes (`entries_user_kind_idx`, `bullets_entry_idx`, `bullets_tags_gin`). No code interface — downstream Task (database.types.ts generation) consumes this schema via `supabase gen types`.

> Note: this task creates schema + indexes only. RLS enable + policies are a separate Foundation task (migration `0002_rls.sql`); do not add RLS here.

- [ ] **Step 1: Confirm CLI is installed.** Run:
  ```bash
  supabase --version
  ```
  Expected: a version string like `2.x.x` printed (any 2.x is fine). If "command not found", install with `npm install -g supabase` (or `brew install supabase/tap/supabase`) and re-run.

- [ ] **Step 2: Initialize Supabase in the repo.** From the project root run:
  ```bash
  supabase init
  ```
  Expected output: `Finished supabase init.` This creates `supabase/config.toml` and `supabase/.gitignore`. Verify the directory exists:
  ```bash
  ls supabase/
  ```
  Expected to list (at least): `config.toml`.

- [ ] **Step 3: Link the local project to the remote Supabase project.** Get the project ref from the Supabase dashboard (Project Settings → General → "Reference ID") and run:
  ```bash
  supabase link --project-ref <PROJECT_REF>
  ```
  Expected output: `Finished supabase link.` (It will prompt for the database password — paste the DB password from Project Settings → Database. The CLI uses `SUPABASE_ACCESS_TOKEN` from the shell for the API auth; if unset, it opens a browser login.)

  Verify the link:
  ```bash
  supabase projects list
  ```
  Expected: the linked project's row is marked with a `●` (linked indicator) in the `LINKED` column.

- [ ] **Step 4: Write the schema migration.** Create `supabase/migrations/0001_schema.sql` with EXACTLY this content:
  ```sql
  create type entry_kind as enum ('experience','education','project','certification','award','publication','volunteering');

  create table users (
    id text primary key,
    default_locale text not null default 'en-GB',
    plan text not null default 'free',
    created_at timestamptz not null default now()
  );

  create table personal_profile (
    user_id text primary key references users(id) on delete cascade,
    full_name text, headline text, email text, phone text, location text,
    links jsonb not null default '[]',
    photo_url text, date_of_birth date, nationality text, marital_status text, gender text, driving_license text,
    updated_at timestamptz not null default now()
  );

  create table entries (
    id uuid primary key default gen_random_uuid(),
    user_id text not null references users(id) on delete cascade,
    kind entry_kind not null,
    title text not null,
    organization text, location text,
    start_date date, end_date date,
    is_current boolean not null default false,
    summary text,
    details jsonb not null default '{}',
    sort_order int not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );
  create index entries_user_kind_idx on entries(user_id, kind);

  create table bullets (
    id uuid primary key default gen_random_uuid(),
    user_id text not null references users(id) on delete cascade,
    entry_id uuid not null references entries(id) on delete cascade,
    text text not null,
    tags text[] not null default '{}',
    sort_order int not null default 0,
    created_at timestamptz not null default now()
  );
  create index bullets_entry_idx on bullets(entry_id);
  create index bullets_tags_gin on bullets using gin(tags);

  create table skills (
    id uuid primary key default gen_random_uuid(),
    user_id text not null references users(id) on delete cascade,
    name text not null, category text, proficiency text,
    sort_order int not null default 0
  );

  create table languages (
    id uuid primary key default gen_random_uuid(),
    user_id text not null references users(id) on delete cascade,
    name text not null, cefr_level text not null
  );

  create table career_tracks (
    id uuid primary key default gen_random_uuid(),
    user_id text not null references users(id) on delete cascade,
    name text not null, target_title text,
    summary text, default_locale text, default_template text,
    sort_order int not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );

  create table track_entries (
    id uuid primary key default gen_random_uuid(),
    user_id text not null references users(id) on delete cascade,
    track_id uuid not null references career_tracks(id) on delete cascade,
    entry_id uuid not null references entries(id) on delete cascade,
    sort_order int not null default 0,
    unique (track_id, entry_id)
  );

  create table track_skills (
    id uuid primary key default gen_random_uuid(),
    user_id text not null references users(id) on delete cascade,
    track_id uuid not null references career_tracks(id) on delete cascade,
    skill_id uuid not null references skills(id) on delete cascade,
    sort_order int not null default 0,
    unique (track_id, skill_id)
  );
  ```

- [ ] **Step 5: Dry-run the migration locally to catch SQL errors before touching remote.** Lint the SQL by starting a throwaway local stack and applying it (catches syntax errors without risking the remote DB):
  ```bash
  supabase db start && supabase migration up --local
  ```
  Expected output ends with: `Applying migration 0001_schema.sql...` followed by no error. If it errors, fix `0001_schema.sql` and re-run. Then tear the local stack down:
  ```bash
  supabase stop
  ```
  Expected: `Stopped supabase local development setup.`
  > If Docker is not available locally, skip this step and rely on Step 6 (the remote push will surface any SQL error before commit).

- [ ] **Step 6: Apply the migration to the remote project.** Run:
  ```bash
  supabase db push
  ```
  Expected output:
  ```
  Applying migration 0001_schema.sql...
  Finished supabase db push.
  ```
  If it lists the migration and asks `Do you want to push these migrations to the remote database? [Y/n]`, answer `Y`.

- [ ] **Step 7: Verify all 9 tables exist.** First capture the DB connection string into `$DB_URL`, then run the verification query with `psql`. For the remote project, copy the connection string from Project Settings → Database → "Connection string" (URI). (For a local stack you'd instead use `export DB_URL="$(supabase status -o env | grep '^DB_URL=' | cut -d'"' -f2)"`.)
  ```bash
  export DB_URL="postgresql://postgres:<DB_PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres"
  psql "$DB_URL" -c "select table_name from information_schema.tables where table_schema='public' order by table_name;"
  ```
  Expected exactly these 9 rows (alphabetical):
  ```
  bullets
  career_tracks
  entries
  languages
  personal_profile
  skills
  track_entries
  track_skills
  users
  ```

- [ ] **Step 8: Verify the `entry_kind` enum exists with all 7 values.** Run (`$DB_URL` from Step 7):
  ```bash
  psql "$DB_URL" -c "select enumlabel from pg_enum e join pg_type t on t.oid=e.enumtypid where t.typname='entry_kind' order by e.enumsortorder;"
  ```
  Expected exactly these 7 rows (in declared order):
  ```
  experience
  education
  project
  certification
  award
  publication
  volunteering
  ```

- [ ] **Step 9: Verify the GIN index (and the two btree indexes) exist.** Run (`$DB_URL` from Step 7):
  ```bash
  psql "$DB_URL" -c "select indexname, indexdef from pg_indexes where schemaname='public' and indexname in ('bullets_tags_gin','bullets_entry_idx','entries_user_kind_idx') order by indexname;"
  ```
  Expected exactly these 3 rows; note `bullets_tags_gin` uses `gin`:
  ```
  bullets_entry_idx     | CREATE INDEX bullets_entry_idx ON public.bullets USING btree (entry_id)
  bullets_tags_gin      | CREATE INDEX bullets_tags_gin ON public.bullets USING gin (tags)
  entries_user_kind_idx | CREATE INDEX entries_user_kind_idx ON public.entries USING btree (user_id, kind)
  ```
  The `USING gin (tags)` substring on `bullets_tags_gin` is the load-bearing assertion — it confirms the GIN index (not a btree) was created.

- [ ] **Step 10: Confirm the migration is recorded as applied.** Run:
  ```bash
  supabase migration list
  ```
  Expected: a row for `0001` showing the same timestamp under both the `LOCAL` and `REMOTE` columns (confirms remote is in sync, not pending).

- [ ] **Step 11: Commit.**
  ```bash
  git add supabase/config.toml supabase/.gitignore supabase/migrations/0001_schema.sql
  git commit -m "feat(db): add 0001 schema migration for skeleton data model"
  ```

---

### Task 5: RLS policies + Storage + isolation test

**Files:**
- Create: `supabase/migrations/0002_rls.sql`
- Create: `tests/rls.test.ts`
- Create: `tests/helpers/rls-clients.ts`
- Modify: `package.json` (add `test:rls` script + `jsonwebtoken` devDep)

**Interfaces:**
- Consumes: migration `supabase/migrations/0001_schema.sql` (Task that created all 9 tables: `users`, `personal_profile`, `entries`, `bullets`, `skills`, `languages`, `career_tracks`, `track_entries`, `track_skills`).
- Consumes: local Supabase stack from `supabase start` (provides `API URL`, `anon key`, `service_role key`, and the JWT secret).
- Produces: RLS enabled on all 9 tables + per-owner policy `(auth.jwt() ->> 'sub') = user_id`; private `profile-photos` storage bucket with owner-prefixed-path policies. No exported TS symbols consumed by other tasks (this is the security gate; later tasks rely on the runtime RLS it installs, not on its code).

> VERSION NOTE: the RLS predicate `(auth.jwt() ->> 'sub') = user_id` is the Supabase native-Clerk pattern and is stable across @supabase/ssr; the test mints its own HS256 JWTs with the local stack's JWT secret, so it does not depend on the installed Clerk/@supabase/ssr versions. Confirm the local JWT secret value (`supabase status -o env`) at execution.

---

- [ ] **Step 1: Add the `test:rls` script and `jsonwebtoken` devDependency.**
  In `package.json`, inside `"scripts"` add `"test:rls": "vitest run tests/rls.test.ts"`, then install the JWT minter:
  ```bash
  npm install -D jsonwebtoken @types/jsonwebtoken
  ```
  Verify:
  ```bash
  npm pkg get scripts.test:rls && node -e "require('jsonwebtoken'); console.log('jwt-ok')"
  ```
  Expected output: `"vitest run tests/rls.test.ts"` then `jwt-ok`.

- [ ] **Step 2: Start the local Supabase stack and capture its env.**
  ```bash
  supabase start
  supabase status -o env | grep -E 'API_URL|SERVICE_ROLE_KEY|JWT_SECRET|ANON_KEY'
  ```
  Expected output: four lines, e.g.
  ```
  ANON_KEY="eyJ..."
  API_URL="http://127.0.0.1:54321"
  JWT_SECRET="super-secret-jwt-token-with-at-least-32-characters-long"
  SERVICE_ROLE_KEY="eyJ..."
  ```
  These are read by the test from the running stack — no `.env` edit needed (Step 6 reads them via `supabase status -o env`). Leave the stack running.

- [ ] **Step 3: Write the RLS migration (enable RLS + per-owner policy on all 9 tables + storage bucket & policies).**
  Create `supabase/migrations/0002_rls.sql`:
  ```sql
  -- 0002_rls.sql — RLS for all tables + private profile-photos bucket.
  -- Predicate everywhere: the Clerk 'sub' claim in the JWT must equal the row's user_id.
  -- ponytail: one helper expression repeated per table; no SECURITY DEFINER function needed for a single-claim check.

  -- Enable RLS on every table.
  alter table users           enable row level security;
  alter table personal_profile enable row level security;
  alter table entries         enable row level security;
  alter table bullets         enable row level security;
  alter table skills          enable row level security;
  alter table languages       enable row level security;
  alter table career_tracks   enable row level security;
  alter table track_entries   enable row level security;
  alter table track_skills    enable row level security;

  -- users: PK column is `id` (= Clerk sub), not `user_id`.
  create policy users_owner on users
    for all
    using ((auth.jwt() ->> 'sub') = id)
    with check ((auth.jwt() ->> 'sub') = id);

  -- personal_profile: owner column is `user_id`.
  create policy personal_profile_owner on personal_profile
    for all
    using ((auth.jwt() ->> 'sub') = user_id)
    with check ((auth.jwt() ->> 'sub') = user_id);

  create policy entries_owner on entries
    for all
    using ((auth.jwt() ->> 'sub') = user_id)
    with check ((auth.jwt() ->> 'sub') = user_id);

  create policy bullets_owner on bullets
    for all
    using ((auth.jwt() ->> 'sub') = user_id)
    with check ((auth.jwt() ->> 'sub') = user_id);

  create policy skills_owner on skills
    for all
    using ((auth.jwt() ->> 'sub') = user_id)
    with check ((auth.jwt() ->> 'sub') = user_id);

  create policy languages_owner on languages
    for all
    using ((auth.jwt() ->> 'sub') = user_id)
    with check ((auth.jwt() ->> 'sub') = user_id);

  create policy career_tracks_owner on career_tracks
    for all
    using ((auth.jwt() ->> 'sub') = user_id)
    with check ((auth.jwt() ->> 'sub') = user_id);

  create policy track_entries_owner on track_entries
    for all
    using ((auth.jwt() ->> 'sub') = user_id)
    with check ((auth.jwt() ->> 'sub') = user_id);

  create policy track_skills_owner on track_skills
    for all
    using ((auth.jwt() ->> 'sub') = user_id)
    with check ((auth.jwt() ->> 'sub') = user_id);

  -- Private storage bucket for profile photos.
  insert into storage.buckets (id, name, public)
  values ('profile-photos', 'profile-photos', false)
  on conflict (id) do nothing;

  -- Object path convention: "<user_id>/<filename>". The first path segment must be the owner's sub.
  -- storage.foldername(name) returns the path segments as a text[]; [1] is the top folder.
  create policy profile_photos_owner_read on storage.objects
    for select
    using (
      bucket_id = 'profile-photos'
      and (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
    );

  create policy profile_photos_owner_insert on storage.objects
    for insert
    with check (
      bucket_id = 'profile-photos'
      and (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
    );

  create policy profile_photos_owner_update on storage.objects
    for update
    using (
      bucket_id = 'profile-photos'
      and (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
    )
    with check (
      bucket_id = 'profile-photos'
      and (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
    );

  create policy profile_photos_owner_delete on storage.objects
    for delete
    using (
      bucket_id = 'profile-photos'
      and (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
    );
  ```

- [ ] **Step 4: Apply the migration to the local stack.**
  ```bash
  supabase migration up --local
  ```
  Expected output: ends with `Applying migration 0002_rls.sql...` and no error (exit 0).
  Verify RLS is on and policies exist. Capture the local stack's DB connection string into `$DB_URL`, then query with `psql`:
  ```bash
  export DB_URL="$(supabase status -o env | grep '^DB_URL=' | cut -d'"' -f2)"
  psql "$DB_URL" -c "select count(*) filter (where rowsecurity) as rls_tables from pg_tables where schemaname='public'; select count(*) as pub_policies from pg_policies where schemaname='public'; select count(*) as storage_policies from pg_policies where schemaname='storage' and tablename='objects';"
  ```
  Expected: `rls_tables = 9`, `pub_policies = 9`, `storage_policies = 4`.

- [ ] **Step 5: Write the per-identity Supabase client helper.**
  Create `tests/helpers/rls-clients.ts`:
  ```ts
  import { createClient, SupabaseClient } from '@supabase/supabase-js';
  import jwt from 'jsonwebtoken';
  import { execSync } from 'node:child_process';

  // Reads the running local stack's env via `supabase status -o env`.
  function stackEnv(): Record<string, string> {
    const raw = execSync('supabase status -o env', { encoding: 'utf8' });
    const out: Record<string, string> = {};
    for (const line of raw.split('\n')) {
      const m = line.match(/^([A-Z_]+)="?(.*?)"?$/);
      if (m) out[m[1]] = m[2];
    }
    return out;
  }

  const env = stackEnv();
  export const SUPABASE_URL = env.API_URL;
  export const ANON_KEY = env.ANON_KEY;
  const JWT_SECRET = env.JWT_SECRET;

  // Mint a Supabase-shaped HS256 JWT carrying the given Clerk-style `sub`.
  // RLS only reads `auth.jwt() ->> 'sub'`, so this stands in for a real Clerk token.
  export function mintToken(sub: string): string {
    const now = Math.floor(Date.now() / 1000);
    return jwt.sign(
      { sub, role: 'authenticated', aud: 'authenticated', iat: now, exp: now + 3600 },
      JWT_SECRET,
    );
  }

  // A client authenticated as `sub` — every request carries that user's JWT.
  export function clientAs(sub: string): SupabaseClient {
    return createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${mintToken(sub)}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  // A service-role client that bypasses RLS — used only to seed fixture rows.
  export function serviceClient(): SupabaseClient {
    return createClient(SUPABASE_URL, env.SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  ```

- [ ] **Step 6: Write the failing RLS isolation test (complete).**
  Create `tests/rls.test.ts`:
  ```ts
  import { describe, it, expect, beforeAll, afterAll } from 'vitest';
  import { clientAs, serviceClient } from './helpers/rls-clients';

  const A = 'user_a_' + Date.now();
  const B = 'user_b_' + Date.now();

  const svc = serviceClient();
  const asA = clientAs(A);
  const asB = clientAs(B);

  let bEntryId: string;

  beforeAll(async () => {
    // Seed both users + one entry each, bypassing RLS with the service role.
    await svc.from('users').insert([{ id: A }, { id: B }]);
    const { data, error } = await svc
      .from('entries')
      .insert([
        { user_id: A, kind: 'experience', title: 'A job' },
        { user_id: B, kind: 'experience', title: 'B job' },
      ])
      .select('id, user_id');
    if (error) throw error;
    bEntryId = data!.find((r) => r.user_id === B)!.id;
  });

  afterAll(async () => {
    await svc.from('users').delete().in('id', [A, B]); // cascades to entries
  });

  it('A reads only A rows, never B rows', async () => {
    const { data, error } = await asA.from('entries').select('id, user_id');
    expect(error).toBeNull();
    expect(data!.every((r) => r.user_id === A)).toBe(true);
    expect(data!.some((r) => r.user_id === B)).toBe(false);
  });

  it("A cannot select B's specific row (0 rows)", async () => {
    const { data, error } = await asA.from('entries').select('id').eq('id', bEntryId);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("A cannot update B's row (0 rows affected)", async () => {
    const { data, error } = await asA
      .from('entries')
      .update({ title: 'hijacked' })
      .eq('id', bEntryId)
      .select('id');
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
    // confirm B's title is untouched via service role
    const { data: check } = await svc.from('entries').select('title').eq('id', bEntryId).single();
    expect(check!.title).toBe('B job');
  });

  it("A cannot delete B's row (0 rows affected)", async () => {
    const { data, error } = await asA.from('entries').delete().eq('id', bEntryId).select('id');
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
    const { data: still } = await svc.from('entries').select('id').eq('id', bEntryId);
    expect(still).toHaveLength(1);
  });

  it('A cannot insert a row owned by B (RLS WITH CHECK rejects)', async () => {
    const { error } = await asA.from('entries').insert({ user_id: B, kind: 'experience', title: 'forged' }); expect(error).not.toBeNull();
  });

  it('B is independently isolated from A', async () => {
    const { data } = await asB.from('entries').select('user_id');
    expect(data!.every((r) => r.user_id === B)).toBe(true);
  });

  it('storage: A can upload under its own prefix but not under B\'s', async () => {
    const buf = Buffer.from('x');
    const own = await asA.storage.from('profile-photos').upload(`${A}/p.png`, buf, { upsert: true });
    expect(own.error).toBeNull();
    const cross = await asA.storage.from('profile-photos').upload(`${B}/p.png`, buf);
    expect(cross.error).not.toBeNull(); // storage policy: first path segment must equal sub
    await svc.storage.from('profile-photos').remove([`${A}/p.png`]); // cleanup via service role
  });
  ```
  Run it now (migration applied, but verifying the test exercises RLS):
  ```bash
  npm run test:rls
  ```
  Expected at this point: **FAIL** — temporarily comment out the `alter table entries enable row level security;` line in `0002_rls.sql`, re-run `supabase migration up --local` after `supabase db reset --local`, and the "0 rows" / "RLS WITH CHECK rejects" assertions FAIL (A sees B's row, insert succeeds). This proves the test actually depends on RLS. Expected failure excerpt:
  ```
  FAIL  tests/rls.test.ts > A cannot insert a row owned by B (RLS WITH CHECK rejects)
  AssertionError: expected null not to be null
  ```

- [ ] **Step 7: Restore RLS and run the test green.**
  Un-comment the `alter table entries enable row level security;` line in `0002_rls.sql`, then:
  ```bash
  supabase db reset --local && npm run test:rls
  ```
  Expected output: all 7 tests pass (6 row-level + 1 storage):
  ```
  Test Files  1 passed (1)
       Tests  7 passed (7)
  ```

- [ ] **Step 8: (Optional) Ad-hoc storage sanity check.**
  The own-vs-cross storage upload case is already covered by the committed `tests/rls.test.ts` (the `storage:` test) and ran green in Step 7. If you want a quick standalone confirmation outside Vitest, run it via `tsx` (node cannot `require` a `.ts` file directly):
  ```bash
  npx tsx -e "
  import { clientAs, serviceClient } from './tests/helpers/rls-clients';
  const a = clientAs('user_a_storage');
  const buf = Buffer.from('x');
  (async () => {
    const ok = await a.storage.from('profile-photos').upload('user_a_storage/p.png', buf, { upsert: true });
    console.log('own-upload error:', ok.error?.message ?? 'none');         // expect: none
    const bad = await a.storage.from('profile-photos').upload('user_b_storage/p.png', buf);
    console.log('cross-upload error:', bad.error?.message ?? 'none');      // expect: a policy/row-level error
    await serviceClient().storage.from('profile-photos').remove(['user_a_storage/p.png']);
    process.exit(bad.error ? 0 : 1);
  })();
  "
  ```
  Expected output: `own-upload error: none` then `cross-upload error: new row violates row-level security policy` (or similar non-empty error), exit 0.

- [ ] **Step 9: Commit.**
  ```bash
  git add supabase/migrations/0002_rls.sql tests/rls.test.ts tests/helpers/rls-clients.ts package.json package-lock.json
  git commit -m "feat(db): RLS policies on all tables + private profile-photos bucket with isolation test"
  ```

---

### Task 6: users upsert-on-login

**Files:**
- Create: `src/lib/auth/ensure-user.ts`
- Modify: `src/app/dashboard/layout.tsx`
- Test: `src/lib/auth/ensure-user.test.ts`

**Interfaces:**
- Consumes: `createServerSupabaseClient(): Promise<SupabaseClient<Database>>` (from `src/lib/supabase/server.ts`, Task 3); `auth()` from `@clerk/nextjs/server`
- Produces: `ensureUser(): Promise<void>` (upserts `users` row from Clerk auth(), idempotent)

---

- [ ] **Step 1: Write the failing test.**
  Create `src/lib/auth/ensure-user.test.ts`. It mocks Clerk `auth()` to a fixed `sub`, mocks the Supabase client to capture the upsert call, calls `ensureUser()` twice, and asserts the upsert is invoked with `onConflict: 'id'` and the correct row each time (idempotent at the SQL layer — `onConflict` makes the second call a no-op for row count). Full code:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const upsert = vi.fn().mockResolvedValue({ error: null });
const from = vi.fn(() => ({ upsert }));
const authMock = vi.fn();

vi.mock('@clerk/nextjs/server', () => ({
  auth: () => authMock(),
}));
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: async () => ({ from }),
}));

import { ensureUser } from './ensure-user';

describe('ensureUser', () => {
  beforeEach(() => {
    upsert.mockClear();
    from.mockClear();
    authMock.mockReset();
  });

  it('upserts the users row keyed on id with onConflict', async () => {
    authMock.mockResolvedValue({ userId: 'user_abc' });
    await ensureUser();

    expect(from).toHaveBeenCalledWith('users');
    expect(upsert).toHaveBeenCalledWith(
      { id: 'user_abc' },
      { onConflict: 'id', ignoreDuplicates: true },
    );
  });

  it('is idempotent: calling twice issues an upsert each time, both keyed on id', async () => {
    authMock.mockResolvedValue({ userId: 'user_abc' });
    await ensureUser();
    await ensureUser();

    expect(upsert).toHaveBeenCalledTimes(2);
    for (const call of upsert.mock.calls) {
      expect(call[0]).toEqual({ id: 'user_abc' });
      expect(call[1]).toEqual({ onConflict: 'id', ignoreDuplicates: true });
    }
  });

  it('no-ops when there is no authenticated user', async () => {
    authMock.mockResolvedValue({ userId: null });
    await ensureUser();
    expect(from).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test, expect FAIL.**
  Run: `npx vitest run src/lib/auth/ensure-user.test.ts`
  Expected: FAIL — `Failed to resolve import "./ensure-user"` (the module does not exist yet).

- [ ] **Step 3: Implement `ensureUser`.**
  Create `src/lib/auth/ensure-user.ts`. Relies on the column defaults from migration 0001 (`default_locale 'en-GB'`, `plan 'free'`) so the insert sends only `id`. `ignoreDuplicates: true` makes the row insert idempotent and avoids needlessly bumping a row that already exists. Full code:

```ts
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Upserts the Clerk-identified user into the `users` table on first
 * authenticated request. Idempotent: relies on the `users.id` primary key
 * with onConflict, and on DB column defaults for default_locale/plan.
 * ponytail: insert-only via ignoreDuplicates; no row-version churn on repeat logins.
 */
export async function ensureUser(): Promise<void> {
  const { userId } = await auth();
  if (!userId) return;

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from('users')
    .upsert({ id: userId }, { onConflict: 'id', ignoreDuplicates: true });

  if (error) throw error;
}
```

- [ ] **Step 4: Run the test, expect PASS.**
  Run: `npx vitest run src/lib/auth/ensure-user.test.ts`
  Expected: PASS — `3 passed (3)`.

- [ ] **Step 5: Call `ensureUser` in the dashboard layout.**
  Modify `src/app/dashboard/layout.tsx` so every dashboard load guarantees the `users` row exists before any child page runs a query. The layout is a Server Component; await `ensureUser()` before rendering children. Full file:

```tsx
import { ensureUser } from '@/lib/auth/ensure-user';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await ensureUser();
  return <>{children}</>;
}
```

- [ ] **Step 6: Verify typecheck and full test run.**
  Run: `npx tsc --noEmit && npx vitest run src/lib/auth/ensure-user.test.ts`
  Expected: no TypeScript errors, then `3 passed (3)`.

- [ ] **Step 7: Manual smoke verification (after `npm run dev` and Clerk sign-in).**
  With the dev server running and a signed-in session, load `/dashboard` once, then reload. In the Supabase SQL editor run:
  `select count(*) from users where id = '<your_clerk_sub>';`
  Expected output: `1` on first load and still `1` after reload (second load is a no-op).
  > VERSION NOTE: confirm the Clerk v6 `auth()` return shape (`{ userId }`) and the `@supabase/ssr` accessToken wiring in `createServerSupabaseClient` against installed package versions at execution; adjust the mock in Step 1 if `auth()` is non-async in the pinned version.

- [ ] **Step 8: Commit.**
  Run: `git add src/lib/auth/ensure-user.ts src/lib/auth/ensure-user.test.ts src/app/dashboard/layout.tsx && git commit -m "feat(auth): upsert users row on dashboard load via ensureUser"`

---

### Task 7: Observability (Sentry + PostHog)

**Files:**
- Create: `sentry.client.config.ts`
- Create: `sentry.server.config.ts`
- Create: `sentry.edge.config.ts`
- Create: `src/instrumentation.ts`
- Create: `src/lib/posthog/server.ts`
- Create: `src/components/posthog-provider.tsx`
- Create: `src/app/sentry-test/route.ts` (throwaway verification route handler)
- Modify: `next.config.ts` (wrap with `withSentryConfig`)
- Modify: `src/app/layout.tsx` (mount `<PostHogProvider>`)
- Modify: `src/app/dashboard/page.tsx` (one server-side capture on load)
- Modify: `.env.example`
- Test: `src/lib/posthog/server.test.ts`

**Interfaces:**
- Consumes: `createServerSupabaseClient()` is unrelated here; this task consumes only env vars `SENTRY_DSN`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`, `POSTHOG_API_KEY`.
- Produces:
  - `getPostHogServer(): PostHog`  (memoized posthog-node client)
  - `<PostHogProvider>{children}</PostHogProvider>`  (client provider, auto pageviews)

> VERSION NOTE: `@sentry/nextjs` ^8 and `posthog-js`/`posthog-node` APIs are version-sensitive. Confirm against installed versions at execution: `npm ls @sentry/nextjs posthog-js posthog-node`. The Sentry instrumentation-hook split (`instrumentation.ts` + `*.config.ts`) is the v8 pattern; if v9+ is installed, fold server/edge config into `instrumentation.ts`'s `register()`.

---

- [ ] **Step 1: Install deps.** Run:
  ```bash
  npm install @sentry/nextjs@^8 posthog-js posthog-node
  ```
  Verify they resolved:
  ```bash
  npm ls @sentry/nextjs posthog-js posthog-node
  ```
  Expected: three lines printing resolved versions (e.g. `@sentry/nextjs@8.x.x`, `posthog-js@1.x.x`, `posthog-node@4.x.x`), no `UNMET DEPENDENCY`.

- [ ] **Step 2: Add env vars to `.env.example`.** Append:
  ```bash
  # Sentry
  SENTRY_DSN=
  NEXT_PUBLIC_SENTRY_DSN=

  # PostHog
  NEXT_PUBLIC_POSTHOG_KEY=
  NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
  POSTHOG_API_KEY=
  ```
  Verify:
  ```bash
  grep -c POSTHOG .env.example
  ```
  Expected output: `3`

- [ ] **Step 3: Sentry client config.** Create `sentry.client.config.ts`:
  ```ts
  import * as Sentry from '@sentry/nextjs';

  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
    enabled: process.env.NODE_ENV === 'production',
  });
  ```

- [ ] **Step 4: Sentry server config.** Create `sentry.server.config.ts`:
  ```ts
  import * as Sentry from '@sentry/nextjs';

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
    enabled: process.env.NODE_ENV === 'production',
  });
  ```

- [ ] **Step 5: Sentry edge config.** Create `sentry.edge.config.ts`:
  ```ts
  import * as Sentry from '@sentry/nextjs';

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
    enabled: process.env.NODE_ENV === 'production',
  });
  ```

- [ ] **Step 6: Instrumentation hook.** Create `src/instrumentation.ts`:
  ```ts
  export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
      await import('../sentry.server.config');
    }
    if (process.env.NEXT_RUNTIME === 'edge') {
      await import('../sentry.edge.config');
    }
  }

  export { captureRequestError as onRequestError } from '@sentry/nextjs';
  ```

- [ ] **Step 7: Wrap `next.config.ts` with Sentry.** Replace the file's export with:
  ```ts
  import type { NextConfig } from 'next';
  import { withSentryConfig } from '@sentry/nextjs';

  const nextConfig: NextConfig = {};

  export default withSentryConfig(nextConfig, {
    // ponytail: silent in CI, source-map upload only needs org/project + auth token in env
    silent: !process.env.CI,
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    widenClientFileUpload: true,
    tunnelRoute: '/monitoring',
    disableLogger: true,
  });
  ```
  (If `next.config.ts` already has fields from an earlier task, merge them into the `nextConfig` object rather than overwriting.)

- [ ] **Step 8: Write the failing test for the server client (TDD red).** Create `src/lib/posthog/server.test.ts`:
  ```ts
  import { describe, it, expect, vi } from 'vitest';

  vi.mock('posthog-node', () => ({
    PostHog: vi.fn().mockImplementation(() => ({ capture: vi.fn() })),
  }));

  import { PostHog } from 'posthog-node';
  import { getPostHogServer } from './server';

  describe('getPostHogServer', () => {
    it('returns the same instance on repeated calls (memoized)', () => {
      const a = getPostHogServer();
      const b = getPostHogServer();
      expect(a).toBe(b);
      expect(PostHog).toHaveBeenCalledTimes(1);
    });
  });
  ```

- [ ] **Step 9: Run the test, expect FAIL.** `src/lib/posthog/server.ts` does not exist yet, so the import cannot resolve. Run:
  ```bash
  npx vitest run src/lib/posthog/server.test.ts
  ```
  Expected: FAIL — `Failed to resolve import "./server"` / `1 failed`.

- [ ] **Step 10: Implement the PostHog server client.** Create `src/lib/posthog/server.ts`:
  ```ts
  import { PostHog } from 'posthog-node';

  let client: PostHog | null = null;

  export function getPostHogServer(): PostHog {
    if (!client) {
      client = new PostHog(process.env.POSTHOG_API_KEY ?? '', {
        host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com',
        flushAt: 1,
        flushInterval: 0,
      });
    }
    return client;
  }
  ```

- [ ] **Step 11: Run the test, expect PASS.** With `src/lib/posthog/server.ts` in place, run:
  ```bash
  npx vitest run src/lib/posthog/server.test.ts
  ```
  Expected output: `1 passed` and `PostHog` constructed exactly once.

- [ ] **Step 12: PostHog browser provider.** Create `src/components/posthog-provider.tsx`:
  ```tsx
  'use client';

  import { useEffect } from 'react';
  import posthog from 'posthog-js';
  import { PostHogProvider as PHProvider } from 'posthog-js/react';

  export function PostHogProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
      const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
      if (!key) return; // ponytail: no key in dev -> no-op, never throws
      posthog.init(key, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com',
        capture_pageview: true,
        capture_pageleave: true,
      });
    }, []);

    return <PHProvider client={posthog}>{children}</PHProvider>;
  }
  ```

- [ ] **Step 13: Mount provider in root layout.** In `src/app/layout.tsx`, wrap the body's children:
  ```tsx
  import { PostHogProvider } from '@/components/posthog-provider';
  ```
  and inside `<body>`:
  ```tsx
  <body>
    <PostHogProvider>{children}</PostHogProvider>
  </body>
  ```
  (If `<ClerkProvider>` from an earlier task wraps the tree, place `<PostHogProvider>` *inside* `<ClerkProvider>` so it has access to session context.)

- [ ] **Step 14: Wire one server-side capture on dashboard load.** In `src/app/dashboard/page.tsx`, add at the top of the async server component, after the auth/user is resolved:
  ```tsx
  import { auth } from '@clerk/nextjs/server';
  import { getPostHogServer } from '@/lib/posthog/server';

  export default async function DashboardPage() {
    const { userId } = await auth();
    if (userId) {
      const ph = getPostHogServer();
      ph.capture({ distinctId: userId, event: 'dashboard_viewed' });
      await ph.flush();
    }
    // ...existing dashboard render
  }
  ```
  (Add the two `import` lines at the TOP of the file with the other imports — never appended at the bottom. Merge the capture into the existing dashboard component body; do not duplicate the default export.)

- [ ] **Step 15: Throwaway Sentry test route.** Create `src/app/sentry-test/route.ts`:
  ```ts
  // ponytail: temporary verification endpoint — delete after confirming Sentry receives the event
  export function GET() {
    throw new Error('Sentry test error — Task 7 verification');
  }
  ```

- [ ] **Step 16: Manual dashboard setup (Sentry).** In the Sentry dashboard: create a Next.js project, copy its DSN into local `.env.local` as both `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN`. Create an auth token (Settings → Auth Tokens, scope `project:releases`) and set `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` in `.env.local`. (Source-map upload is skipped in dev because `enabled` is gated to production in the config files.)

- [ ] **Step 17: Manual dashboard setup (PostHog).** In the PostHog dashboard (EU cloud): copy the Project API Key into `.env.local` as `NEXT_PUBLIC_POSTHOG_KEY`, set `NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com`, and create a Personal API Key for server capture as `POSTHOG_API_KEY`.

- [ ] **Step 18: Boot the app, confirm no init errors.** Run:
  ```bash
  npm run dev
  ```
  Expected: server starts (`Ready in ...`), no `Sentry.init` / `posthog.init` errors and no unhandled exceptions in the terminal. Open `http://localhost:3000` — browser console shows no PostHog/Sentry init errors.

- [ ] **Step 19: Verify PostHog (client pageview + server event).** With the app running and a user signed in, visit the dashboard. In the PostHog dashboard → Activity → Live events, look for: a `$pageview` event (client, from the provider) and a `dashboard_viewed` event whose `distinct_id` equals the Clerk `userId` (server, from Step 14), both within ~30s.

- [ ] **Step 20: Verify Sentry.** Temporarily flip the config files' `enabled` to `true` (or run a production build: `npm run build && npm run start`), then hit `http://localhost:3000/sentry-test`. Expected: the request 500s with `Sentry test error — Task 7 verification`, and within ~1 min that exact error appears in the Sentry dashboard → Issues with a server-side stack trace. Revert the `enabled` flip afterward and delete `src/app/sentry-test/route.ts`.

- [ ] **Step 21: Commit.** Run:
  ```bash
  git add sentry.client.config.ts sentry.server.config.ts sentry.edge.config.ts \
    src/instrumentation.ts next.config.ts src/lib/posthog/server.ts \
    src/lib/posthog/server.test.ts src/components/posthog-provider.tsx \
    src/app/layout.tsx src/app/dashboard/page.tsx .env.example
  git commit -m "feat(observability): wire Sentry and PostHog (client + server)"
  ```

---

### Task 8: Vercel deploy

**Files:**
- Optional create: `vercel.json` (only if a build/route override is actually needed; otherwise no code change — Next.js auto-detects on Vercel)
- Verify: production deploy is reachable and `/dashboard` redirects to Clerk sign-in when signed out (INFRA — manual dashboard steps + curl verification, no unit test)

**Interfaces:**
- Consumes: the full app from Tasks 1–7 (Clerk auth + middleware, Supabase clients, schema/RLS, `ensureUser`, Sentry/PostHog) and the committed `.env.example` (Task 2 onward) as the canonical list of env vars to set in Vercel.
- Produces: a live production URL on Vercel serving the app, with all secrets configured in the Vercel project. No code interface.

> Spec §3 ("Next.js (App Router) app deployed to Vercel") and §7 ("Next.js App Router on Vercel") require this. This is the deploy gate for Phase 0.

---

- [ ] **Step 1: Push the repo to GitHub.** Ensure all Task 1–7 commits are on `main` (or your default branch) and pushed to a GitHub remote — Vercel imports from GitHub. Verify:
  ```bash
  git remote -v && git status --short
  ```
  Expected: an `origin` GitHub URL is listed and the working tree is clean (no uncommitted changes). If there is no remote yet, create the repo (`gh repo create` or via github.com) and `git push -u origin main`.

- [ ] **Step 2: Manual — import the project into Vercel.** In the Vercel dashboard (https://vercel.com/new): "Add New… → Project" → "Import Git Repository" → select this GitHub repo → "Import". Leave the auto-detected framework preset (**Next.js**), root directory `.`, and default build/output settings. Do NOT click Deploy yet — set env vars first (Step 3).

- [ ] **Step 3: Manual — set production environment variables.** In the Vercel project → Settings → Environment Variables, add each of the following for the **Production** environment (paste the real values from your Clerk / Supabase / Sentry / PostHog dashboards — the same keys documented in `.env.example`):
  ```
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  CLERK_SECRET_KEY
  NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
  NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY
  SENTRY_DSN
  NEXT_PUBLIC_SENTRY_DSN
  SENTRY_ORG
  SENTRY_PROJECT
  SENTRY_AUTH_TOKEN
  NEXT_PUBLIC_POSTHOG_KEY
  NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
  POSTHOG_API_KEY
  ```
  Use production Clerk keys (`pk_live_`/`sk_live_`) if you have promoted the Clerk instance to production; the `pk_test_`/`sk_test_` dev keys also work for an initial deploy. Save.

- [ ] **Step 4: Manual — trigger the production deploy.** Click "Deploy" (or, if the project was already created, Deployments → "Redeploy" the latest commit to Production). Wait for the build to finish. Expected: the build log ends with "Build Completed" / "Deployment Ready" and Vercel shows a green Production deployment with a URL like `https://<project>.vercel.app`. If the build fails on a missing env var, add it in Step 3 and redeploy.

- [ ] **Step 5: Verify the deployed URL returns 200.** Capture the production URL into a shell var and curl the root:
  ```bash
  export PROD_URL="https://<project>.vercel.app"
  curl -sS -o /dev/null -w "%{http_code}\n" "$PROD_URL"
  ```
  Expected output: `200`.

- [ ] **Step 6: Verify `/dashboard` redirects to Clerk sign-in when signed out.** Without auth cookies, the Task 2 middleware must redirect a protected route to sign-in:
  ```bash
  curl -sS -o /dev/null -w "%{http_code} %{redirect_url}\n" "$PROD_URL/dashboard"
  ```
  Expected output: a `3xx` status (e.g. `307`) with a `redirect_url` pointing at the Clerk sign-in route (contains `sign-in` or `clerk`). Confirm in a real signed-out incognito browser too: visiting `$PROD_URL/dashboard` lands on the Clerk sign-in form, and after signing in it lands on `/dashboard`.

- [ ] **Step 7: Commit.** This task is normally code-free (Vercel auto-detects Next.js — no `vercel.json` needed). If you added a `vercel.json` for a build/route override, commit it:
  ```bash
  git add vercel.json && git commit -m "chore(deploy): add Vercel config for production deploy"
  ```
  Otherwise there is no code change to commit — note in the deploy log that Phase 0 is live and record the production URL.

---
