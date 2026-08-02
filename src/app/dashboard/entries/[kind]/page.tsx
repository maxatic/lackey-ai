import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  listEntries, KIND_LABELS, KIND_DESCRIPTIONS, isEntryKind, type EntryKind,
} from '@/lib/db/entries';
import { createEntryAction, updateEntryAction, deleteEntryAction } from '../actions';
import EntryForm from '../EntryForm';
import EntryKindNav from '../EntryKindNav';

export const dynamic = 'force-dynamic';

export function generateStaticParams() {
  return [
    { kind: 'experience' },
    { kind: 'education' },
    { kind: 'project' },
    { kind: 'certification' },
    { kind: 'award' },
    { kind: 'publication' },
    { kind: 'volunteering' },
  ];
}

export default async function EntryKindPage({
  params,
  searchParams,
}: {
  params: Promise<{ kind: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { kind: kindParam } = await params;
  if (!isEntryKind(kindParam)) notFound();
  const kind = kindParam as EntryKind;

  const { edit } = await searchParams;
  const entries = await listEntries(kind);
  const label = KIND_LABELS[kind];
  const description = KIND_DESCRIPTIONS[kind];

  return (
    <div className="max-w-2xl space-y-8">
      <header className="space-y-4">
        <div>
          <p className="kicker">Your skeleton</p>
          <h1 className="app-title mt-2">{label}</h1>
          <p className="app-subtitle">{description}</p>
        </div>
        <EntryKindNav activeKind={kind} />
      </header>

      {entries.length === 0 && (
        <div className="empty-state">
          No {label.toLowerCase()} entries yet. Add your first one below.
        </div>
      )}

      {entries.length > 0 && (
        <section>
          <h2 className="section-title">Your {label.toLowerCase()}</h2>
          <div className="app-card mt-3 overflow-hidden">
            {entries.map((entry) =>
              edit === entry.id ? (
                <div key={entry.id} className="border-t border-[var(--line)]/60 p-4 first:border-t-0">
                  <EntryForm
                    entry={entry}
                    fixedKind={kind}
                    action={updateEntryAction}
                    submitLabel="Save"
                  />
                </div>
              ) : (
                <div key={entry.id} className="app-row">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--ink)]">
                      {entry.title}
                    </p>
                    {entry.organization && (
                      <p className="truncate text-sm text-[var(--ink-soft)]">
                        {entry.organization}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Link href={`/dashboard/entries/item/${entry.id}`} className="action-link">
                      Bullets
                    </Link>
                    <Link href={`/dashboard/entries/${kind}?edit=${entry.id}`} className="action-link">
                      Edit
                    </Link>
                    <form action={deleteEntryAction}>
                      <input type="hidden" name="id" value={entry.id} />
                      <input type="hidden" name="kind" value={kind} />
                      <button type="submit" className="action-link action-link-danger">
                        Delete
                      </button>
                    </form>
                  </div>
                </div>
              )
            )}
          </div>
        </section>
      )}

      <section>
        <h2 className="section-title">Add {label.toLowerCase()}</h2>
        <div className="app-card mt-3 p-5">
          <EntryForm
            fixedKind={kind}
            action={createEntryAction}
            submitLabel={`Add ${label.toLowerCase()}`}
          />
        </div>
      </section>
    </div>
  );
}
