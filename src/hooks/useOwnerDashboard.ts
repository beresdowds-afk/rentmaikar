import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useOwnerDashboard() {
  const { user } = useAuth();

  const { data: vehicles, isLoading: vehiclesLoading } = useQuery({
    queryKey: ['owner-vehicles', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: rentals, isLoading: rentalsLoading } = useQuery({
    queryKey: ['owner-rentals', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('rentals')
        .select('*, vehicles(*)')
        .eq('owner_id', user.id)
        .eq('status', 'active');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: earnings, isLoading: earningsLoading } = useQuery({
    queryKey: ['owner-earnings', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('owner_earnings')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const totalEarnings = earnings
    ?.filter(e => e.status === 'paid')
    .reduce((sum, e) => sum + Number(e.amount), 0) ?? 0;

  const availableBalance = earnings
    ?.filter(e => e.status === 'pending')
    .reduce((sum, e) => sum + Number(e.amount), 0) ?? 0;

  const activeRentals = rentals?.length ?? 0;

  return {
    vehicles: vehicles || [],
    rentals: rentals || [],
    earnings: earnings || [],
    totalEarnings,
    availableBalance,
    activeRentals,
    isLoading: vehiclesLoading || rentalsLoading || earningsLoading,
  };
}
