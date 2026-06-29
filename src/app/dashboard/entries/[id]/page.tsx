// src/app/dashboard/entries/[id]/page.tsx
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { listEntries } from '@/lib/db/entries';

export default async function EntryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const entry = (await listEntries()).find((e) => e.id === id);
  if (!entry) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/dashboard/entries" className="text-sm underline">← All entries</Link>
      <h1 className="text-2xl font-bold">{entry.title}</h1>
      {entry.organization && <p className="text-gray-500">{entry.organization}</p>}

      <section aria-label="Achievement bullets">
        {/* Task 4 renders <BulletList> here. */}
        <p className="text-sm text-gray-400">Bullets are added in Task 4.</p>
      </section>
    </div>
  );
}
