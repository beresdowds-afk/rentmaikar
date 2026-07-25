import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import { useIdentityVerification } from '@/hooks/useIdentityVerification';
import PageSkeleton from '@/components/PageSkeleton';

/**
 * Blocks marketplace-only surfaces (renting, listing, checkout) until:
 *  1. Mandatory profile completion fields are filled, AND
 *  2. Persona identity verification has been approved (real-time).
 *
 * Optional profile fields (license, vehicle ownership, payment method) remain
 * skippable. Users pending / failed identity verification are routed to the
 * verification status page for the next action.
 */
export const MarketplaceGate = ({ children }: { children: ReactNode }) => {
  const profile = useProfileCompletion();
  const identity = useIdentityVerification();
  const location = useLocation();

  if (profile.isLoading || identity.isLoading || !profile.data || !identity.data) {
    return <PageSkeleton />;
  }
  if (!profile.data.authenticated) return <>{children}</>;

  const returnTo = encodeURIComponent(location.pathname + location.search);

  if (!profile.data.mandatory_complete) {
    return <Navigate to={`/onboarding/complete-profile?returnTo=${returnTo}`} replace />;
  }

  if (!identity.data.is_verified) {
    return <Navigate to={`/onboarding/verification-status?returnTo=${returnTo}`} replace />;
  }

  return <>{children}</>;
};

export default MarketplaceGate;
