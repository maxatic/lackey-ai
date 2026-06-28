import { describe, it, expect, vi } from 'vitest';

vi.mock('posthog-node', () => ({
  PostHog: vi.fn().mockImplementation(() => ({ capture: vi.fn() })),
}));

import { PostHog } from 'posthog-node';
import { getPostHogServer } from './server';

describe('getPostHogServer', () => {
  it('returns the same instance on repeated calls (memoized)', () => {
    const a = getPostHogServer();
    const b = getPostHogServer();
    expect(a).toBe(b);
    expect(PostHog).toHaveBeenCalledTimes(1);
  });
});
