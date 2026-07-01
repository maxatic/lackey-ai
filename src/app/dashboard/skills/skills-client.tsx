'use client';

import { useState } from 'react';
import type { Skill } from '@/lib/db/skills';
import { addSkillAction, updateSkillAction, deleteSkillAction } from './actions';

export function SkillsClient({ skills }: { skills: Skill[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {skills.length === 0 ? (
        <div className="empty-state">
          No skills yet. Add the tools, methods and strengths you would want a
          hiring manager to see.
        </div>
      ) : (
        <ul className="app-card overflow-hidden">
          {skills.map((s) =>
            editingId === s.id ? (
              <li key={s.id} className="app-row">
                <form
                  action={async (fd) => {
                    await updateSkillAction(s.id, fd);
                    setEditingId(null);
                  }}
                  className="flex w-full flex-wrap items-center gap-2"
                >
                  <input name="name" defaultValue={s.name} required className="field !w-40" placeholder="Name" />
                  <input name="category" defaultValue={s.category ?? ''} className="field !w-36" placeholder="Category" />
                  <input name="proficiency" defaultValue={s.proficiency ?? ''} className="field !w-36" placeholder="Proficiency" />
                  <button type="submit" className="btn btn-primary !px-4 !py-2">Save</button>
                  <button type="button" onClick={() => setEditingId(null)} className="btn btn-quiet !px-4 !py-2">
                    Cancel
                  </button>
                </form>
              </li>
            ) : (
              <li key={s.id} className="app-row">
                <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold text-[var(--ink)]">{s.name}</span>
                  {s.category && <span className="chip chip-quiet">{s.category}</span>}
                  {s.proficiency && <span className="chip">{s.proficiency}</span>}
                </div>
                <div className="flex shrink-0 gap-3">
                  <button onClick={() => setEditingId(s.id)} className="action-link">Edit</button>
                  <form action={deleteSkillAction.bind(null, s.id)}>
                    <button type="submit" className="action-link action-link-danger">Delete</button>
                  </form>
                </div>
              </li>
            ),
          )}
        </ul>
      )}

      <form action={addSkillAction} className="app-card flex flex-wrap items-end gap-3 p-5">
        <label className="block">
          <span className="field-label">Name</span>
          <input name="name" required className="field !w-40" placeholder="e.g. Figma" />
        </label>
        <label className="block">
          <span className="field-label">Category</span>
          <input name="category" className="field !w-36" placeholder="Optional" />
        </label>
        <label className="block">
          <span className="field-label">Proficiency</span>
          <input name="proficiency" className="field !w-36" placeholder="Optional" />
        </label>
        <button type="submit" className="btn btn-primary">Add skill</button>
      </form>
    </div>
  );
}
