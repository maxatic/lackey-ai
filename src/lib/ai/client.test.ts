/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const createMock = vi.fn();
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: createMock };
  },
}));

import { callStructured } from './client';

beforeEach(() => {
  createMock.mockReset();
  process.env.ANTHROPIC_API_KEY = 'test-key';
});

const opts = {
  system: 'sys',
  user: 'usr',
  toolName: 'emit',
  toolDescription: 'emit result',
  inputSchema: { type: 'object', properties: { a: { type: 'string' } }, required: ['a'], additionalProperties: false },
  validate: (raw: any) => (raw && typeof raw.a === 'string' ? (raw as { a: string }) : null),
};

it('returns the validated tool input', async () => {
  createMock.mockResolvedValue({ content: [{ type: 'tool_use', name: 'emit', input: { a: 'ok' } }] });
  await expect(callStructured(opts)).resolves.toEqual({ a: 'ok' });
  const req = createMock.mock.calls[0][0];
  expect(req.tool_choice).toEqual({ type: 'tool', name: 'emit' });
  expect(req.tools[0].strict).toBe(true);
});

it('retries once on invalid shape, then succeeds', async () => {
  createMock
    .mockResolvedValueOnce({ content: [{ type: 'tool_use', name: 'emit', input: { a: 42 } }] })
    .mockResolvedValueOnce({ content: [{ type: 'tool_use', name: 'emit', input: { a: 'ok' } }] });
  await expect(callStructured(opts)).resolves.toEqual({ a: 'ok' });
  expect(createMock).toHaveBeenCalledTimes(2);
});

it('throws a clean error after two invalid attempts', async () => {
  createMock.mockResolvedValue({ content: [{ type: 'text', text: 'nope' }] });
  await expect(callStructured(opts)).rejects.toThrow('AI returned an unexpected response');
});

it('throws Missing ANTHROPIC_API_KEY when unset', async () => {
  delete process.env.ANTHROPIC_API_KEY;
  await expect(callStructured(opts)).rejects.toThrow('Missing ANTHROPIC_API_KEY');
});
