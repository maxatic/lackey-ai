/* eslint-disable @typescript-eslint/no-explicit-any */
import { it, expect, vi, beforeEach } from 'vitest';

const callStructuredMock = vi.fn();
vi.mock('@/lib/ai/client', () => ({
  callStructured: (o: unknown) => callStructuredMock(o),
  AI_MODEL: 'claude-opus-4-8',
}));

import { suggestPoints, validateLetterPoints, sanitizeLetterPoints } from './points';
import type { TrackSnapshot } from '@/lib/cv/data';

const snap = (): TrackSnapshot => ({
  track: { name: 'T', target_title: null, summary: 'summary' },
  profile: { full_name: 'A B', headline: 'Dev', email: null, phone: null, location: null, links: [], date_of_birth: null, nationality: null, marital_status: null },
  entries: [
    { id: 'e1', kind: 'experience', title: 'Dev', organization: 'ACME', location: null, start_date: null, end_date: null, is_current: false, summary: null, details: {}, bullets: [{ id: 'b1', text: 'did x' }] },
    { id: 'e2', kind: 'education', title: 'BSc', organization: null, location: null, start_date: null, end_date: null, is_current: false, summary: null, details: {}, bullets: [] },
  ],
  skills: [{ id: 's1', name: 'TS', category: null }],
  languages: [],
});

const jd = { title: 'SWE', company: 'ACME', location: null, language: null, requirements: ['TS'], keywords: ['react'] };
const goodPoint = { entry_id: 'e1', text: 'Built x at ACME', reason: 'JD wants TS experience' };

// braces matter: mockReset() returns the mock, and vitest calls a function
// returned from beforeEach as a cleanup hook — invoking the mock again.
beforeEach(() => {
  callStructuredMock.mockReset();
});

it('suggestPoints serializes snapshot ids + JD into the prompt and returns validated points', async () => {
  callStructuredMock.mockImplementation(async (o: any) => o.validate({ points: [goodPoint] }));
  await expect(suggestPoints(jd, snap())).resolves.toEqual([goodPoint]);
  const opts = callStructuredMock.mock.calls[0][0];
  expect(opts.user).toContain('"e1"');
  expect(opts.user).toContain('SWE');
  expect(opts.system).toMatch(/never invent/i);
  expect(opts.maxTokens).toBe(4096);
});

it('validateLetterPoints: good shape passes; unknown entry_id dropped; empty array valid', () => {
  expect(validateLetterPoints({ points: [goodPoint] }, snap())).toEqual([goodPoint]);
  expect(validateLetterPoints({ points: [goodPoint, { entry_id: 'ghost', text: 't', reason: 'r' }] }, snap())).toEqual([goodPoint]);
  expect(validateLetterPoints({ points: [] }, snap())).toEqual([]);
});

it('validateLetterPoints: shape violations return null (AI retry)', () => {
  expect(validateLetterPoints(null, snap())).toBeNull();
  expect(validateLetterPoints({ points: 'nope' }, snap())).toBeNull();
  expect(validateLetterPoints({ points: [{ entry_id: 'e1', text: 42, reason: 'r' }] }, snap())).toBeNull();
  expect(validateLetterPoints({ points: [{ entry_id: 'e1', text: 't' }] }, snap())).toBeNull(); // reason required
});

it('sanitizeLetterPoints never throws and filters junk', () => {
  expect(sanitizeLetterPoints(null, snap())).toEqual([]);
  expect(sanitizeLetterPoints('garbage', snap())).toEqual([]);
  expect(sanitizeLetterPoints([goodPoint, { bad: 1 }, { entry_id: 'ghost', text: 't', reason: 'r' }], snap())).toEqual([goodPoint]);
});
