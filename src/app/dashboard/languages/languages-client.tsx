'use client';

import { useState } from 'react';
import { CEFR_LEVELS } from '@/lib/db/cefr';
import type { Language } from '@/lib/db/languages';
import { addLanguageAction, updateLanguageAction, deleteLanguageAction } from './actions';

function LevelSelect({ defaultValue }: { defaultValue?: string }) {
  return (
    <select name="cefr_level" defaultValue={defaultValue ?? 'B2'} className="field !w-28">
      {CEFR_LEVELS.map((lvl) => (
        <option key={lvl} value={lvl}>{lvl === 'native' ? 'Native' : lvl}</option>
      ))}
    </select>
  );
}

export function LanguagesClient({ languages }: { languages: Language[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {languages.length === 0 ? (
        <div className="empty-state">
          No languages yet. Add every language you could interview in — even a
          conversational B1 can set you apart.
        </div>
      ) : (
        <ul className="app-card overflow-hidden">
          {languages.map((l) =>
            editingId === l.id ? (
              <li key={l.id} className="app-row">
                <form
                  action={async (fd) => {
                    await updateLanguageAction(l.id, fd);
                    setEditingId(null);
                  }}
                  className="flex w-full flex-wrap items-center gap-2"
                >
                  <input name="name" defaultValue={l.name} required className="field !w-40" placeholder="Language" />
                  <LevelSelect defaultValue={l.cefr_level} />
                  <button type="submit" className="btn btn-primary !px-4 !py-2">Save</button>
                  <button type="button" onClick={() => setEditingId(null)} className="btn btn-quiet !px-4 !py-2">
                    Cancel
                  </button>
                </form>
              </li>
            ) : (
              <li key={l.id} className="app-row">
                <div className="flex items-center gap-2.5 text-sm">
                  <span className="font-semibold text-[var(--ink)]">{l.name}</span>
                  <span className="chip">{l.cefr_level === 'native' ? 'Native' : l.cefr_level}</span>
                </div>
                <div className="flex shrink-0 gap-3">
                  <button onClick={() => setEditingId(l.id)} className="action-link">Edit</button>
                  <form action={deleteLanguageAction.bind(null, l.id)}>
                    <button type="submit" className="action-link action-link-danger">Delete</button>
                  </form>
                </div>
              </li>
            ),
          )}
        </ul>
      )}

      <form action={addLanguageAction} className="app-card flex flex-wrap items-end gap-3 p-5">
        <label className="block">
          <span className="field-label">Language</span>
          <input name="name" required className="field !w-40" placeholder="e.g. German" />
        </label>
        <label className="block">
          <span className="field-label">Level</span>
          <LevelSelect />
        </label>
        <button type="submit" className="btn btn-primary">Add language</button>
      </form>
    </div>
  );
}
