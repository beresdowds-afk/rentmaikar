import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const ONBOARDING_ROUTE: Record<string, string> = {
  driver: '/driver/onboarding',
  owner: '/owner/onboarding',
};

/**
 * Enforces onboarding completion for driver/owner dashboards. If the current
 * user has a driver/owner role but no `profiles.onboarding_completed_at`,
 * redirects them to the role-specific onboarding page.
 *
 * Admins bypass the gate so they can preview dashboards.
 */
export function useOnboardingGate(role: 'driver' | 'owner'): { checking: boolean } {
  const { user, userRole, isLoading, isRoleLoading } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (isLoading || isRoleLoading) return;
    if (!user) {
      setChecking(false);
      return;
    }
    // Admins can preview without completing onboarding.
    if (userRole === 'admin' || userRole !== role) {
      setChecking(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('onboarding_completed_at')
        .eq('user_id', user.id)
        .maybeSingle();
      if (cancelled) return;
      if (!data?.onboarding_completed_at) {
        navigate(ONBOARDING_ROUTE[role], { replace: true });
        return;
      }
      setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, userRole, isLoading, isRoleLoading, role, navigate]);

  return { checking };
}
