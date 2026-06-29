// src/app/dashboard/entries/[id]/page.tsx
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { listEntries } from '@/lib/db/entries';
import { listBullets } from '@/lib/db/bullets';
import { BulletList } from '@/components/bullets/bullet-list';
import {
  createBulletAction,
  updateBulletAction,
  deleteBulletAction,
  reorderBulletsAction,
} from './actions';

export default async function EntryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const entry = (await listEntries()).find((e) => e.id === id);
  if (!entry) notFound();

  const bullets = await listBullets(id);

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/dashboard/entries" className="text-sm underline">← All entries</Link>
      <h1 className="text-2xl font-bold">{entry.title}</h1>
      {entry.organization && <p className="text-gray-500">{entry.organization}</p>}

      <BulletList
        entryId={id}
        bullets={bullets}
        createAction={createBulletAction.bind(null, id)}
        updateAction={(bulletId, fd) => updateBulletAction(id, bulletId, fd)}
        deleteAction={(bulletId) => deleteBulletAction(id, bulletId)}
        reorderAction={(orderedIds) => reorderBulletsAction(id, orderedIds)}
      />
    </div>
  );
}
