'use client';

import { useState } from 'react';
import type { Track } from '@/lib/db/tracks';

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
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Track name</span>
        <input
          name="name"
          required
          defaultValue={track?.name ?? ''}
          placeholder="e.g. Product Manager"
          className="rounded border px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Target title</span>
        <input
          name="target_title"
          defaultValue={track?.target_title ?? ''}
          placeholder="Headline used on the CV"
          className="rounded border px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Summary (track-specific statement)</span>
        <textarea
          name="summary"
          rows={4}
          defaultValue={track?.summary ?? ''}
          className="rounded border px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Default locale</span>
        <select
          name="default_locale"
          defaultValue={track?.default_locale ?? 'en-GB'}
          className="rounded border px-3 py-2"
        >
          <option value="en-GB">en-GB</option>
          <option value="en-US">en-US</option>
          <option value="de-DE">de-DE</option>
          <option value="de-AT">de-AT</option>
          <option value="de-CH">de-CH</option>
          <option value="fr-FR">fr-FR</option>
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Default template</span>
        <input
          name="default_template"
          defaultValue={track?.default_template ?? ''}
          placeholder="Template id (phase 2)"
          className="rounded border px-3 py-2"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
      >
        {pending ? 'Saving…' : submitLabel}
      </button>
    </form>
  );
}
