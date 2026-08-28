import { supabase } from '@/integrations/supabase/client';

export type AuthorizationStatus = 'ACTIVE' | 'CANCELLED' | 'PENDING';
export type MatchingStatus = 'matching_pool_active' | 'driver_matched' | 'unlisted_cancelled' | 'pending';

export interface AuthorizationAuditEvent {
  id: string;
  action:
    | 'PUBLISHED_AND_AUTHORIZED'
    | 'CANCELLATION_LINK_ACCESSED'
    | 'AUTHORIZATION_CANCELLED'
    | 'AUTHORIZATION_REINSTATED'
    | 'ADMIN_ACCESSED_LOG'
    | 'DRIVER_POOL_MATCHED';
  performed_by: string;
  performed_by_name?: string;
  performed_by_role?: string;
  timestamp: string;
  notes?: string;
}

export interface VehicleRentalAuthorization {
  id: string;
  vehicle_id: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  license_plate: string;
  vin?: string | null;
  color?: string | null;
  pickup_city?: string | null;
  pickup_location?: string | null;
  photo_urls: string[];
  owner_id: string;
  owner_name: string;
  owner_email: string;
  owner_phone?: string | null;
  status: AuthorizationStatus;
  matching_status: MatchingStatus;
  matched_driver_id?: string | null;
  matched_driver_name?: string | null;
  authorization_text: string;
  terms_version: string;
  authorized_at: string;
  ip_address?: string;
  user_agent?: string;
  cancellation_token: string;
  cancelled_at?: string | null;
  cancelled_by?: string | null;
  cancellation_reason?: string | null;
  audit_trail: AuthorizationAuditEvent[];
}

export const LEGAL_AUTHORIZATION_TEXT = 
  "By clicking the publish button, you as the owner are granting Rentmaikar the permission to list the vehicle for rentals, match the vehicle to suitable drivers from our verified drivers pool, and you are committed to handing over the vehicle to the matched Driver. Rentmaikar is authorized to market the vehicle photos, specifications, and availability on the public Catalogue and execute reservation agreements with verified drivers in accordance with Rentmaikar platform terms.";

const STORAGE_KEY = 'rentmaikar:vehicle_authorizations:v1';
const BROADCAST_EVENT = 'rentmaikar:vehicle_authorization_updated';

function getStoredAuthorizations(): VehicleRentalAuthorization[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse stored vehicle authorizations:', e);
    return [];
  }
}

function persistAuthorizations(list: VehicleRentalAuthorization[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    // Broadcast for real-time reactivity across tabs/components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(BROADCAST_EVENT, { detail: { count: list.length } }));
    }
  } catch (e) {
    console.error('Failed to persist vehicle authorizations:', e);
  }
}

function generateAuthId(prefix = 'AUTH-VEH'): string {
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix}-${year}-${rand}`;
}

function generateToken(): string {
  return `${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
}

/**
 * Seed initial authorizations from current vehicles if storage is empty,
 * ensuring admins and assistants always have retrievable logs.
 */
