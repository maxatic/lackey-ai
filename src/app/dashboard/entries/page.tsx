import Link from 'next/link';
import { ArrowRight } from '@phosphor-icons/react/dist/ssr';
import {
  listEntries, ENTRY_KINDS, KIND_LABELS, KIND_DESCRIPTIONS,
} from '@/lib/db/entries';
import EntryKindNav from './EntryKindNav';

export const dynamic = 'force-dynamic';

export default async function EntriesPage() {
  const entries = await listEntries();

  const counts = new Map<string, number>();
  for (const e of entries) {
    counts.set(e.kind, (counts.get(e.kind) ?? 0) + 1);
  }

  return (
    <div className="max-w-2xl space-y-8">
      <header className="space-y-4">
        <div>
          <p className="kicker">Your skeleton</p>
          <h1 className="app-title mt-2">Entries</h1>
          <p className="app-subtitle">
            Work, education and projects. Each entry carries its own achievement
            bullets, which Lackey reorders and rewords per job.
          </p>
        </div>
        <EntryKindNav />
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {ENTRY_KINDS.map((kind) => {
          const count = counts.get(kind) ?? 0;
          const label = KIND_LABELS[kind];
          return (
            <Link
              key={kind}
              href={`/dashboard/entries/${kind}`}
              className="app-card group flex flex-col p-5 transition-transform duration-200 hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="section-title">{label}</p>
                <span className="font-display tabular text-xl font-semibold text-[var(--ink)]">
                  {count}
                </span>
              </div>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--ink-soft)]">
                {KIND_DESCRIPTIONS[kind]}
              </p>
              <span className="action-link mt-4 inline-flex items-center gap-1 no-underline">
                Manage
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
