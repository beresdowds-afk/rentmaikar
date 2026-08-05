/**
 * Single source of truth for the "home" route each application role lands on.
 * Used by ProtectedRoute, Auth redirects, and dashboard gates so the map can
 * never drift between call sites.
 */
export type AppRole =
  | 'admin'
  | 'admin_assistant'
  | 'owner'
  | 'driver'
  | 'legal_support'
  | 'iot_support'
  | 'vehicle_support';

export const ROLE_HOME: Record<AppRole, string> = {
  admin: '/admin',
  admin_assistant: '/admin-assistant',
  owner: '/owner/dashboard',
  driver: '/driver/dashboard',
  legal_support: '/support/legal',
  iot_support: '/support/iot',
  vehicle_support: '/support/vehicle',
};

/**
 * First-login destination for every role. Driver/owner have dedicated
 * onboarding flows; all other roles land on their dashboard home, which is an
 * acceptable "next step" target for gates.
 */
export const ROLE_ONBOARDING: Record<AppRole, string> = {
  driver: '/driver/onboarding',
  owner: '/owner/onboarding',
  admin: ROLE_HOME.admin,
  admin_assistant: ROLE_HOME.admin_assistant,
  legal_support: ROLE_HOME.legal_support,
  iot_support: ROLE_HOME.iot_support,
  vehicle_support: ROLE_HOME.vehicle_support,
};

/** Onboarding entry point for a role, falling back to the driver flow. */
export function onboardingForRole(role: AppRole | null | undefined): string {
  if (!role) return '/driver/onboarding';
  return ROLE_ONBOARDING[role] ?? '/driver/onboarding';
}


export function homeForRole(role: AppRole | null | undefined, fallback = '/'): string {
  if (!role) return fallback;
  return ROLE_HOME[role] ?? fallback;
}
