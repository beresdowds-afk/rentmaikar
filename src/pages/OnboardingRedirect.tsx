import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useRegistrationProgress } from '@/hooks/useRegistrationProgress';
import { routeForStage } from '@/lib/onboarding-error';
import PageSkeleton from '@/components/PageSkeleton';
import { trackOnboardingEvent } from '@/lib/onboarding-analytics';
import { recordDeepLinkExpectedStage } from '@/hooks/useOnboardingProgressReconciliation';

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

    const step = params.get('step');
    const requestedRole = params.get('role') as 'driver' | 'owner' | null;
    const role = data?.role ?? requestedRole ?? 'driver';
    const originParam = params.get('origin');
    const origin =
      originParam === 'native' || originParam === 'push' || originParam === 'email'
        ? originParam
        : 'web';

    // Record the stage this deep link expected so the reconciliation hook
    // can flag divergence on app resume.
    recordDeepLinkExpectedStage(step ?? data?.stage ?? 'auth');

    trackOnboardingEvent('deep_link_opened', {
      role,
      stage: data?.stage ?? null,
      origin,
      extra: { step },
    });

    if (step === 'email' || !data?.email_verified) {
      const base = role === 'owner' ? '/owner/onboarding' : '/driver/onboarding';
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
