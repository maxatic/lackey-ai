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
    <div className="max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold">Entries</h1>

      {ENTRY_KINDS.map((kind) => {
        const rows = byKind.get(kind) ?? [];
        if (rows.length === 0) return null;
        return (
          <section key={kind} className="space-y-3">
            <h2 className="text-lg font-semibold">{KIND_LABELS[kind]}</h2>
            {rows.map((entry) =>
              edit === entry.id ? (
                <EntryForm
                  key={entry.id}
                  entry={entry}
                  action={updateEntryAction}
                  submitLabel="Save"
                />
              ) : (
                <div key={entry.id} className="flex items-center justify-between border rounded px-3 py-2">
                  <div>
                    <div className="font-medium">{entry.title}</div>
                    <div className="text-sm text-gray-500">{entry.organization ?? ''}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link href={`/dashboard/entries/${entry.id}`} className="text-sm underline">Bullets</Link>
                    <Link href={`/dashboard/entries?edit=${entry.id}`} className="text-sm underline">Edit</Link>
                    <form action={deleteEntryAction}>
                      <input type="hidden" name="id" value={entry.id} />
                      <button type="submit" className="text-sm text-red-600 underline">Delete</button>
                    </form>
                  </div>
                </div>
              )
            )}
          </section>
        );
      })}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Add entry</h2>
        <EntryForm action={createEntryAction} submitLabel="Add" />
      </section>
    </div>
  );
}
