import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import PageSkeleton from '@/components/PageSkeleton';

/**
 * Blocks marketplace-only surfaces (renting, listing, checkout) until the
 * user has filled every mandatory profile completion field. Optional fields
 * (license, vehicle ownership, payment method) remain skippable.
 */
export const MarketplaceGate = ({ children }: { children: ReactNode }) => {
  const { data, isLoading } = useProfileCompletion();
  const location = useLocation();

  if (isLoading || !data) return <PageSkeleton />;
  if (!data.authenticated || data.mandatory_complete) return <>{children}</>;

  const returnTo = encodeURIComponent(location.pathname + location.search);
  return <Navigate to={`/onboarding/complete-profile?returnTo=${returnTo}`} replace />;
};

export default MarketplaceGate;
