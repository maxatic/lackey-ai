// src/components/bullets/bullet-list.tsx
'use client';

import { useTransition } from 'react';
import { CaretUp, CaretDown } from '@phosphor-icons/react';
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
    <section className="flex flex-col gap-4" aria-label="Achievement bullets">
      <h2 className="section-title">Achievement bullets</h2>
      {bullets.length === 0 && (
        <div className="empty-state">
          No bullets yet. Each one is a single achievement — start with a verb,
          end with a result.
        </div>
      )}
      <ul className="flex flex-col gap-3">
        {bullets.map((b, i) => (
          <li key={b.id} className="app-card p-4">
            <div className="flex items-start gap-3">
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  aria-label="Move up"
                  disabled={i === 0 || isPending}
                  onClick={() => move(i, -1)}
                  className="grid h-6 w-6 place-items-center rounded-md text-[var(--ink-soft)] transition-colors hover:bg-[var(--paper-2)] hover:text-[var(--ink)] disabled:opacity-30"
                >
                  <CaretUp className="h-3.5 w-3.5" weight="bold" />
                </button>
                <button
                  type="button"
                  aria-label="Move down"
                  disabled={i === bullets.length - 1 || isPending}
                  onClick={() => move(i, 1)}
                  className="grid h-6 w-6 place-items-center rounded-md text-[var(--ink-soft)] transition-colors hover:bg-[var(--paper-2)] hover:text-[var(--ink)] disabled:opacity-30"
                >
                  <CaretDown className="h-3.5 w-3.5" weight="bold" />
                </button>
              </div>
              <div className="min-w-0 flex-1">
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
                  className="action-link action-link-danger"
                >
                  Delete
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>
      <div className="rounded-2xl border border-dashed border-[var(--line)] p-4">
        <p className="field-label">New bullet</p>
        <BulletForm action={createAction} submitLabel="Add bullet" />
      </div>
    </section>
  );
}
