'use server';

import { revalidatePath } from 'next/cache';
import {
  createEntry, updateEntry, deleteEntry,
  DETAIL_FIELDS, ENTRY_KINDS, type EntryKind, type EntryInput,
} from '@/lib/db/entries';

function parseForm(formData: FormData): EntryInput {
  const kind = String(formData.get('kind') ?? '');
  if (!ENTRY_KINDS.includes(kind as EntryKind)) throw new Error(`Invalid kind: ${kind}`);
  const k = kind as EntryKind;

  const str = (name: string) => {
    const v = formData.get(name);
    const s = v == null ? '' : String(v).trim();
    return s === '' ? null : s;
  };

  const details: Record<string, string> = {};
  for (const { key } of DETAIL_FIELDS[k]) {
    const v = str(`details.${key}`);
    if (v !== null) details[key] = v;
  }

  const title = str('title');
  if (!title) throw new Error('Title is required');

  return {
    kind: k,
    title,
    organization: str('organization'),
    location: str('location'),
    start_date: str('start_date'),
    end_date: str('end_date'),
    is_current: formData.get('is_current') === 'on',
    summary: str('summary'),
    details,
  };
}

export async function createEntryAction(formData: FormData): Promise<void> {
  await createEntry(parseForm(formData));
  revalidatePath('/dashboard/entries');
}

export async function updateEntryAction(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  if (!id) throw new Error('Missing entry id');
  await updateEntry(id, parseForm(formData));
  revalidatePath('/dashboard/entries');
}

export async function deleteEntryAction(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  if (!id) throw new Error('Missing entry id');
  await deleteEntry(id);
  revalidatePath('/dashboard/entries');
}
