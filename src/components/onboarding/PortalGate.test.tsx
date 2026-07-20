import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { RegistrationProgress } from '@/hooks/useRegistrationProgress';

const progressMock = vi.fn();
vi.mock('@/hooks/useRegistrationProgress', async () => {
  const actual = await vi.importActual<
    typeof import('@/hooks/useRegistrationProgress')
  >('@/hooks/useRegistrationProgress');
  return {
    ...actual,
    useRegistrationProgress: () => progressMock(),
  };
});

import { PortalGate } from './PortalGate';

const withRouter = (ui: React.ReactNode) => (
  <MemoryRouter>{ui}</MemoryRouter>
);

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

describe('PortalGate', () => {
  beforeEach(() => progressMock.mockReset());

  it('shows a loading skeleton while progress is fetching', () => {
    progressMock.mockReturnValue({ data: undefined, isLoading: true });
    render(withRouter(<PortalGate portal="Payments"><div>child</div></PortalGate>));
    expect(screen.getByTestId('portal-gate-loading')).toBeInTheDocument();
    expect(screen.queryByText('child')).not.toBeInTheDocument();
  });

  it('renders children when the required stage is satisfied', () => {
    progressMock.mockReturnValue({
      data: progress({ stage: 'approved', access_level: 'full', email_verified: true }),
      isLoading: false,
    });
    render(
      withRouter(
        <PortalGate portal="Payments" require="approved">
          <div>unlocked-content</div>
        </PortalGate>,
      ),
    );
    expect(screen.getByText('unlocked-content')).toBeInTheDocument();
  });

  it('blocks and shows completed vs remaining steps with progress count', () => {
    progressMock.mockReturnValue({
      data: progress({
        stage: 'account_opened',
        email_verified: true,
      }),
      isLoading: false,
    });
    render(
      withRouter(
        <PortalGate portal="Payments" require="approved">
          <div>hidden</div>
        </PortalGate>,
      ),
    );
    expect(screen.queryByText('hidden')).not.toBeInTheDocument();
    expect(screen.getByTestId('portal-gate-blocker')).toBeInTheDocument();
    expect(screen.getByText('2/4 complete')).toBeInTheDocument();
    expect(
      screen.getByTestId('onboarding-step-authenticated').getAttribute('data-done'),
    ).toBe('true');
    expect(
      screen.getByTestId('onboarding-step-email_verified').getAttribute('data-done'),
    ).toBe('true');
    expect(
      screen.getByTestId('onboarding-step-documents').getAttribute('data-done'),
    ).toBe('false');
    expect(
      screen.getByTestId('onboarding-step-approved').getAttribute('data-done'),
    ).toBe('false');
  });

  it('routes the Continue button to the driver onboarding documents step', () => {
    progressMock.mockReturnValue({
      data: progress({
        role: 'driver',
        stage: 'account_opened',
        email_verified: true,
      }),
      isLoading: false,
    });
    render(
      withRouter(
        <PortalGate portal="Payments"><div /></PortalGate>,
      ),
    );
    const link = screen.getByTestId('portal-gate-continue');
    expect(link?.getAttribute('href')).toBe('/driver/onboarding?step=documents');
  });

  it('routes owners to their onboarding page for the next step', () => {
    progressMock.mockReturnValue({
      data: progress({
        role: 'owner',
        stage: 'documents_submitted',
        email_verified: true,
      }),
      isLoading: false,
    });
    render(
      withRouter(<PortalGate portal="Vehicles"><div /></PortalGate>),
    );
    const link = screen.getByTestId('portal-gate-continue');
    expect(link?.getAttribute('href')).toBe('/owner/onboarding?step=verification');
  });

  it('sends unverified email users to the verify-email route', () => {
    progressMock.mockReturnValue({
      data: progress({ role: 'driver', stage: 'account_opened', email_verified: false }),
      isLoading: false,
    });
    render(withRouter(<PortalGate portal="X" require="email_verified"><div /></PortalGate>));
    const link = screen.getByTestId('portal-gate-continue');
    expect(link?.getAttribute('href')).toBe('/verify-email');
  });

  it('blocks when the requirement is stricter than the current stage', () => {
    progressMock.mockReturnValue({
      data: progress({ stage: 'documents_submitted', email_verified: true }),
      isLoading: false,
    });
    render(
      withRouter(
        <PortalGate portal="Payments" require="approved">
          <div>hidden</div>
        </PortalGate>,
      ),
    );
    expect(screen.queryByText('hidden')).not.toBeInTheDocument();
    expect(screen.getByText(/Complete your onboarding/i)).toBeInTheDocument();
  });
});
