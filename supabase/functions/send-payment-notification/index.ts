// deno-lint-ignore-file no-explicit-any
// Sends a Web Push notification to relevant users when a Paystack/Opay/PayPal
// payment status changes. Called from webhooks and verify functions using
// CRON_SECRET as an internal auth header.
//
// Recipient policy (hardened, defense in depth):
//   - INCLUDE: the driver on the rental (if they hold the 'driver' role)
//   - INCLUDE: every user with the 'admin' role
//   - EXCLUDE: any user with the 'owner' role — even if they somehow also
//     match the driver_id or admin lists. Owners never receive payment push
//     notifications for any PSP.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";
import { resolveRecipients } from "./recipients.ts";
export { resolveRecipients };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY");
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY");
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:support@rentmaikar.com";
const INTERNAL_SECRET = Deno.env.get("CRON_SECRET");

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

const PUB_BASE = "https://rentmaikar.lovable.app";

interface Body {
  paymentId: string;
  rentalId?: string;
  status: "completed" | "failed" | "pending" | "processing";
  provider: "paystack" | "opay" | "paypal";
  amount?: number;
  currency?: string;
  reference?: string;
}

/**
 * Compute the notification recipient set. Exported for unit testing.
 *
 * Steps:
 *   1. Seed with the rental's driver_id and every admin user_id.
 *   2. Fetch ALL roles for those candidates from user_roles.
 *   3. Drop any candidate that holds the 'owner' role (owners are excluded
 *      even if they're also the assigned driver or an admin).
 *   4. Drop the seeded driver_id if they don't actually have the 'driver' role.
 */
export async function resolveRecipients(
  admin: Pick<SupabaseClient, "from">,
  rentalId: string | undefined,
): Promise<string[]> {
  const candidates = new Set<string>();
  let rentalDriverId: string | null = null;

  if (rentalId) {
    const { data: rental } = await (admin.from("rentals") as any)
      .select("driver_id").eq("id", rentalId).maybeSingle();
    if (rental?.driver_id) {
      rentalDriverId = rental.driver_id;
      candidates.add(rental.driver_id);
    }
  }

  const { data: admins } = await (admin.from("user_roles") as any)
    .select("user_id").eq("role", "admin");
  (admins ?? []).forEach((a: { user_id: string }) => candidates.add(a.user_id));

  if (candidates.size === 0) return [];

  const { data: allRoles } = await (admin.from("user_roles") as any)
    .select("user_id, role").in("user_id", Array.from(candidates));

  const rolesByUser = new Map<string, Set<string>>();
  (allRoles ?? []).forEach((r: { user_id: string; role: string }) => {
    if (!rolesByUser.has(r.user_id)) rolesByUser.set(r.user_id, new Set());
    rolesByUser.get(r.user_id)!.add(r.role);
  });

  const allowed: string[] = [];
  for (const userId of candidates) {
    const roles = rolesByUser.get(userId) ?? new Set<string>();
    // Hard exclusion: never send to anyone with the owner role.
    if (roles.has("owner")) continue;
    if (userId === rentalDriverId) {
      // Only include the rental driver if they truly have the driver role.
      if (roles.has("driver")) allowed.push(userId);
      continue;
    }
    // Otherwise this is an admin (seeded from the admin query).
    if (roles.has("admin")) allowed.push(userId);
  }
  return allowed;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = req.headers.get("x-internal-secret");
  if (!INTERNAL_SECRET || auth !== INTERNAL_SECRET) {
    return new Response("unauthorized", { status: 401 });
  }
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return new Response(JSON.stringify({ skipped: "vapid not configured" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = (await req.json()) as Body;
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  const recipientIds = await resolveRecipients(admin, body.rentalId);
  if (recipientIds.length === 0) {
    return new Response(JSON.stringify({ sent: 0, recipient_user_ids: [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: subs } = await admin.from("push_subscriptions")
    .select("id, endpoint, p256dh, auth, user_id")
    .in("user_id", recipientIds);

  const statusLabel = body.status === "completed" ? "successful" : body.status === "failed" ? "failed" : body.status;
  const amountText = body.amount != null && body.currency
    ? new Intl.NumberFormat(undefined, { style: "currency", currency: body.currency }).format(body.amount) + " "
    : "";
  const providerLabel = body.provider.charAt(0).toUpperCase() + body.provider.slice(1);
  const title = `${providerLabel} payment ${statusLabel}`;
  const bodyText = `${amountText}payment for rental ${body.rentalId?.slice(0, 8) ?? ""} is ${statusLabel}.`;

  const webUrl = body.rentalId && body.paymentId
    ? `${PUB_BASE}/rentals/${body.rentalId}/payments/${body.paymentId}`
    : `${PUB_BASE}/`;
  const deepLink = body.rentalId ? `rentmaikar://rental/${body.rentalId}/payment` : null;

  const payload = JSON.stringify({
    title,
    body: bodyText,
    url: webUrl,
    deepLink,
    rentalId: body.rentalId,
    paymentId: body.paymentId,
    tag: `payment-${body.paymentId}`,
  });

  const results = await Promise.allSettled((subs ?? []).map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
      );
    } catch (err: any) {
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        await admin.from("push_subscriptions").delete().eq("id", s.id);
      }
      throw err;
    }
  }));

  const sent = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.length - sent;
  return new Response(JSON.stringify({
    sent, failed,
    recipients: recipientIds.length,
    recipient_user_ids: recipientIds,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
