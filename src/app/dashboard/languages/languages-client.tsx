'use client';

import { useState } from 'react';
import { CEFR_LEVELS } from '@/lib/db/cefr';
import type { Language } from '@/lib/db/languages';
import { addLanguageAction, updateLanguageAction, deleteLanguageAction } from './actions';

function LevelSelect({ defaultValue }: { defaultValue?: string }) {
  return (
    <select name="cefr_level" defaultValue={defaultValue ?? 'B2'} className="rounded border px-2 py-1">
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
      <ul className="divide-y rounded-md border">
        {languages.length === 0 && (
          <li className="p-4 text-sm text-gray-500">No languages yet.</li>
        )}
        {languages.map((l) =>
          editingId === l.id ? (
            <li key={l.id} className="p-3">
              <form
                action={async (fd) => {
                  await updateLanguageAction(l.id, fd);
                  setEditingId(null);
                }}
                className="flex flex-wrap items-center gap-2"
              >
                <input name="name" defaultValue={l.name} required className="rounded border px-2 py-1" placeholder="Language" />
                <LevelSelect defaultValue={l.cefr_level} />
                <button type="submit" className="rounded bg-black px-3 py-1 text-sm text-white">Save</button>
                <button type="button" onClick={() => setEditingId(null)} className="px-3 py-1 text-sm">Cancel</button>
              </form>
            </li>
          ) : (
            <li key={l.id} className="flex items-center justify-between gap-2 p-3">
              <div className="text-sm">
                <span className="font-medium">{l.name}</span>
                <span className="text-gray-500"> · {l.cefr_level === 'native' ? 'Native' : l.cefr_level}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditingId(l.id)} className="text-sm text-blue-600">Edit</button>
                <form action={deleteLanguageAction.bind(null, l.id)}>
                  <button type="submit" className="text-sm text-red-600">Delete</button>
                </form>
              </div>
            </li>
          ),
        )}
      </ul>

      <form action={addLanguageAction} className="flex flex-wrap items-center gap-2">
        <input name="name" required className="rounded border px-2 py-1" placeholder="Language" />
        <LevelSelect />
        <button type="submit" className="rounded bg-black px-3 py-1 text-sm text-white">Add language</button>
      </form>
    </div>
  );
}