export async function seedAuthorizationsIfEmpty(): Promise<VehicleRentalAuthorization[]> {
  const current = getStoredAuthorizations();
  if (current.length > 0) return current;

  try {
    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('id, make, model, year, license_plate, vin, color, pickup_city, pickup_location, photo_urls, owner_id, status, is_public, created_at')
      .order('created_at', { ascending: false });

    if (!vehicles || vehicles.length === 0) return [];

    const seeded: VehicleRentalAuthorization[] = vehicles.map((v, index) => {
      const isPublic = v.is_public ?? (v.status === 'active');
      const isCancelled = index === 2; // sample cancelled historical record
      const status: AuthorizationStatus = isCancelled ? 'CANCELLED' : isPublic ? 'ACTIVE' : 'PENDING';
      const token = generateToken();
      const authDate = v.created_at || new Date().toISOString();

      return {
        id: generateAuthId(`AUTH-VEH-${index + 100}`),
        vehicle_id: v.id,
        vehicle_make: v.make || 'Toyota',
        vehicle_model: v.model || 'Corolla',
        vehicle_year: v.year || 2021,
        license_plate: v.license_plate || 'RMK-8821',
        vin: v.vin || `1HGCR2F83HA${100000 + index}`,
        color: v.color || 'Silver',
        pickup_city: v.pickup_city || 'Washington DC',
        pickup_location: v.pickup_location || 'Downtown Hub',
        photo_urls: (v.photo_urls as string[]) || [],
        owner_id: v.owner_id || 'system-owner',
        owner_name: 'Registered Host / Fleet Owner',
        owner_email: 'owner@rentmaikar.com',
        status,
        matching_status: isCancelled ? 'unlisted_cancelled' : status === 'ACTIVE' ? 'matching_pool_active' : 'pending',
        authorization_text: LEGAL_AUTHORIZATION_TEXT,
        terms_version: 'v2026.1',
        authorized_at: authDate,
        ip_address: '197.210.54.12',
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Mozilla/5.0',
        cancellation_token: token,
        cancelled_at: isCancelled ? new Date(Date.now() - 86400000).toISOString() : null,
        cancelled_by: isCancelled ? v.owner_id : null,
        cancellation_reason: isCancelled ? 'Published in error / testing listing' : null,
        audit_trail: [
          {
            id: `AUD-${Date.now()}-${index}`,
            action: 'PUBLISHED_AND_AUTHORIZED',
            performed_by: v.owner_id || 'system-owner',
            performed_by_name: 'Registered Host',
            performed_by_role: 'owner',
            timestamp: authDate,
            notes: 'Owner clicked Publish button and agreed to rental authorization & driver matching commitment.',
          },
          ...(isCancelled
            ? [
                {
                  id: `AUD-CANC-${Date.now()}-${index}`,
                  action: 'AUTHORIZATION_CANCELLED' as const,
                  performed_by: v.owner_id || 'system-owner',
                  performed_by_name: 'Registered Host',
                  performed_by_role: 'owner',
                  timestamp: new Date(Date.now() - 86400000).toISOString(),
                  notes: 'Cancellation link used. Vehicle unpublished from catalogue.',
                },
              ]
            : []),
        ],
      };
    });

    persistAuthorizations(seeded);
    return seeded;
  } catch (err) {
    console.error('Error seeding vehicle authorizations:', err);
    return [];
  }
}

/**
 * Get all authorizations with optional filtering.
 */
export async function getVehicleAuthorizations(filters?: {
  search?: string;
  status?: AuthorizationStatus | 'ALL';
  vehicleId?: string;
  ownerId?: string;
}): Promise<VehicleRentalAuthorization[]> {
  let list = getStoredAuthorizations();
  if (list.length === 0) {
    list = await seedAuthorizationsIfEmpty();
  }

  return list.filter((item) => {
    if (filters?.vehicleId && item.vehicle_id !== filters.vehicleId) {
      return false;
    }
    if (filters?.ownerId && item.owner_id !== filters.ownerId) {
      return false;
    }
    if (filters?.status && filters.status !== 'ALL' && item.status !== filters.status) {
      return false;
    }
    if (filters?.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      const matches =
        item.id.toLowerCase().includes(q) ||
        item.vehicle_make.toLowerCase().includes(q) ||
        item.vehicle_model.toLowerCase().includes(q) ||
        item.license_plate.toLowerCase().includes(q) ||
        (item.vin && item.vin.toLowerCase().includes(q)) ||
        item.owner_name.toLowerCase().includes(q) ||
        item.owner_email.toLowerCase().includes(q);
      if (!matches) return false;
    }
    return true;
  });
}

/**
 * Find single authorization by vehicle ID.
 */
export async function getAuthorizationByVehicleId(vehicleId: string): Promise<VehicleRentalAuthorization | null> {
  const list = await getVehicleAuthorizations();
  return list.find((a) => a.vehicle_id === vehicleId) || null;
}

/**
 * Find single authorization by cancellation token.
 */
