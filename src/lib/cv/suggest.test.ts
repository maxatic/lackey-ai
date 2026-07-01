/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const callStructuredMock = vi.fn();
vi.mock('@/lib/ai/client', () => ({
  callStructured: (o: unknown) => callStructuredMock(o),
  AI_MODEL: 'claude-opus-4-8',
}));

import { suggestCvDiff, validateSuggestions } from './suggest';
import type { TrackSnapshot } from './data';

// same fixture as overrides.test.ts (copied — tests may be read standalone)
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

const good = {
  entry_order: ['e1'], entry_exclude: [], skill_order: [], skill_exclude: [],
  bullet_rewrites: [{ bullet_id: 'b1', suggested_text: 'tailored', reason: 'echoes JD keyword' }],
  summary_rewrite: null, headline_rewrite: null,
};

// braces matter: mockReset() returns the mock (a function), and vitest calls a
// function returned from beforeEach as a cleanup hook — invoking the mock again.
beforeEach(() => {
  callStructuredMock.mockReset();
});

describe('suggestCvDiff', () => {
  it('serializes snapshot ids and JD into the prompt', async () => {
    callStructuredMock.mockImplementation(async (o: any) => o.validate(good));
    const jd = { title: 'SWE', company: null, location: null, language: null, requirements: ['TS'], keywords: ['react'] };
    await suggestCvDiff(jd, snap());
    const opts = callStructuredMock.mock.calls[0][0];
    expect(opts.user).toContain('"e1"');   // entry ids present
    expect(opts.user).toContain('"b1"');   // bullet ids present
    expect(opts.user).toContain('SWE');    // JD present
    expect(opts.system).toMatch(/never invent|never fabricate|only rephrase/i);
  });
});

describe('validateSuggestions', () => {
  it('drops unknown bullet/entry/skill ids', () => {
    const out = validateSuggestions({
      ...good,
      entry_order: ['e1', 'ghost'],
      bullet_rewrites: [...good.bullet_rewrites, { bullet_id: 'ghost', suggested_text: 'x', reason: 'r' }],
    }, snap());
    expect(out!.entry_order).toEqual(['e1']);
    expect(out!.bullet_rewrites).toHaveLength(1);
  });

  it('returns null on shape violations', () => {
    expect(validateSuggestions({ ...good, bullet_rewrites: 'nope' }, snap())).toBeNull();
    expect(validateSuggestions(null, snap())).toBeNull();
    expect(validateSuggestions({ ...good, bullet_rewrites: [{ bullet_id: 'b1', suggested_text: 'x' }] }, snap())).toBeNull(); // reason required
  });
});
