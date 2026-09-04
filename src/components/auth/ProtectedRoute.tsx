import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_HOME, type AppRole } from "@/lib/role-home";
import { rememberReturnTo } from "@/lib/return-to";
import { useAssistantPermissions } from "@/hooks/useAssistantPermissions";
import type { PermissionKey } from "@/components/admin/AdminAssistantManagement";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
  /**
   * Extra gate on top of the role check: non-admin staff (assistants and
   * support staff) must have this permission explicitly granted by the
   * administrator in the role management portal.
   */
  requiredPermission?: PermissionKey;
}

export const ProtectedRoute = ({
  children,
  allowedRoles,
  requiredPermission,
}: ProtectedRouteProps) => {
  const { isFullAdmin, perms, loading: permsLoading } = useAssistantPermissions();

  const {
    user,
    session,
    userRole,
    isLoading,
    isRoleLoading,
    twoFactorStatus,
    twoFactorVerified,
  } = useAuth();

  const location = useLocation();

  const loading = isLoading || isRoleLoading;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your account...</p>
        </div>
      </div>
    );
  }

  const fullPath = `${location.pathname}${location.search}${location.hash}`;

  if (!user || !session) {
    rememberReturnTo(fullPath);
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  if (twoFactorStatus?.requires_2fa && !twoFactorVerified) {
    rememberReturnTo(fullPath);
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }


  // Admins bypass role restrictions everywhere (matches DashboardAuthGate).
  const effectiveAllowed =
    allowedRoles && !allowedRoles.includes("admin")
      ? ([...allowedRoles, "admin"] as AppRole[])
      : allowedRoles;

  if (effectiveAllowed && (!userRole || !effectiveAllowed.includes(userRole))) {
    return <Navigate to={(userRole && ROLE_HOME[userRole]) ?? "/"} replace />;
  }


  return <>{children}</>;
};
