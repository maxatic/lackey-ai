'use client';

import { useState, useTransition } from 'react';
import { CaretUp, CaretDown } from '@phosphor-icons/react';
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
        <h2 className="section-title">{title}</h2>
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="btn btn-primary !px-4 !py-2"
        >
          {pending ? 'Saving…' : saved ? 'Saved' : 'Save'}
        </button>
      </div>

      {chosen.length > 0 && (
        <ol className="app-card overflow-hidden">
          {chosen.map((id, idx) => {
            const item = byId.get(id)!;
            return (
              <li key={id} className="app-row !py-2.5">
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked
                    aria-label={`Include ${item.label}`}
                    onChange={() => toggle(id, false)}
                    className="h-4 w-4 shrink-0 accent-[var(--accent)]"
                  />
                  <span className="truncate text-sm font-medium text-[var(--ink)]">
                    {item.label}
                  </span>
                </label>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    aria-label="Move up"
                    disabled={idx === 0}
                    onClick={() => move(id, -1)}
                    className="grid h-7 w-7 place-items-center rounded-md text-[var(--ink-soft)] transition-colors hover:bg-[var(--paper-2)] hover:text-[var(--ink)] disabled:opacity-30"
                  >
                    <CaretUp className="h-3.5 w-3.5" weight="bold" />
                  </button>
                  <button
                    type="button"
                    aria-label="Move down"
                    disabled={idx === chosen.length - 1}
                    onClick={() => move(id, 1)}
                    className="grid h-7 w-7 place-items-center rounded-md text-[var(--ink-soft)] transition-colors hover:bg-[var(--paper-2)] hover:text-[var(--ink)] disabled:opacity-30"
                  >
                    <CaretDown className="h-3.5 w-3.5" weight="bold" />
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {available.length > 0 && (
        <ul className="space-y-1.5">
          {available.map((item) => (
            <li key={item.id}>
              <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-dashed border-[var(--line)] px-3.5 py-2.5 text-[var(--ink-soft)] transition-colors hover:border-[var(--accent)]/50 hover:text-[var(--ink)]">
                <input
                  type="checkbox"
                  checked={false}
                  aria-label={`Include ${item.label}`}
                  onChange={() => toggle(item.id, true)}
                  className="h-4 w-4 shrink-0 accent-[var(--accent)]"
                />
                <span className="flex-1 text-sm">{item.label}</span>
              </label>
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
