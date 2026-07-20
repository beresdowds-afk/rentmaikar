import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useRegistrationProgress } from '@/hooks/useRegistrationProgress';
import { routeForStage } from '@/lib/onboarding-error';
import PageSkeleton from '@/components/PageSkeleton';

/**
 * Entry point for onboarding deep links (mobile + web). Reads current
 * registration progress and routes to the correct next step. Also handles
 * the `/verify-email` route which is our stable public deep link target.
 */
export default function OnboardingRedirect() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { data, isLoading } = useRegistrationProgress();

  useEffect(() => {
    if (isLoading) return;

    // If a stage/step is explicitly requested via deep link, honor it.
    const step = params.get('step');
    const requestedRole = params.get('role') as 'driver' | 'owner' | null;
    const role = data?.role ?? requestedRole ?? 'driver';

    if (step === 'email' || !data?.email_verified) {
      const base = role === 'owner' ? '/owner/onboarding' : '/driver/onboarding';
      // Land on the onboarding page's email step when unverified.
      navigate(`${base}?step=email`, { replace: true });
      return;
    }

    if (step === 'documents' || step === 'verification') {
      const base = role === 'owner' ? '/owner/onboarding' : '/driver/onboarding';
      navigate(`${base}?step=${step}`, { replace: true });
      return;
    }

    navigate(routeForStage(role, data?.stage ?? null), { replace: true });
  }, [data, isLoading, navigate, params]);

  return <PageSkeleton />;
}
