import { describe, it, expect } from 'vitest';
import { applyOverrides, validateOverrides } from './overrides';
import type { TrackSnapshot } from './data';

const snap = (): TrackSnapshot => ({
  track: { name: 'T', target_title: null, summary: 'old summary' },
  profile: {
    full_name: 'A', headline: 'old headline', email: null, phone: null, location: null,
    links: [], date_of_birth: null, nationality: null, marital_status: null,
  },
  entries: [
    { id: 'e1', kind: 'experience', title: 'Dev', organization: null, location: null, start_date: null, end_date: null, is_current: false, summary: null, details: {}, bullets: [{ id: 'b1', text: 'did x' }, { id: 'b2', text: 'did y' }] },
    { id: 'e2', kind: 'education', title: 'BSc', organization: null, location: null, start_date: null, end_date: null, is_current: false, summary: null, details: {}, bullets: [] },
    { id: 'e3', kind: 'project', title: 'P', organization: null, location: null, start_date: null, end_date: null, is_current: false, summary: null, details: {}, bullets: [] },
  ],
  skills: [ { id: 's1', name: 'TS', category: null }, { id: 's2', name: 'SQL', category: null } ],
  languages: [],
});

describe('applyOverrides', () => {
  it('empty overrides = identity', () => {
    expect(applyOverrides(snap(), {})).toEqual(snap());
  });

  it('does not mutate the input snapshot', () => {
    const s = snap();
    applyOverrides(s, { entry_exclude: ['e1'], bullet_rewrites: [{ bullet_id: 'b1', suggested_text: 'z' }] });
    expect(s).toEqual(snap());
  });

  it('excludes then orders entries; unlisted keep relative order', () => {
    const out = applyOverrides(snap(), { entry_order: ['e3', 'e1'], entry_exclude: ['e2'] });
    expect(out.entries.map((e) => e.id)).toEqual(['e3', 'e1']);
  });

  it('stale ids in order/exclude are ignored', () => {
    const out = applyOverrides(snap(), { entry_order: ['ghost', 'e2'], entry_exclude: ['phantom'] });
    expect(out.entries.map((e) => e.id)).toEqual(['e2', 'e1', 'e3']);
  });

  it('rewrites bullets by id; unknown bullet ids no-op', () => {
    const out = applyOverrides(snap(), {
      bullet_rewrites: [
        { bullet_id: 'b2', suggested_text: 'did y, tailored' },
        { bullet_id: 'ghost', suggested_text: 'nope' },
      ],
    });
    expect(out.entries[0].bullets.map((b) => b.text)).toEqual(['did x', 'did y, tailored']);
  });

  it('rewrites summary and headline', () => {
    const out = applyOverrides(snap(), {
      summary_rewrite: { suggested_text: 'new summary' },
      headline_rewrite: { suggested_text: 'new headline' },
    });
    expect(out.track.summary).toBe('new summary');
    expect(out.profile.headline).toBe('new headline');
  });

  it('duplicate ids in order arrays do not duplicate items', () => {
    const out = applyOverrides(snap(), { entry_order: ['e1', 'e1'] });
    expect(out.entries.map((e) => e.id)).toEqual(['e1', 'e2', 'e3']);
  });

  it('orders and excludes skills', () => {
    const out = applyOverrides(snap(), { skill_order: ['s2'], skill_exclude: [] });
    expect(out.skills.map((s) => s.id)).toEqual(['s2', 's1']);
  });
});

describe('validateOverrides', () => {
  it('strips junk and never throws', () => {
    expect(validateOverrides(null)).toEqual({});
    expect(validateOverrides({ entry_order: ['a', 1], junk: true, bullet_rewrites: [{ bullet_id: 'b', suggested_text: 'x' }, { bad: 1 }] }))
      .toEqual({ entry_order: ['a'], bullet_rewrites: [{ bullet_id: 'b', suggested_text: 'x' }] });
  });
});
