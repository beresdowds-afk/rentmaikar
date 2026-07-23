import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { ROLE_HOME, type AppRole } from '@/lib/role-home';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, isLoading, userRole, isRoleLoading, twoFactorVerified } = useAuth();
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
    // Wait for role fetch to complete — but only while actually loading.
    if (isRoleLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      );
    }
    // No role assigned — send home rather than trapping the user.
    if (userRole === null) {
      return <Navigate to="/" replace />;
    }
    if (!allowedRoles.includes(userRole)) {
      return <Navigate to={ROLE_HOME[userRole] ?? '/'} replace />;
    }
  }



  return <>{children}</>;
};
