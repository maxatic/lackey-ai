// src/components/bullets/tags-input.tsx
'use client';

import { useState } from 'react';

export function TagsInput({ name, defaultTags = [] }: { name: string; defaultTags?: string[] }) {
  const [tags, setTags] = useState<string[]>(defaultTags);
  const [draft, setDraft] = useState('');

  function commit() {
    const t = draft.trim().replace(/,$/, '').trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setDraft('');
  }

  return (
    <div className="flex flex-wrap items-center gap-1 rounded border border-gray-300 p-1.5">
      {tags.map((t) => (
        <span
          key={t}
          className="flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-sm"
        >
          {t}
          <button
            type="button"
            aria-label={`Remove ${t}`}
            onClick={() => setTags(tags.filter((x) => x !== t))}
            className="text-gray-500 hover:text-gray-800"
          >
            ×
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            commit();
          } else if (e.key === 'Backspace' && draft === '' && tags.length) {
            setTags(tags.slice(0, -1));
          }
        }}
        onBlur={commit}
        placeholder="Add tag…"
        className="min-w-[6rem] flex-1 border-none p-0.5 text-sm focus:outline-none"
      />
      <input type="hidden" name={name} value={tags.join(',')} />
    </div>
  );
}
