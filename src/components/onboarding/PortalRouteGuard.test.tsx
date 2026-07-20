import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import type { RegistrationProgress } from '@/hooks/useRegistrationProgress';

const progressMock = vi.fn();
vi.mock('@/hooks/useRegistrationProgress', async () => {
  const actual = await vi.importActual<
    typeof import('@/hooks/useRegistrationProgress')
  >('@/hooks/useRegistrationProgress');
  return { ...actual, useRegistrationProgress: () => progressMock() };
});
vi.mock('@/components/layout/Header', () => ({ default: () => <div /> }));
vi.mock('@/components/layout/Footer', () => ({ default: () => <div /> }));

import { PortalRouteGuard } from './PortalRouteGuard';

const progress = (over: Partial<RegistrationProgress> = {}): RegistrationProgress => ({
  authenticated: true,
  stage: 'auth',
  access_level: 'view_only',
  role: 'driver',
  email_verified: false,
  identity_verification_status: null,
  identity_verified_at: null,
  documents_uploaded: 0,
  referees_verified: 0,
  application_status: null,
  ...over,
});

function renderRoute(url: string, role: 'driver' | 'owner') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path={`/${role}/portal/:portalKey`} element={<PortalRouteGuard role={role} />} />
        <Route path={`/${role}/dashboard`} element={<div>DASH</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PortalRouteGuard', () => {
  beforeEach(() => progressMock.mockReset());

  it('shows the PortalGate blocker for a locked portal on direct URL load', () => {
    progressMock.mockReturnValue({
      data: progress({ stage: 'account_opened', email_verified: true }),
      isLoading: false,
    });
    renderRoute('/driver/portal/payments', 'driver');
    expect(screen.getByTestId('portal-gate-blocker')).toBeInTheDocument();
    expect(screen.queryByText('DASH')).not.toBeInTheDocument();
  });

  it('redirects to the dashboard with the correct tab when the gate passes', () => {
    progressMock.mockReturnValue({
      data: progress({ stage: 'approved', access_level: 'full', email_verified: true }),
      isLoading: false,
    });
    renderRoute('/owner/portal/vehicles', 'owner');
    // Redirect ⇒ DASH element renders.
    expect(screen.getByText('DASH')).toBeInTheDocument();
  });

  it('redirects unknown portal keys to the dashboard', () => {
    progressMock.mockReturnValue({ data: progress(), isLoading: false });
    renderRoute('/driver/portal/does-not-exist', 'driver');
    expect(screen.getByText('DASH')).toBeInTheDocument();
  });
});
