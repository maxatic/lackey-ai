// Trust boundary: server actions must not leak raw db/AI internals to the client.
// Only these exact messages (all authored by our own code) pass through.
const SAFE_MESSAGES = new Set([
  'Missing ANTHROPIC_API_KEY',
  'AI returned an unexpected response — please try again',
  'Job description is empty',
  'Job description is too long (max 20,000 characters)',
  'Job not found',
  'This job has no parsed data — re-add it',
  'Track not found',
  'Entry not found',
  'Bullet not found',
  'Skill not found',
  'Language not found',
  'Not authenticated',
  'Missing job or track',
  'Invalid locale',
  'No talking points selected — accept at least one point',
  'Invalid status',
  'Notes are too long (max 5,000 characters)',
]);

export const GENERIC_ACTION_ERROR = 'Something went wrong — please try again';

export function toActionError(err: unknown): string {
  const msg = err instanceof Error ? err.message : '';
  return SAFE_MESSAGES.has(msg) ? msg : GENERIC_ACTION_ERROR;
}
