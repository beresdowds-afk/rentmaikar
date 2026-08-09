import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TrainingStatus {
  authenticated: boolean;
  total_modules: number;
  verified: number;
  pending_review: number;
  rejected: number;
  is_complete: boolean;
  next_due_at: string | null;
}

const DEFAULT: TrainingStatus = {
  authenticated: false,
  total_modules: 0,
  verified: 0,
  pending_review: 0,
  rejected: 0,
  is_complete: false,
  next_due_at: null,
};

export function useTrainingStatus() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['training-status', user?.id],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async (): Promise<TrainingStatus> => {
      const { data, error } = await supabase.rpc('get_my_training_status');
      if (error) throw error;
      return { ...DEFAULT, ...((data ?? {}) as Partial<TrainingStatus>) };
    },
  });
}
