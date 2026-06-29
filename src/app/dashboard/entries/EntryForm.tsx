'use client';

import { useState } from 'react';
import {
  DETAIL_FIELDS, KIND_LABELS, ENTRY_KINDS,
  type Entry, type EntryKind,
} from '@/lib/db/entries';

type Props = {
  entry?: Entry;
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
};

export default function EntryForm({ entry, action, submitLabel }: Props) {
  const [kind, setKind] = useState<EntryKind>((entry?.kind as EntryKind) ?? 'experience');
  const details = (entry?.details ?? {}) as Record<string, string>;

  return (
    <form action={action} className="space-y-3 border p-4 rounded-md">
      {entry && <input type="hidden" name="id" value={entry.id} />}

      <label className="block">
        <span className="text-sm font-medium">Kind</span>
        <select
          name="kind"
          value={kind}
          onChange={(e) => setKind(e.target.value as EntryKind)}
          className="block w-full border rounded px-2 py-1"
        >
          {ENTRY_KINDS.map((k) => (
            <option key={k} value={k}>{KIND_LABELS[k]}</option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-sm font-medium">Title</span>
        <input name="title" defaultValue={entry?.title ?? ''} required
          className="block w-full border rounded px-2 py-1" />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Organization</span>
        <input name="organization" defaultValue={entry?.organization ?? ''}
          className="block w-full border rounded px-2 py-1" />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Location</span>
        <input name="location" defaultValue={entry?.location ?? ''}
          className="block w-full border rounded px-2 py-1" />
      </label>

      <div className="flex gap-3">
        <label className="block flex-1">
          <span className="text-sm font-medium">Start date</span>
          <input type="date" name="start_date" defaultValue={entry?.start_date ?? ''}
            className="block w-full border rounded px-2 py-1" />
        </label>
        <label className="block flex-1">
          <span className="text-sm font-medium">End date</span>
          <input type="date" name="end_date" defaultValue={entry?.end_date ?? ''}
            className="block w-full border rounded px-2 py-1" />
        </label>
      </div>

      <label className="flex items-center gap-2">
        <input type="checkbox" name="is_current" defaultChecked={entry?.is_current ?? false} />
        <span className="text-sm font-medium">Current</span>
      </label>

      <label className="block">
        <span className="text-sm font-medium">Summary</span>
        <textarea name="summary" defaultValue={entry?.summary ?? ''}
          className="block w-full border rounded px-2 py-1" />
      </label>

      {DETAIL_FIELDS[kind].map(({ key, label }) => (
        <label key={key} className="block">
          <span className="text-sm font-medium">{label}</span>
          <input
            name={`details.${key}`}
            defaultValue={entry?.kind === kind ? (details[key] ?? '') : ''}
            className="block w-full border rounded px-2 py-1"
          />
        </label>
      ))}

      <button type="submit" className="border rounded px-3 py-1 font-medium">
        {submitLabel}
      </button>
    </form>
  );
}
