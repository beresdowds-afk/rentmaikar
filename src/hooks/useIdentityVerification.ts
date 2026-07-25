import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type PersonaStatus =
  | 'created'
  | 'pending'
  | 'submitted'
  | 'needs_review'
  | 'approved'
  | 'declined'
  | 'expired'
  | string;

export interface PersonaTimelineEntry {
  inquiry_id: string | null;
  status: PersonaStatus;
  mismatch_fields: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  verified_at: string | null;
}

export interface IdentityVerification {
  authenticated: boolean;
  is_verified: boolean;
  profile_status: PersonaStatus | null;
  profile_verified_at: string | null;
  profile_inquiry_id: string | null;
  latest_inquiry: (PersonaTimelineEntry & { region: string | null; template_id: string | null }) | null;
  timeline: PersonaTimelineEntry[];
}

const DEFAULT: IdentityVerification = {
  authenticated: false,
  is_verified: false,
  profile_status: null,
  profile_verified_at: null,
  profile_inquiry_id: null,
  latest_inquiry: null,
  timeline: [],
};

/**
 * Reads the signed-in user's Persona identity verification status and
 * subscribes to real-time updates on `persona_inquiries` + `profiles` so
 * gates unlock the moment the webhook records a verified state.
 */
export function useIdentityVerification() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['identity-verification', user?.id],
    enabled: !!user,
    staleTime: 15_000,
    queryFn: async (): Promise<IdentityVerification> => {
      const { data, error } = await supabase.rpc('get_my_identity_verification');
      if (error) throw error;
      return { ...DEFAULT, ...(data as Partial<IdentityVerification>) };
    },
  });

  useEffect(() => {
    if (!user) return;
    const invalidate = () =>
      qc.invalidateQueries({ queryKey: ['identity-verification', user.id] });

    const channel = supabase
      .channel(`identity-verification:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'persona_inquiries', filter: `user_id=eq.${user.id}` },
        invalidate,
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `user_id=eq.${user.id}` },
        invalidate,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, qc]);

  return query;
}
