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
    <div className="flex flex-wrap items-center gap-1.5 rounded-[0.7rem] border border-[var(--line)] bg-white p-1.5 transition-colors focus-within:border-[var(--accent)]">
      {tags.map((t) => (
        <span key={t} className="chip chip-quiet">
          {t}
          <button
            type="button"
            aria-label={`Remove ${t}`}
            onClick={() => setTags(tags.filter((x) => x !== t))}
            className="text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)]"
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
        className="min-w-[6rem] flex-1 border-none bg-transparent p-0.5 text-sm text-[var(--ink)] placeholder:text-[var(--ink-soft)]/70 focus:outline-none"
      />
      <input type="hidden" name={name} value={tags.join(',')} />
    </div>
  );
}