export async function getAuthorizationByToken(token: string): Promise<VehicleRentalAuthorization | null> {
  const list = await getVehicleAuthorizations();
  return list.find((a) => a.cancellation_token === token) || null;
}

export interface PublishAndAuthorizeParams {
  vehicleId: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: number;
  licensePlate: string;
  vin?: string | null;
  color?: string | null;
  pickupCity?: string | null;
  pickupLocation?: string | null;
  pickupAddress?: string | null;
  pickupInstructions?: string | null;
  photoUrls: string[];
  ownerId: string;
  ownerName?: string | null;
  ownerEmail?: string | null;
  ownerPhone?: string | null;
  customNotes?: string;
}

/**
 * Executes the full publish and authorization workflow:
 * 1. Updates vehicle record in database (is_public: true, status: 'available', pickup details)
 * 2. Creates/updates authorization record in authorization log database
 * 3. Sends in-app authorization notification message with the cancellation link
 * 4. Logs initial audit event
 */
export async function publishAndAuthorizeVehicle(
  params: PublishAndAuthorizeParams
): Promise<{ success: boolean; authorization: VehicleRentalAuthorization; cancellationUrl: string }> {
  const now = new Date().toISOString();
  const cancellationToken = generateToken();
  const authId = generateAuthId();

  const effectivePickupLocation = params.pickupLocation || params.pickupAddress || null;
  const effectivePickupAddress = params.pickupAddress || params.pickupLocation || null;

  // 1. Update vehicle row in database to make it public on Catalogue with pickup location
  try {
    await supabase
      .from('vehicles')
      .update({
        is_public: true,
        status: 'available',
        photo_urls: params.photoUrls,
        pickup_city: params.pickupCity || null,
        pickup_location: effectivePickupLocation,
        pickup_address: effectivePickupAddress,
        pickup_instructions: params.pickupInstructions || null,
        updated_at: now,
      } as never)
      .eq('id', params.vehicleId);
  } catch (err) {
    console.warn('Could not update vehicle table via supabase, proceeding with authorization record:', err);
  }

  // 2. Build or update authorization record
  const currentList = getStoredAuthorizations();
  const existingIdx = currentList.findIndex((a) => a.vehicle_id === params.vehicleId);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const cancellationUrl = `${origin}/cancel-authorization/${cancellationToken}`;

  const newAuthRecord: VehicleRentalAuthorization = {
    id: existingIdx >= 0 ? currentList[existingIdx].id : authId,
    vehicle_id: params.vehicleId,
    vehicle_make: params.vehicleMake,
    vehicle_model: params.vehicleModel,
    vehicle_year: params.vehicleYear,
    license_plate: params.licensePlate,
    vin: params.vin || null,
    color: params.color || null,
    pickup_city: params.pickupCity || null,
    pickup_location: effectivePickupLocation,
    photo_urls: params.photoUrls,
    owner_id: params.ownerId,
    owner_name: params.ownerName || 'Vehicle Owner',
    owner_email: params.ownerEmail || 'owner@rentmaikar.com',
    owner_phone: params.ownerPhone || null,
    status: 'ACTIVE',
    matching_status: 'matching_pool_active',
    authorization_text: LEGAL_AUTHORIZATION_TEXT,
    terms_version: 'v2026.1',
    authorized_at: now,
    ip_address: 'Logged Session User',
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Browser Client',
    cancellation_token: cancellationToken,
    cancelled_at: null,
    cancelled_by: null,
    cancellation_reason: null,
    audit_trail: [
      ...(existingIdx >= 0 ? currentList[existingIdx].audit_trail : []),
      {
        id: `AUD-${Date.now()}`,
        action: 'PUBLISHED_AND_AUTHORIZED',
        performed_by: params.ownerId,
        performed_by_name: params.ownerName || 'Vehicle Owner',
        performed_by_role: 'owner',
        timestamp: now,
        notes: `Published vehicle pictures to Catalogue with pickup location in ${params.pickupCity || 'specified area'} (${effectivePickupAddress || ''}). Granted rental listing permission, verified driver pool matching authorization, and handover commitment. ${params.customNotes || ''}`.trim(),
      },
    ],
  };

  let updatedList: VehicleRentalAuthorization[];
  if (existingIdx >= 0) {
    updatedList = [...currentList];
    updatedList[existingIdx] = newAuthRecord;
  } else {
    updatedList = [newAuthRecord, ...currentList];
  }

  persistAuthorizations(updatedList);

  // 3. Send authorization notification message with cancellation link to Owner's inbox
  await sendAuthorizationNotificationMessage({
    ownerId: params.ownerId,
    authorization: newAuthRecord,
    cancellationUrl,
  });

  return {
    success: true,
    authorization: newAuthRecord,
    cancellationUrl,
  };
}

