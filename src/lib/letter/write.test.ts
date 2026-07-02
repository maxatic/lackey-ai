/* eslint-disable @typescript-eslint/no-explicit-any */
import { it, expect, vi, beforeEach } from 'vitest';

const callStructuredMock = vi.fn();
vi.mock('@/lib/ai/client', () => ({
  callStructured: (o: unknown) => callStructuredMock(o),
  AI_MODEL: 'claude-opus-4-8',
}));

import { writeLetter } from './write';

const jd = { title: 'SWE', company: 'ACME', location: null, language: null, requirements: [], keywords: [] };
const points = [{ entry_id: 'e1', text: 'Built x at ACME', reason: 'relevant' }];

// braces matter: mockReset() returns the mock, and vitest calls a function
// returned from beforeEach as a cleanup hook — invoking the mock again.
beforeEach(() => {
  callStructuredMock.mockReset();
});

it('passes ONLY the given points and profile basics into the prompt', async () => {
  callStructuredMock.mockImplementation(async (o: any) => o.validate({ body: 'Dear ACME team, ...' }));
  await expect(writeLetter(jd, points, { full_name: 'A B', headline: 'Dev' })).resolves.toBe('Dear ACME team, ...');
  const opts = callStructuredMock.mock.calls[0][0];
  expect(opts.user).toContain('Built x at ACME');
  expect(opts.user).toContain('A B');
  expect(opts.system).toMatch(/only.*points|points.*only/i);
  expect(opts.system).toMatch(/english/i);
});

it('validator rejects empty/blank body (retry path)', async () => {
  callStructuredMock.mockImplementation(async (o: any) => {
    expect(o.validate({ body: '   ' })).toBeNull();
    expect(o.validate({ body: 42 })).toBeNull();
    expect(o.validate(null)).toBeNull();
    return 'ok-letter';
  });
  await expect(writeLetter(jd, points, { full_name: null, headline: null })).resolves.toBe('ok-letter');
});
