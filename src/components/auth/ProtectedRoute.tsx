import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

type AppRole = 'admin' | 'admin_assistant' | 'owner' | 'driver' | 'legal_support' | 'iot_support' | 'vehicle_support';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, isLoading, userRole, twoFactorVerified } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Save the attempted location for redirect after login
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Check if 2FA has been verified for this session
  if (!twoFactorVerified) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // If roles are specified, check if user has one of the allowed roles
  if (allowedRoles && allowedRoles.length > 0) {
    // Wait for role to hydrate before deciding — avoids a bogus redirect
    // when the session is present but the role fetch has not resolved yet.
    if (userRole === null) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      );
    }
    if (!allowedRoles.includes(userRole)) {
      // Send user to their own home dashboard rather than the landing page
      const roleHome: Record<AppRole, string> = {
        admin: '/admin',
        admin_assistant: '/admin-assistant',
        owner: '/owner/dashboard',
        driver: '/driver/dashboard',
        legal_support: '/support/legal',
        iot_support: '/support/iot',
        vehicle_support: '/support/vehicle',
      };
      return <Navigate to={roleHome[userRole]} replace />;
    }
  }



  return <>{children}</>;
};
