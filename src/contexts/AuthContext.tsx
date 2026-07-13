import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'admin' | 'admin_assistant' | 'owner' | 'driver' | 'legal_support' | 'iot_support' | 'vehicle_support';

interface TwoFactorStatus {
  requires_2fa: boolean;
  is_setup: boolean;
  is_mandatory: boolean;
  has_phone: boolean;
  preferred_channel: string;
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  userRole: AppRole | null;
  isRoleLoading: boolean;
  twoFactorStatus: TwoFactorStatus | null;
  twoFactorVerified: boolean;
  setTwoFactorVerified: (verified: boolean) => void;
  signUp: (email: string, password: string, fullName: string, role: AppRole) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; userId?: string }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  check2FAStatus: (userId: string) => Promise<TwoFactorStatus | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [twoFactorStatus, setTwoFactorStatus] = useState<TwoFactorStatus | null>(null);
  const [twoFactorVerified, setTwoFactorVerified] = useState(false);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching user role:', error);
        return null;
      }
      
      return data?.role as AppRole | null;
    } catch (err) {
      console.error('Error in fetchUserRole:', err);
      return null;
    }
  };

  const check2FAStatus = async (userId: string): Promise<TwoFactorStatus | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('send-2fa-code', {
        body: { action: 'status', user_id: userId },
      });
      if (error || !data?.success) return null;

      // Also get the phone number from 2FA settings
      const { data: settings } = await supabase
        .from('two_factor_settings')
        .select('phone_number, preferred_channel')
        .eq('user_id', userId)
        .maybeSingle();

      const status: TwoFactorStatus = {
        requires_2fa: data.requires_2fa,
        is_setup: data.is_setup,
        is_mandatory: data.is_mandatory,
        has_phone: data.has_phone,
        preferred_channel: data.preferred_channel || 'sms',
        phone: settings?.phone_number || undefined,
      };
      setTwoFactorStatus(status);
      return status;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer role fetching to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchUserRole(session.user.id).then(setUserRole);
          }, 0);
        } else {
          setUserRole(null);
          setTwoFactorStatus(null);
          setTwoFactorVerified(false);
        }
        
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserRole(session.user.id).then(setUserRole);
        // For existing sessions, assume 2FA was previously verified
        setTwoFactorVerified(true);
      }
      
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string, role: AppRole) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        return { error };
      }

      // Assign role to user
      if (data.user) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({ user_id: data.user.id, role });
        
        if (roleError) {
          console.error('Error assigning role:', roleError);
        }
      }

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error };
      }

      // Don't mark 2FA as verified yet — the Auth page will handle the challenge
      setTwoFactorVerified(false);

      return { error: null, userId: data.user?.id };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserRole(null);
    setTwoFactorStatus(null);
    setTwoFactorVerified(false);
  };

  const hasRole = (role: AppRole) => {
    return userRole === role;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        userRole,
        twoFactorStatus,
        twoFactorVerified,
        setTwoFactorVerified,
        signUp,
        signIn,
        signOut,
        hasRole,
        check2FAStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
