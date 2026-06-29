'use client';

import { useState, useTransition } from 'react';
import { saveTrackEntries, saveTrackSkills } from './actions';

type Item = { id: string; label: string };

function PickList({
  title,
  items,
  initialSelected,
  onSave,
}: {
  title: string;
  items: Item[];
  initialSelected: string[];
  onSave: (orderedIds: string[]) => Promise<void>;
}) {
  // order = current chosen order; the rest are "available".
  const [order, setOrder] = useState<string[]>(initialSelected);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const byId = new Map(items.map((i) => [i.id, i]));
  const chosen = order.filter((id) => byId.has(id));
  const available = items.filter((i) => !chosen.includes(i.id));

  function toggle(id: string, include: boolean) {
    setSaved(false);
    setOrder((prev) =>
      include ? [...prev.filter((x) => x !== id), id] : prev.filter((x) => x !== id),
    );
  }

  function move(id: string, dir: -1 | 1) {
    setSaved(false);
    setOrder((prev) => {
      const i = prev.indexOf(id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function save() {
    startTransition(async () => {
      await onSave(chosen);
      setSaved(true);
    });
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">{title}</h2>
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50"
        >
          {pending ? 'Saving…' : saved ? 'Saved' : 'Save'}
        </button>
      </div>

      <ol className="space-y-1">
        {chosen.map((id, idx) => {
          const item = byId.get(id)!;
          return (
            <li
              key={id}
              className="flex items-center gap-2 rounded border bg-white px-3 py-2"
            >
              <input
                type="checkbox"
                checked
                aria-label={`Include ${item.label}`}
                onChange={() => toggle(id, false)}
              />
              <span className="flex-1 text-sm">{item.label}</span>
              <button
                type="button"
                aria-label="Move up"
                disabled={idx === 0}
                onClick={() => move(id, -1)}
                className="px-1 disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                aria-label="Move down"
                disabled={idx === chosen.length - 1}
                onClick={() => move(id, 1)}
                className="px-1 disabled:opacity-30"
              >
                ↓
              </button>
            </li>
          );
        })}
      </ol>

      {available.length > 0 && (
        <ul className="space-y-1">
          {available.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-2 rounded border border-dashed px-3 py-2 text-gray-500"
            >
              <input
                type="checkbox"
                checked={false}
                aria-label={`Include ${item.label}`}
                onChange={() => toggle(item.id, true)}
              />
              <span className="flex-1 text-sm">{item.label}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function CurateEditor({
  trackId,
  entries,
  skills,
  initialEntryIds,
  initialSkillIds,
}: {
  trackId: string;
  entries: Item[];
  skills: Item[];
  initialEntryIds: string[];
  initialSkillIds: string[];
}) {
  return (
    <div className="space-y-10">
      <PickList
        title="Entries"
        items={entries}
        initialSelected={initialEntryIds}
        onSave={(ids) => saveTrackEntries(trackId, ids)}
      />
      <PickList
        title="Skills"
        items={skills}
        initialSelected={initialSkillIds}
        onSave={(ids) => saveTrackSkills(trackId, ids)}
      />
    </div>
  );
}
