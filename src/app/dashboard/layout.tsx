import Link from 'next/link';
import type { ReactNode } from 'react';
import { ensureUser } from '@/lib/auth/ensure-user';

const NAV = [
  { href: '/dashboard/profile', label: 'Profile' },
  { href: '/dashboard/entries', label: 'Entries' },
  { href: '/dashboard/skills', label: 'Skills' },
  { href: '/dashboard/languages', label: 'Languages' },
  { href: '/dashboard/tracks', label: 'Career Tracks' },
] as const;

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  await ensureUser();
  return (
    <div className="flex min-h-screen">
      <nav
        aria-label="Profile sections"
        className="w-56 shrink-0 border-r border-gray-200 p-4"
      >
        <ul className="space-y-1">
          {NAV.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="block rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
