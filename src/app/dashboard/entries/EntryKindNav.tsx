'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ENTRY_KINDS, KIND_LABELS, type EntryKind } from '@/lib/db/entry-kinds';

export default function EntryKindNav({ activeKind }: { activeKind?: EntryKind }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Entry categories"
      className="flex gap-1 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]"
    >
      <Link
        href="/dashboard/entries"
        aria-current={pathname === '/dashboard/entries' ? 'page' : undefined}
        className="app-nav-link whitespace-nowrap !py-1.5 text-[0.82rem]"
      >
        All
      </Link>
      {ENTRY_KINDS.map((kind) => {
        const href = `/dashboard/entries/${kind}`;
        const active = activeKind === kind || pathname === href;
        return (
          <Link
            key={kind}
            href={href}
            aria-current={active ? 'page' : undefined}
            className="app-nav-link whitespace-nowrap !py-1.5 text-[0.82rem]"
          >
            {KIND_LABELS[kind]}
          </Link>
        );
      })}
    </nav>
  );
}
