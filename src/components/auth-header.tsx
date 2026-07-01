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
export function AuthHeader() {
  return (
    <header data-app-header className="flex justify-end items-center gap-4 p-4 h-16">
      <SignedOut>
        <SignInButton />
        <SignUpButton />
      </SignedOut>
      <SignedIn>
        <UserButton />
      </SignedIn>
    </header>
  );
}
