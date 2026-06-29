// src/app/dashboard/entries/[id]/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import {
  createBullet,
  updateBullet,
  deleteBullet,
  reorderBullets,
} from '@/lib/db/bullets';

function parseTags(raw: FormDataEntryValue | null): string[] {
  if (typeof raw !== 'string' || raw.trim() === '') return [];
  return raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

export async function createBulletAction(entryId: string, formData: FormData): Promise<void> {
  const text = String(formData.get('text') ?? '').trim();
  if (!text) return;
  await createBullet({ entry_id: entryId, text, tags: parseTags(formData.get('tags')) });
  revalidatePath(`/dashboard/entries/${entryId}`);
}

export async function updateBulletAction(
  entryId: string,
  bulletId: string,
  formData: FormData,
): Promise<void> {
  const text = String(formData.get('text') ?? '').trim();
  if (!text) return;
  await updateBullet(bulletId, { text, tags: parseTags(formData.get('tags')) });
  revalidatePath(`/dashboard/entries/${entryId}`);
}

export async function deleteBulletAction(entryId: string, bulletId: string): Promise<void> {
  await deleteBullet(bulletId);
  revalidatePath(`/dashboard/entries/${entryId}`);
}

export async function reorderBulletsAction(entryId: string, orderedIds: string[]): Promise<void> {
  await reorderBullets(entryId, orderedIds);
  revalidatePath(`/dashboard/entries/${entryId}`);
}
