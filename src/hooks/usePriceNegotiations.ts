import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type NegotiationStatus = Database['public']['Enums']['negotiation_status'];

export interface PriceNegotiation {
  id: string;
  driver_id: string;
  owner_id: string | null;
  vehicle_id: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_year: number | null;
  vehicle_category: string | null;
  requested_daily_rate: number;
  admin_counter_offer: number | null;
  final_daily_rate: number | null;
  currency: string;
  status: NegotiationStatus | null;
  is_locked: boolean | null;
  driver_message: string | null;
  admin_response: string | null;
  rejection_reason: string | null;
  created_at: string | null;
  updated_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  locked_at: string | null;
  locked_by: string | null;
  // Joined data
  requester_profile?: {
    full_name: string | null;
    email: string | null;
  };
}

export interface ModificationRequest {
  id: string;
  negotiation_id: string;
  requester_id: string;
  requester_type: string;
  current_rate: number;
  requested_rate: number;
  reason: string;
  status: string | null;
  admin_response: string | null;
  created_at: string | null;
  processed_at: string | null;
  processed_by: string | null;
  // Joined data
  negotiation?: PriceNegotiation;
  requester_profile?: {
    full_name: string | null;
    email: string | null;
  };
}

export interface CreateNegotiationData {
  vehicle_id?: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  vehicle_category: string;
  requested_daily_rate: number;
  driver_message?: string;
  currency: string;
  owner_id?: string;
}

export interface CreateModificationData {
  negotiation_id: string;
  current_rate: number;
  requested_rate: number;
  reason: string;
  requester_type: 'driver' | 'owner';
}

// Helper to send notification emails
const sendPriceNotification = async (data: {
  email: string;
  name: string;
  userType: 'driver' | 'owner';
  notificationType: 'approved' | 'rejected' | 'counter_offer' | 'locked' | 'modification_approved' | 'modification_rejected';
  vehicleInfo: string;
  requestedRate: number;
  finalRate?: number;
  counterOffer?: number;
  adminResponse?: string;
  rejectionReason?: string;
  currency: string;
}) => {
  try {
    const { error } = await supabase.functions.invoke('send-price-notification', {
      body: data,
    });
    
    if (error) {
      console.error('Failed to send notification email:', error);
    } else {
      console.log('Notification email sent successfully');
    }
  } catch (err) {
    console.error('Error invoking send-price-notification:', err);
  }
};

