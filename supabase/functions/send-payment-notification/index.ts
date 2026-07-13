// Sends a Web Push notification to relevant users (driver, owner, admins)
// when a Paystack/Opay/PayPal payment status changes. Called from webhooks
// and verify functions using CRON_SECRET as an internal auth header.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";

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

  // Find recipients: driver, owner (via rental->vehicle), all admins.
  const recipients = new Set<string>();
  if (body.rentalId) {
    const { data: rental } = await admin.from("rentals").select("driver_id, vehicle_id").eq("id", body.rentalId).maybeSingle();
    if (rental?.driver_id) recipients.add(rental.driver_id);
    if (rental?.vehicle_id) {
      const { data: veh } = await admin.from("vehicles").select("owner_id").eq("id", rental.vehicle_id).maybeSingle();
      if (veh?.owner_id) recipients.add(veh.owner_id);
    }
  }
  const { data: admins } = await admin.from("user_roles").select("user_id").eq("role", "admin");
  admins?.forEach((a) => recipients.add(a.user_id));

  if (recipients.size === 0) {
    return new Response(JSON.stringify({ sent: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const { data: subs } = await admin.from("push_subscriptions")
    .select("id, endpoint, p256dh, auth, user_id")
    .in("user_id", Array.from(recipients));

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
  return new Response(JSON.stringify({ sent, failed, recipients: recipients.size }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