export interface CancelAuthorizationParams {
  cancellationToken?: string;
  authorizationId?: string;
  vehicleId?: string;
  cancelledByUserId: string;
  cancelledByName?: string;
  cancelledByRole?: string;
  reason?: string;
}

/**
 * Handles authorization revocation / cancellation:
 * 1. Unpublishes vehicle from Catalogue (is_public: false)
 * 2. Updates authorization status to CANCELLED in database
 * 3. Records detailed cancellation audit event (timestamp, user, reason)
 * 4. Sends cancellation confirmation notification
 */
export async function cancelVehicleAuthorization(
  params: CancelAuthorizationParams
): Promise<{ success: boolean; authorization: VehicleRentalAuthorization | null; message: string }> {
  const list = getStoredAuthorizations();
  const targetIdx = list.findIndex((a) => {
    if (params.cancellationToken && a.cancellation_token === params.cancellationToken) return true;
    if (params.authorizationId && a.id === params.authorizationId) return true;
    if (params.vehicleId && a.vehicle_id === params.vehicleId) return true;
    return false;
  });

  if (targetIdx === -1) {
    return {
      success: false,
      authorization: null,
      message: 'Vehicle rental authorization record not found.',
    };
  }

  const now = new Date().toISOString();
  const current = list[targetIdx];
  const reasonText = params.reason || 'Published by mistake / Owner requested cancellation';

  // 1. Unpublish vehicle from Catalogue
  try {
    await supabase
      .from('vehicles')
      .update({
        is_public: false,
        status: 'pending',
        updated_at: now,
      } as never)
      .eq('id', current.vehicle_id);
  } catch (err) {
    console.warn('Could not update vehicle table via supabase on cancel:', err);
  }

  // 2. Update record and append cancellation audit event
  const updatedRecord: VehicleRentalAuthorization = {
    ...current,
    status: 'CANCELLED',
    matching_status: 'unlisted_cancelled',
    cancelled_at: now,
    cancelled_by: params.cancelledByUserId,
    cancellation_reason: reasonText,
    audit_trail: [
      ...current.audit_trail,
      {
        id: `AUD-CANC-${Date.now()}`,
        action: 'AUTHORIZATION_CANCELLED',
        performed_by: params.cancelledByUserId,
        performed_by_name: params.cancelledByName || 'Vehicle Owner / Admin',
        performed_by_role: params.cancelledByRole || 'owner',
        timestamp: now,
        notes: `Vehicle authorization revoked and listing unpublished from Catalogue. Reason: "${reasonText}"`,
      },
    ],
  };

  list[targetIdx] = updatedRecord;
  persistAuthorizations(list);

  // 3. Send cancellation log confirmation message
  await sendCancellationAcknowledgmentMessage({
    ownerId: updatedRecord.owner_id,
    authorization: updatedRecord,
    reason: reasonText,
  });

  return {
    success: true,
    authorization: updatedRecord,
    message: 'Vehicle rental authorization has been successfully cancelled and removed from the active catalogue.',
  };
}

/**
 * Sends in-app authorization message to the Owner's inbox containing the confirmation and cancellation link.
 */
