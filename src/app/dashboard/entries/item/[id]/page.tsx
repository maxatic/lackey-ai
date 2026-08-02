// src/app/dashboard/entries/item/[id]/page.tsx
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react/dist/ssr';
import { listEntries, KIND_LABELS, type EntryKind } from '@/lib/db/entries';
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
  const kind = entry.kind as EntryKind;
  const kindLabel = KIND_LABELS[kind];

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <Link
          href={`/dashboard/entries/${kind}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {kindLabel}
        </Link>
        <h1 className="app-title mt-4">{entry.title}</h1>
        {entry.organization && (
          <p className="mt-1 text-[var(--ink-soft)]">{entry.organization}</p>
        )}
      </div>

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
