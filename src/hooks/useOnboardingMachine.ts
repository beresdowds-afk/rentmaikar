import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface OnboardingMachineState {
  authenticated: boolean;
  role: 'driver' | 'owner' | null;
  next_step: string;
  next_href: string;
  completed: string[];
  steps: string[];
  labels: Record<string, string>;
  hrefs: Record<string, string>;
  percent: number;
  last_visited_step: string | null;
  two_factor_enabled: boolean;
  application_status: string | null;
}

const DEFAULT: OnboardingMachineState = {
  authenticated: false,
  role: null,
  next_step: 'sign_in',
  next_href: '/auth',
  completed: [],
  steps: [],
  labels: {},
  hrefs: {},
  percent: 0,
  last_visited_step: null,
  two_factor_enabled: false,
  application_status: null,
};

/**
 * Single source of truth for onboarding flow. Wraps the
 * `get_onboarding_next_step` RPC and refetches on auth state changes.
 */
export function useOnboardingMachine() {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      qc.invalidateQueries({ queryKey: ['onboarding-machine'] });
    });
    return () => sub.subscription.unsubscribe();
  }, [qc]);

  return useQuery({
    queryKey: ['onboarding-machine', user?.id ?? null],
    enabled: !!user,
    staleTime: 15_000,
    queryFn: async (): Promise<OnboardingMachineState> => {
      const { data, error } = await (supabase.rpc as any)('get_onboarding_next_step');
      if (error) throw error;
      return { ...DEFAULT, ...(data as Partial<OnboardingMachineState>) };
    },
  });
}

export async function setOnboardingLastVisited(step: string) {
  try {
    // @ts-expect-error rpc name may not be in generated types yet
    await supabase.rpc('set_onboarding_last_visited', { _step: step });
  } catch {
    /* best-effort */
  }
}