export const usePriceNegotiations = (role: 'driver' | 'owner' | 'admin') => {
  const { user } = useAuth();
  const [negotiations, setNegotiations] = useState<PriceNegotiation[]>([]);
  const [modificationRequests, setModificationRequests] = useState<ModificationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch negotiations based on role
  const fetchNegotiations = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      let query = supabase.from('price_negotiations').select('*');
      
      // RLS will handle filtering, but we can add explicit filters for clarity
      if (role === 'driver') {
        query = query.eq('driver_id', user.id);
      } else if (role === 'owner') {
        query = query.eq('owner_id', user.id);
      }
      // Admin sees all via RLS
      
      const { data, error: fetchError } = await query.order('created_at', { ascending: false });
      
      if (fetchError) throw fetchError;
      
      // Fetch profile data for each negotiation
      const negotiationsWithProfiles = await Promise.all(
        (data || []).map(async (neg) => {
          const userId = role === 'admin' ? (neg.driver_id || neg.owner_id) : null;
          if (userId && role === 'admin') {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('user_id', userId)
              .maybeSingle();
            return { ...neg, requester_profile: profile };
          }
          return neg;
        })
      );
      
      setNegotiations(negotiationsWithProfiles);
    } catch (err) {
      console.error('Error fetching negotiations:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch negotiations');
    } finally {
      setIsLoading(false);
    }
  }, [user, role]);

  // Fetch modification requests (admin only or user's own)
  const fetchModificationRequests = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error: fetchError } = await supabase
        .from('price_modification_requests')
        .select(`
          *,
          negotiation:price_negotiations(*)
        `)
        .order('created_at', { ascending: false });
      
      if (fetchError) throw fetchError;
      
      // Fetch profile data for each request
      const requestsWithProfiles = await Promise.all(
        (data || []).map(async (req) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('user_id', req.requester_id)
            .maybeSingle();
          return { ...req, requester_profile: profile };
        })
      );
      
      setModificationRequests(requestsWithProfiles);
    } catch (err) {
      console.error('Error fetching modification requests:', err);
    }
  }, [user]);

  // Create a new negotiation
  const createNegotiation = async (data: CreateNegotiationData) => {
    if (!user) throw new Error('Not authenticated');
    
    const insertData = {
      driver_id: role === 'driver' ? user.id : data.owner_id || user.id,
      owner_id: role === 'owner' ? user.id : null,
      vehicle_id: data.vehicle_id || null,
      vehicle_make: data.vehicle_make,
      vehicle_model: data.vehicle_model,
      vehicle_year: data.vehicle_year,
      vehicle_category: data.vehicle_category,
      requested_daily_rate: data.requested_daily_rate,
      driver_message: data.driver_message || null,
      currency: data.currency,
      status: 'pending' as NegotiationStatus,
      is_locked: false,
    };
    
    const { data: created, error } = await supabase
      .from('price_negotiations')
      .insert(insertData)
      .select()
      .single();
    
    if (error) throw error;
    
    await fetchNegotiations();
    return created;
  };

  // Update negotiation (driver/owner accepting counter offer)
  const acceptCounterOffer = async (negotiationId: string, counterOffer: number) => {
    const { error } = await supabase
      .from('price_negotiations')
      .update({
        status: 'approved' as NegotiationStatus,
        final_daily_rate: counterOffer,
      })
      .eq('id', negotiationId);
    
    if (error) throw error;
    await fetchNegotiations();
  };

  // Admin: Approve negotiation
  const approveNegotiation = async (
    negotiationId: string, 
    finalRate: number, 
    adminResponse: string,
    withLock: boolean = false
  ) => {
    if (!user) throw new Error('Not authenticated');
    
    // Find the negotiation to get requester info
    const negotiation = negotiations.find(n => n.id === negotiationId);
    
    const updateData: Record<string, unknown> = {
      status: withLock ? 'locked' as NegotiationStatus : 'approved' as NegotiationStatus,
      final_daily_rate: finalRate,
      admin_response: adminResponse,
      approved_at: new Date().toISOString(),
      approved_by: user.id,
    };
    
    if (withLock) {
      updateData.is_locked = true;
      updateData.locked_at = new Date().toISOString();
      updateData.locked_by = user.id;
    }
    
    const { error } = await supabase
      .from('price_negotiations')
      .update(updateData)
      .eq('id', negotiationId);
    
    if (error) throw error;
    
    // Send notification email
    if (negotiation?.requester_profile?.email) {
      const userType = negotiation.owner_id ? 'owner' : 'driver';
      await sendPriceNotification({
        email: negotiation.requester_profile.email,
        name: negotiation.requester_profile.full_name || 'User',
        userType,
        notificationType: withLock ? 'locked' : 'approved',
        vehicleInfo: `${negotiation.vehicle_year} ${negotiation.vehicle_make} ${negotiation.vehicle_model}`,
        requestedRate: negotiation.requested_daily_rate,
        finalRate,
        adminResponse,
        currency: negotiation.currency,
      });
    }
    
    await fetchNegotiations();
  };

  // Admin: Send counter offer
  const sendCounterOffer = async (
    negotiationId: string, 
    counterOffer: number, 
    adminResponse: string
  ) => {
    const negotiation = negotiations.find(n => n.id === negotiationId);
    
    const { error } = await supabase
      .from('price_negotiations')
      .update({
        status: 'counter_offer' as NegotiationStatus,
        admin_counter_offer: counterOffer,
        admin_response: adminResponse,
      })
      .eq('id', negotiationId);
    
    if (error) throw error;
    
    // Send notification email
    if (negotiation?.requester_profile?.email) {
      const userType = negotiation.owner_id ? 'owner' : 'driver';
      await sendPriceNotification({
        email: negotiation.requester_profile.email,
        name: negotiation.requester_profile.full_name || 'User',
        userType,
        notificationType: 'counter_offer',
        vehicleInfo: `${negotiation.vehicle_year} ${negotiation.vehicle_make} ${negotiation.vehicle_model}`,
        requestedRate: negotiation.requested_daily_rate,
        counterOffer,
        adminResponse,
        currency: negotiation.currency,
      });
    }
    
    await fetchNegotiations();
  };

  // Admin: Reject negotiation
  const rejectNegotiation = async (negotiationId: string, rejectionReason: string) => {
    const negotiation = negotiations.find(n => n.id === negotiationId);
    
    const { error } = await supabase
      .from('price_negotiations')
      .update({
        status: 'rejected' as NegotiationStatus,
        rejection_reason: rejectionReason,
        admin_response: rejectionReason,
      })
      .eq('id', negotiationId);
    
    if (error) throw error;
    
    // Send notification email
    if (negotiation?.requester_profile?.email) {
      const userType = negotiation.owner_id ? 'owner' : 'driver';
      await sendPriceNotification({
        email: negotiation.requester_profile.email,
        name: negotiation.requester_profile.full_name || 'User',
        userType,
        notificationType: 'rejected',
        vehicleInfo: `${negotiation.vehicle_year} ${negotiation.vehicle_make} ${negotiation.vehicle_model}`,
        requestedRate: negotiation.requested_daily_rate,
        rejectionReason,
        currency: negotiation.currency,
      });
    }
    
    await fetchNegotiations();
  };

  // Create modification request (for locked prices)
  const createModificationRequest = async (data: CreateModificationData) => {
    if (!user) throw new Error('Not authenticated');
    
    const { error } = await supabase
      .from('price_modification_requests')
      .insert({
        negotiation_id: data.negotiation_id,
        requester_id: user.id,
        requester_type: data.requester_type,
        current_rate: data.current_rate,
        requested_rate: data.requested_rate,
        reason: data.reason,
        status: 'pending',
      });
    
    if (error) throw error;
    await fetchModificationRequests();
  };

  // Admin: Process modification request
  const processModificationRequest = async (
    requestId: string, 
    action: 'approve' | 'reject',
    adminResponse?: string
  ) => {
    if (!user) throw new Error('Not authenticated');
    
    const request = modificationRequests.find(r => r.id === requestId);
    if (!request) throw new Error('Request not found');
    
    const { error } = await supabase
      .from('price_modification_requests')
      .update({
        status: action === 'approve' ? 'approved' : 'rejected',
        admin_response: adminResponse || null,
        processed_at: new Date().toISOString(),
        processed_by: user.id,
      })
      .eq('id', requestId);
    
    if (error) throw error;
    
    // If approved, update the negotiation's final rate
    if (action === 'approve' && request.negotiation_id) {
      await supabase
        .from('price_negotiations')
        .update({ final_daily_rate: request.requested_rate })
        .eq('id', request.negotiation_id);
    }
    
    // Send notification email
    if (request.requester_profile?.email && request.negotiation) {
      const userType = request.requester_type as 'driver' | 'owner';
      await sendPriceNotification({
        email: request.requester_profile.email,
        name: request.requester_profile.full_name || 'User',
        userType,
        notificationType: action === 'approve' ? 'modification_approved' : 'modification_rejected',
        vehicleInfo: `${request.negotiation.vehicle_year} ${request.negotiation.vehicle_make} ${request.negotiation.vehicle_model}`,
        requestedRate: request.current_rate,
        finalRate: action === 'approve' ? request.requested_rate : undefined,
        adminResponse,
        rejectionReason: action === 'reject' ? adminResponse : undefined,
        currency: request.negotiation.currency,
      });
    }
    
    await Promise.all([fetchNegotiations(), fetchModificationRequests()]);
  };

  // Initial fetch
  useEffect(() => {
    fetchNegotiations();
    if (role === 'admin') {
      fetchModificationRequests();
    }
  }, [fetchNegotiations, fetchModificationRequests, role]);

  return {
    negotiations,
    modificationRequests,
    isLoading,
    error,
    refetch: fetchNegotiations,
    createNegotiation,
    acceptCounterOffer,
    approveNegotiation,
    sendCounterOffer,
    rejectNegotiation,
    createModificationRequest,
    processModificationRequest,
  };
};

// Hook to fetch owner's vehicles
export const useOwnerVehicles = () => {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Array<{
    id: string;
    make: string;
    model: string;
    year: number;
    status: string | null;
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchVehicles = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, make, model, year, status')
        .eq('owner_id', user.id);
      
      if (error) {
        console.error('Error fetching vehicles:', error);
        toast.error('Failed to load vehicles');
      } else {
        setVehicles(data || []);
      }
      setIsLoading(false);
    };
    
    fetchVehicles();
  }, [user]);

  return { vehicles, isLoading };
};
