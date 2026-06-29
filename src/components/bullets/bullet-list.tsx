// src/components/bullets/bullet-list.tsx
'use client';

import { useTransition } from 'react';
import { BulletForm } from './bullet-form';
import type { Bullet } from '@/lib/db/bullets';

type Props = {
  entryId: string;
  bullets: Bullet[];
  createAction: (formData: FormData) => Promise<void>;
  updateAction: (bulletId: string, formData: FormData) => Promise<void>;
  deleteAction: (bulletId: string) => Promise<void>;
  reorderAction: (orderedIds: string[]) => Promise<void>;
};

export function BulletList({
  entryId: _entryId, // ponytail: kept in Props for parent context; not used directly (actions are pre-bound)
  bullets,
  createAction,
  updateAction,
  deleteAction,
  reorderAction,
}: Props) {
  const [isPending, startTransition] = useTransition();

  function move(index: number, dir: -1 | 1) {
    const ids = bullets.map((b) => b.id);
    const j = index + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j], ids[index]];
    startTransition(() => reorderAction(ids));
  }

  return (
    <section className="flex flex-col gap-3" aria-label="Achievement bullets">
      <ul className="flex flex-col gap-2">
        {bullets.map((b, i) => (
          <li key={b.id} className="rounded border border-gray-200 p-2">
            <div className="flex items-start gap-2">
              <div className="flex flex-col">
                <button
                  type="button"
                  aria-label="Move up"
                  disabled={i === 0 || isPending}
                  onClick={() => move(i, -1)}
                  className="text-xs disabled:opacity-30"
                >
                  ▲
                </button>
                <button
                  type="button"
                  aria-label="Move down"
                  disabled={i === bullets.length - 1 || isPending}
                  onClick={() => move(i, 1)}
                  className="text-xs disabled:opacity-30"
                >
                  ▼
                </button>
              </div>
              <div className="flex-1">
                <BulletForm
                  action={updateAction.bind(null, b.id)}
                  bullet={b}
                  submitLabel="Save"
                />
              </div>
              <form action={deleteAction.bind(null, b.id)}>
                <button
                  type="submit"
                  aria-label="Delete bullet"
                  className="text-sm text-red-600"
                >
                  Delete
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>
      <div className="rounded border border-dashed border-gray-300 p-2">
        <BulletForm action={createAction} submitLabel="Add bullet" />
      </div>
    </section>
  );
}
