import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import * as Sentry from '@sentry/nextjs';
import {
  UserCircle,
  Briefcase,
  Sparkle,
  Translate,
  Path,
  ClipboardText,
  ArrowRight,
} from '@phosphor-icons/react/dist/ssr';
import { getPostHogServer } from '@/lib/posthog/server';
import { getProfile } from '@/lib/db/profile';
import { listEntries } from '@/lib/db/entries';
import { listSkills } from '@/lib/db/skills';
import { listLanguages } from '@/lib/db/languages';
import { listTracks } from '@/lib/db/tracks';
import { listJobs } from '@/lib/db/jobs';

export default async function DashboardPage() {
  const { userId } = await auth();
  if (userId) {
    // ponytail: telemetry must never crash the page — report and move on.
    try {
      const ph = getPostHogServer();
      ph.capture({ distinctId: userId, event: 'dashboard_viewed' });
      await ph.flush();
    } catch (err) {
      Sentry.captureException(err);
    }
  }

  const [profile, entries, skills, languages, tracks, jobs] = await Promise.all([
    getProfile(),
    listEntries(),
    listSkills(),
    listLanguages(),
    listTracks(),
    listJobs(),
  ]);

  const firstName = profile?.full_name?.split(' ')[0];

  const SECTIONS = [
    {
      href: '/dashboard/entries',
      icon: Briefcase,
      label: 'Entries',
      count: entries.length,
      blurb: 'Work, education and projects — the raw material of every CV.',
    },
    {
      href: '/dashboard/skills',
      icon: Sparkle,
      label: 'Skills',
      count: skills.length,
      blurb: 'What you are good at, ready to be reordered per job.',
    },
    {
      href: '/dashboard/languages',
      icon: Translate,
      label: 'Languages',
      count: languages.length,
      blurb: 'CEFR levels, shown the way each country expects.',
    },
    {
      href: '/dashboard/tracks',
      icon: Path,
      label: 'Career tracks',
      count: tracks.length,
      blurb: 'A curated angle on your profile — one per role you pursue.',
    },
    {
      href: '/dashboard/jobs',
      icon: ClipboardText,
      label: 'Jobs',
      count: jobs.length,
      blurb: 'Paste a job description, get a CV tailored to it.',
    },
  ] as const;

  return (
    <div>
      <p className="kicker">Overview</p>
      <h1 className="app-title mt-2">
        {firstName ? `Welcome back, ${firstName}.` : 'Welcome to your workspace.'}
      </h1>
      <p className="app-subtitle">
        Everything here is derived from one profile — your Skeleton. Keep it
        current, and every CV and cover letter stays current with it.
      </p>

      {/* Profile card gets its own row — it is the source of truth. */}
      <Link
        href="/dashboard/profile"
        className="app-card group mt-8 flex items-center justify-between gap-4 p-5 transition-transform duration-200 hover:-translate-y-0.5"
      >
        <div className="flex items-center gap-4">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-[var(--accent-tint)]">
            <UserCircle className="h-6 w-6 text-[var(--accent-ink)]" weight="duotone" />
          </span>
          <div>
            <p className="section-title">Profile</p>
            <p className="mt-0.5 text-sm text-[var(--ink-soft)]">
              {profile?.full_name
                ? `${profile.full_name}${profile.headline ? ` · ${profile.headline}` : ''}`
                : 'Start here — add your name, headline and contact details.'}
            </p>
          </div>
        </div>
        <ArrowRight className="h-5 w-5 shrink-0 text-[var(--ink-soft)] transition-transform duration-200 group-hover:translate-x-1" />
      </Link>

      <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
        {SECTIONS.map(({ href, icon: Icon, label, count, blurb }) => (
          <Link
            key={href}
            href={href}
            className="app-card group flex flex-col p-5 transition-transform duration-200 hover:-translate-y-0.5"
          >
            <div className="flex items-start justify-between">
              <Icon className="h-6 w-6 text-[var(--accent)]" weight="duotone" />
              <span className="font-display tabular text-2xl font-semibold text-[var(--ink)]">
                {count}
              </span>
            </div>
            <p className="section-title mt-4">{label}</p>
            <p className="mt-1 flex-1 text-sm leading-relaxed text-[var(--ink-soft)]">
              {blurb}
            </p>
            <span className="action-link mt-4 inline-flex items-center gap-1 no-underline">
              Open
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
