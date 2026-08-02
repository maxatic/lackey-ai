import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Page from './page';

describe('landing page', () => {
  it('renders the hero headline', () => {
    render(<Page />);
    // the headline text is split across spans, so match on a stable fragment
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/German/i);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/job market/i);
  });

  it('leads with the EU-format wedge', () => {
    render(<Page />);
    expect(
      screen.getByText(/Every European format, done right/i),
    ).toBeInTheDocument();
  });
});
