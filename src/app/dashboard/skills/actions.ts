'use server';

import { revalidatePath } from 'next/cache';
import { createSkill, updateSkill, deleteSkill, type SkillInput } from '@/lib/db/skills';

function clean(v: FormDataEntryValue | null): string | null {
  const s = typeof v === 'string' ? v.trim() : '';
  return s.length ? s : null;
}

export async function addSkillAction(formData: FormData): Promise<void> {
  const name = clean(formData.get('name'));
  if (!name) throw new Error('Name is required');
  const input: SkillInput = {
    name,
    category: clean(formData.get('category')),
    proficiency: clean(formData.get('proficiency')),
  };
  await createSkill(input);
  revalidatePath('/dashboard/skills');
}

export async function updateSkillAction(id: string, formData: FormData): Promise<void> {
  const name = clean(formData.get('name'));
  if (!name) throw new Error('Name is required');
  await updateSkill(id, {
    name,
    category: clean(formData.get('category')),
    proficiency: clean(formData.get('proficiency')),
  });
  revalidatePath('/dashboard/skills');
}

export async function deleteSkillAction(id: string): Promise<void> {
  await deleteSkill(id);
  revalidatePath('/dashboard/skills');
}
