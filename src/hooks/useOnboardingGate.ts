import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Legacy hook — the staged registration flow now handles gating via
 * `useRegistrationProgress` + `ViewOnlyDashboardShell`. This hook is a
 * no-op preserved for backwards compatibility.
 */
export function useOnboardingGate(_role: 'driver' | 'owner'): { checking: boolean } {
  const { isLoading, isRoleLoading } = useAuth();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!isLoading && !isRoleLoading) setChecking(false);
  }, [isLoading, isRoleLoading]);

  return { checking };
}
