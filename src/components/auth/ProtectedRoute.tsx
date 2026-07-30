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
    // No role resolved (not yet assigned, or the role lookup failed). Do NOT
    // bounce back to the landing page — that looks like the app "logged you
    // out" right after approval. Show an explicit state instead.
    if (userRole === null) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md text-center space-y-3">
            <h1 className="text-xl font-semibold">Your access is still being set up</h1>
            <p className="text-sm text-muted-foreground">
              We couldn’t confirm a role on your account yet. If your application was
              just approved, refresh in a moment — otherwise contact support.
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <button
                onClick={() => window.location.reload()}
                className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
              >
                Refresh
              </button>
              <a href="/" className="rounded-md border px-4 py-2 text-sm">
                Back to home
              </a>
            </div>
          </div>
        </div>
      );
    }

    if (!allowedRoles.includes(userRole)) {
      return <Navigate to={ROLE_HOME[userRole] ?? '/'} replace />;
    }
  }



  return <>{children}</>;
};
