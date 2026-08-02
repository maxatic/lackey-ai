'use client';

import Link from 'next/link';
import { LOCAL_USER_NAME } from '@/lib/auth/local-user';

// Hidden via CSS on marketing / dashboard routes, which bring their own chrome.
export function AuthHeader() {
  return (
    <header
      data-app-header
      className="flex h-16 items-center justify-end gap-3 px-5"
    >
      <span className="text-sm font-medium text-[var(--ink-soft)]">{LOCAL_USER_NAME}</span>
      <Link
        href="/dashboard"
        className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-ink)]"
      >
        Dashboard
      </Link>
    </header>
  );
}
