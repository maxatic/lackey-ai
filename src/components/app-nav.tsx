'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SquaresFour,
  UserCircle,
  Briefcase,
  Sparkle,
  Translate,
  Path,
  ClipboardText,
  type Icon,
} from '@phosphor-icons/react';

type NavItem = { href: string; label: string; icon: Icon };

const GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Workspace',
    items: [{ href: '/dashboard', label: 'Overview', icon: SquaresFour }],
  },
  {
    label: 'Your skeleton',
    items: [
      { href: '/dashboard/profile', label: 'Profile', icon: UserCircle },
      { href: '/dashboard/entries', label: 'Entries', icon: Briefcase },
      { href: '/dashboard/skills', label: 'Skills', icon: Sparkle },
      { href: '/dashboard/languages', label: 'Languages', icon: Translate },
    ],
  },
  {
    label: 'Applications',
    items: [
      { href: '/dashboard/tracks', label: 'Career tracks', icon: Path },
      { href: '/dashboard/jobs', label: 'Jobs', icon: ClipboardText },
    ],
  },
];

function isActive(pathname: string, href: string) {
  return href === '/dashboard'
    ? pathname === '/dashboard'
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Dashboard" className="mt-8 flex flex-col gap-7">
      {GROUPS.map((group) => (
        <div key={group.label}>
          <p className="kicker px-3">{group.label}</p>
          <ul className="mt-2 space-y-0.5">
            {group.items.map(({ href, label, icon: IconEl }) => (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={isActive(pathname, href) ? 'page' : undefined}
                  className="app-nav-link"
                >
                  <IconEl className="h-[1.1rem] w-[1.1rem] shrink-0" weight="duotone" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/* Flat horizontal strip for small screens. */
export function AppNavMobile() {
  const pathname = usePathname();
  const items = GROUPS.flatMap((g) => g.items);
  return (
    <nav
      aria-label="Dashboard"
      className="flex gap-1 overflow-x-auto px-4 pb-2 [-webkit-overflow-scrolling:touch]"
    >
      {items.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          aria-current={isActive(pathname, href) ? 'page' : undefined}
          className="app-nav-link whitespace-nowrap !py-1.5 text-[0.82rem]"
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
