// PayPal webhook — verifies via PayPal /v1/notifications/verify-webhook-signature,
// updates payments/paypal_transactions, marks linked invoice paid (via DB trigger),
// and asynchronously fires the receipt email via billing-portal.
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const PP_ENV = (Deno.env.get("PAYPAL_ENV") || "sandbox").toLowerCase();
const PP_BASE = PP_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
const PP_ID = Deno.env.get("PAYPAL_CLIENT_ID") ?? "";
const PP_SECRET = Deno.env.get("PAYPAL_CLIENT_SECRET") ?? "";
const PP_WH_ID = Deno.env.get("PAYPAL_WEBHOOK_ID") ?? "";

async function getAccessToken(): Promise<string | null> {
  if (!PP_ID || !PP_SECRET) return null;
  const r = await fetch(`${PP_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${PP_ID}:${PP_SECRET}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!r.ok) return null;
  const j = await r.json();
  return j.access_token ?? null;
}

async function verifySignature(headers: Headers, rawBody: string): Promise<boolean> {
  if (!PP_WH_ID) return false;
  const token = await getAccessToken();
  if (!token) return false;
  const r = await fetch(`${PP_BASE}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_algo: headers.get("paypal-auth-algo"),
      cert_url: headers.get("paypal-cert-url"),
      transmission_id: headers.get("paypal-transmission-id"),
      transmission_sig: headers.get("paypal-transmission-sig"),
      transmission_time: headers.get("paypal-transmission-time"),
      webhook_id: PP_WH_ID,
      webhook_event: JSON.parse(rawBody),
    }),
  });
  if (!r.ok) return false;
  const j = await r.json();
  return j.verification_status === "SUCCESS";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const raw = await req.text();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let evt: any = {};
  try { evt = JSON.parse(raw); } catch { return new Response("bad json", { status: 400 }); }

  const signatureValid = await verifySignature(req.headers, raw);
  const eventType = evt.event_type as string | undefined;
  const externalId = evt.id as string | undefined;
  const resource = evt.resource ?? {};
  const orderId: string | undefined = resource.supplementary_data?.related_ids?.order_id ?? resource.id;

  // Idempotent event log
  await supabase.from("payment_webhook_events").insert({
    provider: "paypal",
    event_type: eventType ?? null,
    external_event_id: externalId ?? null,
    reference: orderId ?? null,
    status: signatureValid ? "verified" : "unverified",
    signature_valid: signatureValid,
    payload: evt,
  }).select("id").maybeSingle();

  if (!signatureValid) {
    return new Response(JSON.stringify({ received: true, verified: false }), {
      status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const amountValue = Number(resource.amount?.value ?? 0) || null;

  if (eventType === "PAYMENT.CAPTURE.COMPLETED" || eventType === "CHECKOUT.ORDER.APPROVED") {
    if (orderId) {
      await supabase.from("paypal_transactions").update({
        status: "completed", raw_payload: resource,
      }).eq("order_id", orderId);
      const { data: tx } = await supabase.from("paypal_transactions")
        .select("payment_id, rental_id, amount, currency").eq("order_id", orderId).maybeSingle();
      if (tx?.payment_id) {
        // Setting status=completed fires the DB trigger which creates the receipt idempotently.
        await supabase.from("payments").update({
          status: "completed", processed_at: new Date().toISOString(), failure_reason: null,
        }).eq("id", tx.payment_id);
        // Fire receipt email
        try {
          await supabase.functions.invoke("billing-portal", {
            headers: { "x-internal-secret": Deno.env.get("CRON_SECRET") ?? "" },
            body: { action: "auto_send_receipt_for_payment", payment_id: tx.payment_id },
          });
        } catch (e) { console.error("[paypal-webhook] receipt email failed", e); }
      }
    }
  } else if (eventType === "PAYMENT.CAPTURE.DENIED" || eventType === "PAYMENT.CAPTURE.REFUNDED") {
    if (orderId) {
      const status = eventType === "PAYMENT.CAPTURE.REFUNDED" ? "refunded" : "failed";
      await supabase.from("paypal_transactions").update({
        status, raw_payload: resource,
      }).eq("order_id", orderId);
      const { data: tx } = await supabase.from("paypal_transactions")
        .select("payment_id").eq("order_id", orderId).maybeSingle();
      if (tx?.payment_id) {
        await supabase.from("payments").update({
          status, failure_reason: eventType,
        }).eq("id", tx.payment_id);
      }
    }
  }

  return new Response(JSON.stringify({ received: true, event: eventType, amount: amountValue }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
