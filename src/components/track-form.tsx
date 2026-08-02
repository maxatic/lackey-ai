'use client';

import { useState } from 'react';
import type { Track } from '@/lib/db/tracks';
import { DEFAULT_TRACK_LOCALE } from '@/lib/market';

type Props = {
  track?: Track;
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
};

export function TrackForm({ track, action, submitLabel }: Props) {
  const [pending, setPending] = useState(false);
  return (
    <form
      action={async (fd) => {
        setPending(true);
        try {
          await action(fd);
        } finally {
          setPending(false);
        }
      }}
      className="flex max-w-xl flex-col gap-4"
    >
      <label className="block">
        <span className="field-label">Track name</span>
        <input
          name="name"
          required
          defaultValue={track?.name ?? ''}
          placeholder="e.g. Product Manager"
          className="field"
        />
      </label>

      <label className="block">
        <span className="field-label">Target title</span>
        <input
          name="target_title"
          defaultValue={track?.target_title ?? ''}
          placeholder="Headline used on the CV"
          className="field"
        />
      </label>

      <label className="block">
        <span className="field-label">Summary (track-specific statement)</span>
        <textarea
          name="summary"
          rows={4}
          defaultValue={track?.summary ?? ''}
          className="field"
        />
      </label>

      <input type="hidden" name="default_locale" value={track?.default_locale ?? DEFAULT_TRACK_LOCALE} />

      <label className="block">
        <span className="field-label">Default template</span>
        <input
          name="default_template"
          defaultValue={track?.default_template ?? ''}
          placeholder="Template id (phase 2)"
          className="field"
        />
      </label>

      <button type="submit" disabled={pending} className="btn btn-primary self-start">
        {pending ? 'Saving…' : submitLabel}
      </button>
    </form>
  );
}
