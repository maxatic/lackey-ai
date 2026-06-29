'use server';

import { revalidatePath } from 'next/cache';
import {
  createLanguage,
  updateLanguage,
  deleteLanguage,
  CEFR_LEVELS,
  type CefrLevel,
} from '@/lib/db/languages';

function parseLevel(v: FormDataEntryValue | null): CefrLevel {
  const s = typeof v === 'string' ? v : '';
  if (!(CEFR_LEVELS as readonly string[]).includes(s)) throw new Error('Invalid CEFR level');
  return s as CefrLevel;
}

function parseName(v: FormDataEntryValue | null): string {
  const s = typeof v === 'string' ? v.trim() : '';
  if (!s) throw new Error('Name is required');
  return s;
}

export async function addLanguageAction(formData: FormData): Promise<void> {
  await createLanguage({
    name: parseName(formData.get('name')),
    cefr_level: parseLevel(formData.get('cefr_level')),
  });
  revalidatePath('/dashboard/languages');
}

export async function updateLanguageAction(id: string, formData: FormData): Promise<void> {
  await updateLanguage(id, {
    name: parseName(formData.get('name')),
    cefr_level: parseLevel(formData.get('cefr_level')),
  });
  revalidatePath('/dashboard/languages');
}

export async function deleteLanguageAction(id: string): Promise<void> {
  await deleteLanguage(id);
  revalidatePath('/dashboard/languages');
}
