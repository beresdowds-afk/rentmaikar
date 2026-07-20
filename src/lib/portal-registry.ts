import type { Requirement } from '@/components/onboarding/PortalGate';

export interface PortalDef {
  title: string;
  require: Requirement;
  /** The dashboard tab value to activate on the corresponding dashboard. */
  tab: string;
}

export const DRIVER_PORTALS: Record<string, PortalDef> = {
  payments: { title: 'Payments', require: 'approved', tab: 'payments' },
  incidents: { title: 'Report Incident', require: 'documents', tab: 'incidents' },
  inspection: { title: 'Weekly Inspection', require: 'approved', tab: 'inspection' },
  rideshare: { title: 'Rideshare Profile', require: 'documents', tab: 'rideshare' },
  training: { title: 'Driver Training', require: 'email_verified', tab: 'training' },
  agreements: { title: 'Legal Agreements', require: 'documents', tab: 'agreements' },
  subscriptions: { title: 'Subscriptions', require: 'email_verified', tab: 'subscriptions' },
  browse: { title: 'Browse Vehicles', require: 'approved', tab: 'browse' },
};

export const OWNER_PORTALS: Record<string, PortalDef> = {
  vehicles: { title: 'My Vehicles', require: 'approved', tab: 'vehicles' },
  earnings: { title: 'Earnings', require: 'approved', tab: 'earnings' },
  withdrawals: { title: 'Withdrawals', require: 'approved', tab: 'withdrawals' },
  iot: { title: 'IoT Devices', require: 'approved', tab: 'iot' },
  pickup: { title: 'Pickup Locations', require: 'documents', tab: 'pickup' },
  agreements: { title: 'Legal Agreements', require: 'documents', tab: 'agreements' },
  recalls: { title: 'Vehicle Recalls', require: 'approved', tab: 'recalls' },
  pricing: { title: 'Pricing', require: 'approved', tab: 'pricing' },
  insurance: { title: 'Insurance & Roadside', require: 'email_verified', tab: 'insurance' },
  'rent-to-own': { title: 'Rent to Own', require: 'approved', tab: 'rent-to-own' },
};

export function getPortal(role: 'driver' | 'owner', key: string): PortalDef | null {
  const registry = role === 'driver' ? DRIVER_PORTALS : OWNER_PORTALS;
  return registry[key] ?? null;
}
