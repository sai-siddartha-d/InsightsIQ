import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Badge from '../Badge';


describe('Badge', () => {
  it('renders its children', () => {
    render(<Badge>Live</Badge>);
    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('applies the default variant class when no variant given', () => {
    const { container } = render(<Badge>x</Badge>);
    expect(container.firstChild.className).toMatch(/bg-neutral/);
  });

  it('applies the success variant class', () => {
    const { container } = render(<Badge variant="success">OK</Badge>);
    expect(container.firstChild.className).toMatch(/bg-success/);
  });

  it('applies the danger variant class', () => {
    const { container } = render(<Badge variant="danger">x</Badge>);
    expect(container.firstChild.className).toMatch(/bg-danger/);
  });

  it('applies size classes', () => {
    const { container, rerender } = render(<Badge size="xs">x</Badge>);
    expect(container.firstChild.className).toMatch(/text-\[10px\]/);
    rerender(<Badge size="lg">x</Badge>);
    expect(container.firstChild.className).toMatch(/text-xs/);
  });

  it('renders a dot when dot prop is true', () => {
    const { container } = render(<Badge dot>Live</Badge>);
    const dot = container.querySelector('span.rounded-full');
    expect(dot).toBeInTheDocument();
  });

  it('does not render a dot by default', () => {
    const { container } = render(<Badge>Live</Badge>);
    const dot = container.querySelector('span.rounded-full');
    expect(dot).toBeNull();
  });
});