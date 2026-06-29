'use client';

import { useState } from 'react';
import type { Skill } from '@/lib/db/skills';
import { addSkillAction, updateSkillAction, deleteSkillAction } from './actions';

export function SkillsClient({ skills }: { skills: Skill[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <ul className="divide-y rounded-md border">
        {skills.length === 0 && (
          <li className="p-4 text-sm text-gray-500">No skills yet.</li>
        )}
        {skills.map((s) =>
          editingId === s.id ? (
            <li key={s.id} className="p-3">
              <form
                action={async (fd) => {
                  await updateSkillAction(s.id, fd);
                  setEditingId(null);
                }}
                className="flex flex-wrap items-center gap-2"
              >
                <input name="name" defaultValue={s.name} required className="rounded border px-2 py-1" placeholder="Name" />
                <input name="category" defaultValue={s.category ?? ''} className="rounded border px-2 py-1" placeholder="Category" />
                <input name="proficiency" defaultValue={s.proficiency ?? ''} className="rounded border px-2 py-1" placeholder="Proficiency" />
                <button type="submit" className="rounded bg-black px-3 py-1 text-sm text-white">Save</button>
                <button type="button" onClick={() => setEditingId(null)} className="px-3 py-1 text-sm">Cancel</button>
              </form>
            </li>
          ) : (
            <li key={s.id} className="flex items-center justify-between gap-2 p-3">
              <div className="text-sm">
                <span className="font-medium">{s.name}</span>
                {s.category && <span className="text-gray-500"> · {s.category}</span>}
                {s.proficiency && <span className="text-gray-500"> · {s.proficiency}</span>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditingId(s.id)} className="text-sm text-blue-600">Edit</button>
                <form action={deleteSkillAction.bind(null, s.id)}>
                  <button type="submit" className="text-sm text-red-600">Delete</button>
                </form>
              </div>
            </li>
          ),
        )}
      </ul>

      <form action={addSkillAction} className="flex flex-wrap items-center gap-2">
        <input name="name" required className="rounded border px-2 py-1" placeholder="Name" />
        <input name="category" className="rounded border px-2 py-1" placeholder="Category (optional)" />
        <input name="proficiency" className="rounded border px-2 py-1" placeholder="Proficiency (optional)" />
        <button type="submit" className="rounded bg-black px-3 py-1 text-sm text-white">Add skill</button>
      </form>
    </div>
  );
}
