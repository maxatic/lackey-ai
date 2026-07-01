'use client';

import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/nextjs';

// Client component so Clerk control components read auth from ClerkProvider
// context instead of calling server-side auth(), which throws on routes the
// middleware matcher excludes (e.g. /_not-found for asset-like 404s).
// Hidden via CSS on marketing / dashboard / auth routes, which bring their own chrome.
export function AuthHeader() {
  return (
    <header
      data-app-header
      className="flex h-16 items-center justify-end gap-3 px-5"
    >
      <SignedOut>
        <SignInButton>
          <button className="rounded-full px-4 py-2 text-sm font-medium text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)]">
            Sign in
          </button>
        </SignInButton>
        <SignUpButton>
          <button className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-ink)]">
            Start free
          </button>
        </SignUpButton>
      </SignedOut>
      <SignedIn>
        <UserButton />
      </SignedIn>
    </header>
  );
}
