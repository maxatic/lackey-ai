import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowUpLeft } from '@phosphor-icons/react/dist/ssr';
import { ensureUser } from '@/lib/auth/ensure-user';
import { LOCAL_USER_NAME } from '@/lib/auth/local-user';
import { Logo } from '@/components/marketing/logo';
import { AppNav, AppNavMobile } from '@/components/app-nav';

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  await ensureUser();
  return (
    <div data-app className="min-h-dvh lg:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col justify-between overflow-y-auto border-r border-[var(--line)] px-4 py-6 lg:flex">
        <div>
          <Link href="/dashboard" aria-label="Lackey AI dashboard" className="px-3">
            <Logo />
          </Link>
          <AppNav />
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-[var(--line)] px-3 pt-5">
          <span className="truncate text-sm font-medium text-[var(--ink)]">{LOCAL_USER_NAME}</span>
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)]"
          >
            <ArrowUpLeft className="h-3.5 w-3.5" />
            Back to site
          </Link>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--paper)]/90 backdrop-blur-md lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/dashboard" aria-label="Lackey AI dashboard">
            <Logo className="[&>span:last-child]:text-[1.15rem] [&>svg]:h-7 [&>svg]:w-7" />
          </Link>
          <span className="truncate text-sm font-medium text-[var(--ink-soft)]">{LOCAL_USER_NAME}</span>
        </div>
        <AppNavMobile />
      </header>

      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8 lg:py-12">
          {children}
        </div>
      </main>
    </div>
  );
}
