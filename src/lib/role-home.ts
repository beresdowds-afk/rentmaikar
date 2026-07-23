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

/** First-login destination for roles that must complete role-specific onboarding. */
export const ROLE_ONBOARDING: Partial<Record<AppRole, string>> = {
  driver: '/driver/onboarding',
  owner: '/owner/onboarding',
};

export function homeForRole(role: AppRole | null | undefined, fallback = '/'): string {
  if (!role) return fallback;
  return ROLE_HOME[role] ?? fallback;
}
