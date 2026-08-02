// src/components/LocaleHint.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LocaleHint } from './LocaleHint';

describe('LocaleHint', () => {
  it('renders the configured flags for a field', () => {
    render(<LocaleHint field="nationality" />);
    const hint = screen.getByLabelText('Expected on a German Lebenslauf');
    expect(hint.textContent).toBe('🇩🇪');
  });

  it('renders a single-flag field correctly', () => {
    render(<LocaleHint field="gender" />);
    expect(screen.getByLabelText('Expected on a German Lebenslauf').textContent).toBe('🇩🇪');
  });
});
