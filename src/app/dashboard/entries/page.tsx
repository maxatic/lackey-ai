import {
  listEntries, ENTRY_KINDS, KIND_LABELS, type EntryKind, type Entry,
} from '@/lib/db/entries';
import { createEntryAction, updateEntryAction, deleteEntryAction } from './actions';
import EntryForm from './EntryForm';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function EntriesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const entries = await listEntries();

  const byKind = new Map<EntryKind, Entry[]>();
  for (const e of entries) {
    const list = byKind.get(e.kind as EntryKind) ?? [];
    list.push(e);
    byKind.set(e.kind as EntryKind, list);
  }

  return (
    <div className="max-w-2xl space-y-10">
      <header>
        <p className="kicker">Your skeleton</p>
        <h1 className="app-title mt-2">Entries</h1>
        <p className="app-subtitle">
          Work, education and projects. Each entry carries its own achievement
          bullets, which Lackey reorders and rewords per job.
        </p>
      </header>

      {entries.length === 0 && (
        <div className="empty-state">
          Nothing here yet. Add your first entry below — start with your most
          recent role.
        </div>
      )}

      {ENTRY_KINDS.map((kind) => {
        const rows = byKind.get(kind) ?? [];
        if (rows.length === 0) return null;
        return (
          <section key={kind}>
            <h2 className="section-title">{KIND_LABELS[kind]}</h2>
            <div className="app-card mt-3 overflow-hidden">
              {rows.map((entry) =>
                edit === entry.id ? (
                  <div key={entry.id} className="border-t border-[var(--line)]/60 p-4 first:border-t-0">
                    <EntryForm
                      entry={entry}
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
                      <Link href={`/dashboard/entries/${entry.id}`} className="action-link">
                        Bullets
                      </Link>
                      <Link href={`/dashboard/entries?edit=${entry.id}`} className="action-link">
                        Edit
                      </Link>
                      <form action={deleteEntryAction}>
                        <input type="hidden" name="id" value={entry.id} />
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
        );
      })}

      <section>
        <h2 className="section-title">Add entry</h2>
        <div className="app-card mt-3 p-5">
          <EntryForm action={createEntryAction} submitLabel="Add entry" />
        </div>
      </section>
    </div>
  );
}
