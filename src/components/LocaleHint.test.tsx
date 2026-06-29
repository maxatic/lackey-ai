// src/components/LocaleHint.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LocaleHint } from './LocaleHint';

describe('LocaleHint', () => {
  it('renders the configured flags for a field', () => {
    render(<LocaleHint field="nationality" />);
    // nationality -> 🇩🇪 🇦🇹 🇫🇷 (3 flags, no 🇨🇭)
    const hint = screen.getByLabelText('Expected by locale conventions');
    expect(hint.textContent).toBe('🇩🇪🇦🇹🇫🇷');
  });

  it('renders a single-flag field correctly', () => {
    render(<LocaleHint field="gender" />);
    expect(screen.getByLabelText('Expected by locale conventions').textContent).toBe('🇩🇪');
  });
});
