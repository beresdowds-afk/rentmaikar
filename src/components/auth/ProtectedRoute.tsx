import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_HOME, type AppRole } from "@/lib/role-home";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
}

export const ProtectedRoute = ({
  children,
  allowedRoles,
}: ProtectedRouteProps) => {
  const {
    user,
    session,
    tenantId,
    userRole,

    isLoading,
    isRoleLoading,

    accountStatus,
    profileComplete,
    onboardingStage,
    personaStatus,
    isApproved,

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
          <p className="text-muted-foreground">
            Loading your account...
          </p>
        </div>
      </div>
    );
  }

  //
  // Authentication
  //

  if (!user || !session) {
    return (
      <Navigate
        to="/auth"
        replace
        state={{ from: location }}
      />
    );
  }

  //
  // Tenant validation
  //

  if (!tenantId) {
    return (
      <Navigate
        to="/tenant/select"
        replace
      />
    );
  }

  //
  // Role validation
  //

  if (!userRole) {
    return (
      <Navigate
        to="/account/setup"
        replace
      />
    );
  }

  //
  // Suspended / Disabled accounts
  //

  switch (accountStatus) {
    case "disabled":
      return <Navigate to="/account/disabled" replace />;

    case "suspended":
      return <Navigate to="/account/suspended" replace />;

    case "rejected":
      return <Navigate to="/account/rejected" replace />;
  }

  //
  // Two-factor authentication
  //

  if (
    twoFactorStatus?.requires_2fa &&
    !twoFactorVerified
  ) {
    return (
      <Navigate
        to="/auth"
        replace
        state={{ from: location }}
      />
    );
  }

  //
  // Mandatory profile completion
  //

  if (!profileComplete) {
    return (
      <Navigate
        to="/onboarding/complete-profile"
        replace
        state={{ from: location }}
      />
    );
  }

  //
  // Continue onboarding
  //

  if (onboardingStage !== "completed") {
    return (
      <Navigate
        to="/onboarding"
        replace
        state={{ from: location }}
      />
    );
  }

  //
  // Persona identity verification
  //

  if (personaStatus !== "verified") {
    return (
      <Navigate
        to="/onboarding/verify-identity"
        replace
        state={{ from: location }}
      />
    );
  }

  //
  // Administrative approval
  //

  if (!isApproved) {
    return (
      <Navigate
        to="/approval/pending"
        replace
      />
    );
  }

  //
  // Role authorization
  //

  if (
    allowedRoles &&
    !allowedRoles.includes(userRole)
  ) {
    return (
      <Navigate
        to={ROLE_HOME[userRole] ?? "/"}
        replace
      />
    );
  }

  return <>{children}</>;
};
