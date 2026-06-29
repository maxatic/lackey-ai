import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Page from './page';

describe('landing page', () => {
  it('renders the hero headline', () => {
    render(<Page />);
    // the headline text is split across spans, so match on a stable fragment
    expect(screen.getByText(/you are\s*applying to\./i)).toBeInTheDocument();
  });

  it('leads with the EU-format wedge', () => {
    render(<Page />);
    expect(
      screen.getByText(/Every European format, done right/i),
    ).toBeInTheDocument();
  });
});
