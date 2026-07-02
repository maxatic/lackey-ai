import { it, expect } from 'vitest';
import { toActionError, GENERIC_ACTION_ERROR } from './action-error';

const SAFE = [
  'Missing ANTHROPIC_API_KEY',
  'AI returned an unexpected response — please try again',
  'Job description is empty',
  'Job description is too long (max 20,000 characters)',
  'Job not found',
  'This job has no parsed data — re-add it',
  'Track not found', 'Entry not found', 'Bullet not found', 'Skill not found', 'Language not found',
  'Not authenticated',
  'Missing job or track',
  'Invalid locale',
  'No talking points selected — accept at least one point',
  'Invalid status',
  'Notes are too long (max 5,000 characters)',
];

it('passes through every allowlisted message', () => {
  for (const msg of SAFE) expect(toActionError(new Error(msg))).toBe(msg);
});

it('collapses unknown errors to the generic message', () => {
  expect(toActionError(new Error('duplicate key value violates unique constraint "x"'))).toBe(GENERIC_ACTION_ERROR);
  expect(toActionError({ code: 'PGRST116', message: 'raw postgrest' })).toBe(GENERIC_ACTION_ERROR);
  expect(toActionError('string throw')).toBe(GENERIC_ACTION_ERROR);
  expect(toActionError(undefined)).toBe(GENERIC_ACTION_ERROR);
});
