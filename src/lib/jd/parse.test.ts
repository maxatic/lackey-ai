import { describe, it, expect, vi, beforeEach } from 'vitest';

const callStructuredMock = vi.fn();
vi.mock('@/lib/ai/client', () => ({
  callStructured: (o: unknown) => callStructuredMock(o),
  AI_MODEL: 'claude-opus-4-8',
}));

import { parseJd, validateParsedJd, JD_MAX_CHARS } from './parse';

beforeEach(() => callStructuredMock.mockReset());

it('rejects empty input without calling the AI', async () => {
  await expect(parseJd('   ')).rejects.toThrow('empty');
  expect(callStructuredMock).not.toHaveBeenCalled();
});

it('rejects oversized input without calling the AI', async () => {
  await expect(parseJd('x'.repeat(JD_MAX_CHARS + 1))).rejects.toThrow('too long');
  expect(callStructuredMock).not.toHaveBeenCalled();
});

it('passes the raw text through and returns the validated result', async () => {
  const parsed = { title: 'SWE', company: 'ACME', location: null, language: 'en', requirements: ['TS'], keywords: ['react'] };
  callStructuredMock.mockResolvedValue(parsed);
  await expect(parseJd('We are hiring a SWE…')).resolves.toEqual(parsed);
  const opts = callStructuredMock.mock.calls[0][0];
  expect(opts.user).toContain('We are hiring a SWE…');
});

// validator, exercised directly (validate fn is passed into callStructured)
it('validateParsedJd accepts a good shape and rejects bad ones', () => {
  expect(validateParsedJd({ title: 'T', company: null, location: null, language: null, requirements: [], keywords: [] })).not.toBeNull();
  expect(validateParsedJd({ title: 42 })).toBeNull();
  expect(validateParsedJd({ title: 'T', company: null, location: null, language: null, requirements: ['a', 7], keywords: [] })).toBeNull();
  expect(validateParsedJd(null)).toBeNull();
});
