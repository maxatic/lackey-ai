'use client';

import { useState } from 'react';
import { DETAIL_FIELDS, KIND_LABELS, ENTRY_KINDS, type EntryKind } from '@/lib/db/entry-kinds';
import type { Entry } from '@/lib/db/entries';

type Props = {
  entry?: Entry;
  fixedKind?: EntryKind;
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
};

export default function EntryForm({ entry, fixedKind, action, submitLabel }: Props) {
  const [kind, setKind] = useState<EntryKind>(
    fixedKind ?? (entry?.kind as EntryKind) ?? 'experience',
  );
  const details = (entry?.details ?? {}) as Record<string, string>;

  return (
    <form action={action} className="space-y-4">
      {entry && <input type="hidden" name="id" value={entry.id} />}

      {fixedKind ? (
        <input type="hidden" name="kind" value={fixedKind} />
      ) : (
        <label className="block">
          <span className="field-label">Kind</span>
          <select
            name="kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as EntryKind)}
            className="field"
          >
            {ENTRY_KINDS.map((k) => (
              <option key={k} value={k}>{KIND_LABELS[k]}</option>
            ))}
          </select>
        </label>
      )}

      <label className="block">
        <span className="field-label">Title</span>
        <input name="title" defaultValue={entry?.title ?? ''} required className="field" />
      </label>

      <label className="block">
        <span className="field-label">Organization</span>
        <input name="organization" defaultValue={entry?.organization ?? ''} className="field" />
      </label>

      <label className="block">
        <span className="field-label">Location</span>
        <input name="location" defaultValue={entry?.location ?? ''} className="field" />
      </label>

      <div className="flex gap-3">
        <label className="block flex-1">
          <span className="field-label">Start date</span>
          <input type="date" name="start_date" defaultValue={entry?.start_date ?? ''} className="field" />
        </label>
        <label className="block flex-1">
          <span className="field-label">End date</span>
          <input type="date" name="end_date" defaultValue={entry?.end_date ?? ''} className="field" />
        </label>
      </div>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="is_current"
          defaultChecked={entry?.is_current ?? false}
          className="h-4 w-4 accent-[var(--accent)]"
        />
        <span className="text-sm font-medium text-[var(--ink)]">Current position</span>
      </label>

      <label className="block">
        <span className="field-label">Summary</span>
        <textarea name="summary" defaultValue={entry?.summary ?? ''} className="field" rows={3} />
      </label>

      {DETAIL_FIELDS[kind].map(({ key, label }) => (
        <label key={key} className="block">
          <span className="field-label">{label}</span>
          <input
            name={`details.${key}`}
            defaultValue={entry?.kind === kind ? (details[key] ?? '') : ''}
            className="field"
          />
        </label>
      ))}

      <button type="submit" className="btn btn-primary">
        {submitLabel}
      </button>
    </form>
  );
}
