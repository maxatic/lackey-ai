import { describe, it, expect, beforeEach, vi } from 'vitest';

// In-memory fake store keyed by table name.
const store: Record<string, any[]> = { track_entries: [], track_skills: [] };
const USER = 'user_clerk_sub_A';

// Error-injection flags — set before a test, reset in beforeEach.
let deleteError = false;
let insertError = false;
let selectError = false;

function table(name: string) {
  return {
    delete() {
      const filters: Record<string, any> = {};
      const op = {
        eq(col: string, val: any) {
          filters[col] = val;
          // After both .eq() calls Supabase resolves; emulate as thenable.
          return op;
        },
        then(resolve: (r: { error: null | { message: string } }) => void) {
          if (deleteError) {
            resolve({ error: { message: 'boom' } });
            return;
          }
          store[name] = store[name].filter(
            (row) => !Object.entries(filters).every(([k, v]) => row[k] === v),
          );
          resolve({ error: null });
        },
      };
      return op;
    },
    insert(rows: any[]) {
      if (insertError) return Promise.resolve({ error: { message: 'boom' } });
      store[name].push(...rows.map((r) => ({ ...r })));
      return Promise.resolve({ error: null });
    },
    select(_cols: string) {
      const filters: Record<string, any> = {};
      const op: any = {
        eq(col: string, val: any) {
          filters[col] = val;
          return op;
        },
        order(col: string) {
          if (selectError) return Promise.resolve({ data: null, error: { message: 'boom' } });
          const data = store[name]
            .filter((row) => Object.entries(filters).every(([k, v]) => row[k] === v))
            .sort((a, b) => a[col] - b[col]);
          return Promise.resolve({ data, error: null });
        },
      };
      return op;
    },
  };
}

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: async () => ({ from: (n: string) => table(n) }),
}));
vi.mock('@/lib/auth/ensure-user', () => ({ ensureUser: async () => {} }));
vi.mock('@clerk/nextjs/server', () => ({ auth: async () => ({ userId: USER }) }));

import {
  setTrackEntries,
  getTrackEntryIds,
  setTrackSkills,
  getTrackSkillIds,
} from './curation';

describe('track curation', () => {
  beforeEach(() => {
    store.track_entries = [];
    store.track_skills = [];
    deleteError = false;
    insertError = false;
    selectError = false;
  });

  it('persists an ordered subset with correct sort_order and user_id', async () => {
    await setTrackEntries('track1', ['e3', 'e1', 'e2']);
    const rows = store.track_entries;
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.user_id === USER)).toBe(true);
    expect(rows.map((r) => [r.entry_id, r.sort_order])).toEqual([
      ['e3', 0],
      ['e1', 1],
      ['e2', 2],
    ]);
    expect(await getTrackEntryIds('track1')).toEqual(['e3', 'e1', 'e2']);
  });

  it('deselecting removes the row; empty set clears all', async () => {
    await setTrackEntries('track1', ['e1', 'e2']);
    await setTrackEntries('track1', ['e2']);
    expect(await getTrackEntryIds('track1')).toEqual(['e2']);
    await setTrackEntries('track1', []);
    expect(store.track_entries).toHaveLength(0);
  });

  it('re-running replaces cleanly (no dupes, fresh sort_order)', async () => {
    await setTrackEntries('track1', ['e1', 'e2', 'e3']);
    await setTrackEntries('track1', ['e3', 'e1']);
    const rows = store.track_entries;
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => [r.entry_id, r.sort_order])).toEqual([
      ['e3', 0],
      ['e1', 1],
    ]);
  });

  it('only touches the named track (leaves siblings intact)', async () => {
    await setTrackEntries('track1', ['e1']);
    await setTrackEntries('track2', ['e9']);
    await setTrackEntries('track1', ['e2']);
    expect(await getTrackEntryIds('track1')).toEqual(['e2']);
    expect(await getTrackEntryIds('track2')).toEqual(['e9']);
  });

  it('skills mirror entry behavior', async () => {
    await setTrackSkills('track1', ['s2', 's1']);
    const rows = store.track_skills;
    expect(rows.map((r) => [r.skill_id, r.sort_order])).toEqual([
      ['s2', 0],
      ['s1', 1],
    ]);
    expect(await getTrackSkillIds('track1')).toEqual(['s2', 's1']);
  });

  // Error-path tests: each must fail if its `if (error) throw` guard were removed.
  it('setTrackEntries throws when the delete step fails', async () => {
    deleteError = true;
    await expect(setTrackEntries('track1', ['e1'])).rejects.toMatchObject({ message: 'boom' });
  });

  it('setTrackEntries throws when the insert step fails', async () => {
    insertError = true;
    await expect(setTrackEntries('track1', ['e1'])).rejects.toMatchObject({ message: 'boom' });
  });

  it('getTrackEntryIds throws when the select step fails', async () => {
    selectError = true;
    await expect(getTrackEntryIds('track1')).rejects.toMatchObject({ message: 'boom' });
  });

  it('setTrackSkills throws when the delete step fails', async () => {
    deleteError = true;
    await expect(setTrackSkills('track1', ['s1'])).rejects.toMatchObject({ message: 'boom' });
  });

  it('setTrackSkills throws when the insert step fails', async () => {
    insertError = true;
    await expect(setTrackSkills('track1', ['s1'])).rejects.toMatchObject({ message: 'boom' });
  });

  it('getTrackSkillIds throws when the select step fails', async () => {
    selectError = true;
    await expect(getTrackSkillIds('track1')).rejects.toMatchObject({ message: 'boom' });
  });
});
