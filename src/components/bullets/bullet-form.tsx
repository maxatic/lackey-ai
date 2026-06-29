// src/components/bullets/bullet-form.tsx
'use client';

import { TagsInput } from './tags-input';
import type { Bullet } from '@/lib/db/bullets';

export function BulletForm({
  action,
  bullet,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  bullet?: Bullet;
  submitLabel: string;
}) {
  return (
    <form action={action} className="flex flex-col gap-2">
      <textarea
        name="text"
        required
        rows={2}
        defaultValue={bullet?.text ?? ''}
        placeholder="Achievement bullet (English)"
        className="w-full rounded border border-gray-300 p-2 text-sm"
      />
      <TagsInput name="tags" defaultTags={bullet?.tags ?? []} />
      <button
        type="submit"
        className="self-start rounded bg-black px-3 py-1.5 text-sm text-white"
      >
        {submitLabel}
      </button>
    </form>
  );
}