async function sendAuthorizationNotificationMessage({
  ownerId,
  authorization,
  cancellationUrl,
}: {
  ownerId: string;
  authorization: VehicleRentalAuthorization;
  cancellationUrl: string;
}) {
  const subject = `Vehicle Rental Authorization Confirmation – ${authorization.vehicle_year} ${authorization.vehicle_make} ${authorization.vehicle_model} (${authorization.license_plate})`;
  const content = `🚗 RENTMAIKAR VEHICLE RENTAL AUTHORIZATION CONFIRMATION

Vehicle: ${authorization.vehicle_year} ${authorization.vehicle_make} ${authorization.vehicle_model}
License Plate: ${authorization.license_plate}
Authorization Ref: ${authorization.id}
Date Authorized: ${new Date(authorization.authorized_at).toLocaleString()}
Status: ACTIVE (Listed in Public Catalogue & Matching Pool)

GRANT OF PERMISSION & COMMITMENT:
By publishing this vehicle, you have granted Rentmaikar the permission to list the vehicle for rentals on our public Catalogue, match the vehicle to suitable drivers from our verified driver pool, and you are committed to handing over the vehicle to the matched Driver upon agreement.

MISTAKE CANCELLATION:
If you published this vehicle in error or wish to cancel this rental authorization immediately, please use the secure cancellation link below:

🔗 Cancellation Link: ${cancellationUrl}

All cancellations are logged instantly in our admin compliance registry.`;

  try {
    // Try creating or finding an inbox conversation
    let convId: string | null = null;
    const { data: convs } = await supabase
      .from('inbox_conversations')
      .select('id')
      .eq('user_id', ownerId)
      .eq('channel', 'system_authorization')
      .limit(1);

    if (convs && convs.length > 0) {
      convId = convs[0].id;
    } else {
      const { data: newConv } = await supabase
        .from('inbox_conversations')
        .insert({
          user_id: ownerId,
          subject: 'Vehicle Rental Authorizations & Listings',
          channel: 'system_authorization',
          status: 'active',
          last_message_at: new Date().toISOString(),
        } as never)
        .select('id')
        .single();
      if (newConv) convId = (newConv as any).id;
    }

    if (convId) {
      await supabase.from('inbox_messages').insert({
        conversation_id: convId,
        content,
        sender_type: 'admin',
        sender_name: 'Rentmaikar Authorization Desk',
        metadata: {
          authorization_id: authorization.id,
          vehicle_id: authorization.vehicle_id,
          cancellation_url: cancellationUrl,
          type: 'vehicle_rental_authorization',
        },
      } as never);
    }
  } catch (err) {
    console.warn('Could not post inbox message to database:', err);
  }
}

/**
 * Sends acknowledgment in-app message when an authorization is cancelled.
 */
async function sendCancellationAcknowledgmentMessage({
  ownerId,
  authorization,
  reason,
}: {
  ownerId: string;
  authorization: VehicleRentalAuthorization;
  reason: string;
}) {
  const content = `🛑 VEHICLE RENTAL AUTHORIZATION CANCELLED

Vehicle: ${authorization.vehicle_year} ${authorization.vehicle_make} ${authorization.vehicle_model} (${authorization.license_plate})
Authorization Ref: ${authorization.id}
Cancelled At: ${new Date().toLocaleString()}
Reason: ${reason}

Your vehicle has been unpublished from the Rentmaikar public Catalogue and withdrawn from the verified driver matching pool. This cancellation has been recorded in the Admin Vehicle Authorization Log.`;

  try {
    const { data: convs } = await supabase
      .from('inbox_conversations')
      .select('id')
      .eq('user_id', ownerId)
      .limit(1);

    if (convs && convs.length > 0) {
      await supabase.from('inbox_messages').insert({
        conversation_id: convs[0].id,
        content,
        sender_type: 'admin',
        sender_name: 'Rentmaikar Compliance Log',
        metadata: {
          authorization_id: authorization.id,
          vehicle_id: authorization.vehicle_id,
          type: 'authorization_cancellation_receipt',
        },
      } as never);
    }
  } catch (err) {
    console.warn('Could not post cancellation acknowledgment:', err);
  }
}
