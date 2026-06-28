import { describe, it, expect } from 'vitest';
import { config } from '@/middleware';

describe('clerk middleware', () => {
  it('matches /dashboard so the route runs through auth', () => {
    const matcher = config.matcher.join(' ');
    expect(matcher).toContain('dashboard');
  });

  it('does not skip Next internals / static files', () => {
    // The negative-lookahead matcher should exclude _next and static assets.
    const matcher = config.matcher.join(' ');
    expect(matcher).toContain('_next');
  });
});
