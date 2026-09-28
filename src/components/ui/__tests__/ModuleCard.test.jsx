import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ModuleCard from '../ModuleCard';


function renderInRouter(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}


describe('ModuleCard', () => {
  const activeModule = {
    id: 'pempal',
    name: 'Pempal',
    description: 'In-season promotion planning.',
    path: '/modules/pempal',
    status: 'active',
  };

  const placeholderModule = {
    id: 'krypton',
    name: 'Krypton',
    description: 'Pre-season investment planning.',
    path: '/modules/krypton',
    status: 'placeholder',
  };

  it('renders the module name', () => {
    renderInRouter(<ModuleCard module={activeModule} />);
    expect(screen.getByText('Pempal')).toBeInTheDocument();
  });

  it('renders the module description', () => {
    renderInRouter(<ModuleCard module={activeModule} />);
    expect(screen.getByText(/In-season promotion planning/)).toBeInTheDocument();
  });

  it('shows "Live" badge for active modules', () => {
    renderInRouter(<ModuleCard module={activeModule} />);
    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('shows "Coming Soon" badge for placeholder modules', () => {
    renderInRouter(<ModuleCard module={placeholderModule} />);
    expect(screen.getByText('Coming Soon')).toBeInTheDocument();
  });

  it('shows "Open module" CTA for active modules', () => {
    renderInRouter(<ModuleCard module={activeModule} />);
    expect(screen.getByText('Open module')).toBeInTheDocument();
  });

  it('shows "View details" CTA for placeholder modules', () => {
    renderInRouter(<ModuleCard module={placeholderModule} />);
    expect(screen.getByText('View details')).toBeInTheDocument();
  });

  it('renders the module initial in an icon box', () => {
    renderInRouter(<ModuleCard module={activeModule} />);
    expect(screen.getByText('P')).toBeInTheDocument();
  });

  it('is rendered as a button (clickable)', () => {
    renderInRouter(<ModuleCard module={activeModule} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('clicking the card does not throw', async () => {
    renderInRouter(<ModuleCard module={activeModule} />);
    await userEvent.click(screen.getByRole('button'));
  });
});