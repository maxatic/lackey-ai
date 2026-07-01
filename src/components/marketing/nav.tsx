'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SignedIn, SignedOut } from '@clerk/nextjs';
import { List, X, ArrowRight } from '@phosphor-icons/react';
import { Logo } from './logo';

const LINKS = [
  { href: '#formats', label: 'EU formats' },
  { href: '#how', label: 'How it works' },
  { href: '#features', label: 'Features' },
  { href: '#pricing', label: 'Pricing' },
];

export function MarketingNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="sticky top-0 z-50">
      <nav className="border-b border-[var(--line)]/70 bg-[var(--paper)]/85 backdrop-blur-md">
        <div className="mx-auto flex h-[68px] max-w-[1200px] items-center justify-between px-5 sm:px-8">
          <Link href="/" aria-label="Lackey AI home" className="shrink-0">
            <Logo />
          </Link>

          {/* Desktop links — single line */}
          <div className="hidden items-center gap-8 lg:flex">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-[0.95rem] font-medium text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)]"
              >
                {l.label}
              </a>
            ))}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden items-center gap-3 lg:flex">
            <SignedOut>
              <Link
                href="/sign-in"
                className="rounded-full px-4 py-2 text-[0.95rem] font-medium text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)]"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="group inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-5 py-2.5 text-[0.95rem] font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.25)_inset,0_8px_20px_-8px_rgba(46,92,70,0.55)] transition-all duration-200 hover:bg-[var(--accent-ink)] active:translate-y-px"
              >
                Start free
                <ArrowRight
                  weight="bold"
                  className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </Link>
            </SignedOut>
            <SignedIn>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-5 py-2.5 text-[0.95rem] font-semibold text-white transition-all duration-200 hover:bg-[var(--accent-ink)] active:translate-y-px"
              >
                Go to dashboard
                <ArrowRight weight="bold" className="h-4 w-4" />
              </Link>
            </SignedIn>
          </div>

          {/* Mobile toggle */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--ink)] transition-colors hover:bg-[var(--paper-2)] lg:hidden"
          >
            {open ? <X size={24} weight="bold" /> : <List size={24} weight="bold" />}
          </button>
        </div>

        {/* Mobile panel */}
        {open && (
          <div className="border-t border-[var(--line)]/70 bg-[var(--paper)] px-5 pb-6 pt-2 lg:hidden">
            <div className="flex flex-col">
              {LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="border-b border-[var(--line)]/60 py-3.5 text-lg font-medium text-[var(--ink)]"
                >
                  {l.label}
                </a>
              ))}
            </div>
            <div className="mt-5 flex flex-col gap-3">
              <SignedOut>
                <Link
                  href="/sign-up"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[var(--accent)] px-5 py-3 text-base font-semibold text-white"
                >
                  Start free
                  <ArrowRight weight="bold" className="h-4 w-4" />
                </Link>
                <Link
                  href="/sign-in"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center justify-center rounded-full border border-[var(--line)] px-5 py-3 text-base font-medium text-[var(--ink)]"
                >
                  Sign in
                </Link>
              </SignedOut>
              <SignedIn>
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[var(--accent)] px-5 py-3 text-base font-semibold text-white"
                >
                  Go to dashboard
                  <ArrowRight weight="bold" className="h-4 w-4" />
                </Link>
              </SignedIn>
            </div>
          </div>
        )}
      </nav>
    </div>
  );
}
