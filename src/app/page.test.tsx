import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Page from '@/app/page';

describe('home page', () => {
  it('renders without crashing', () => {
    render(<Page />);
    expect(document.body.firstChild).not.toBeNull();
  });
});
