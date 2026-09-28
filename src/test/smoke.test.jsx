import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';


describe('Test infrastructure', () => {
  it('runs basic assertions', () => {
    expect(1 + 1).toBe(2);
  });

  it('can render and query React', () => {
    render(<div>Hello, tests</div>);
    expect(screen.getByText('Hello, tests')).toBeInTheDocument();
  });
});