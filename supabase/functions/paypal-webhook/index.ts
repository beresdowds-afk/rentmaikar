// PayPal webhook — verifies via PayPal /v1/notifications/verify-webhook-signature,
// updates payments/paypal_transactions, marks linked invoice paid (via DB trigger),
// and asynchronously fires the receipt email via billing-portal.
// Hardened for duplicate-delivery idempotency via payment_webhook_events unique index.
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  recordWebhookEvent,
  markPaymentCompletedIdempotent,
  withRetry,
  transitionState,
  applyRefund,
  applyDispute,
} from "../_shared/webhook-idempotency.ts";
import { postRentalPaymentLedger } from "../_shared/wallet-ledger.ts";


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

  // deno-lint-ignore no-explicit-any
  let evt: any = {};
  try { evt = JSON.parse(raw); } catch { return new Response("bad json", { status: 400 }); }

  const signatureValid = await verifySignature(req.headers, raw);
  const eventType = evt.event_type as string | undefined;
  const externalId = evt.id as string | undefined;
  const resource = evt.resource ?? {};
  const orderId: string | undefined = resource.supplementary_data?.related_ids?.order_id ?? resource.id;

  // Idempotent event log — duplicate deliveries with the same PayPal event id
  // short-circuit with 200 so PayPal stops retrying.
  const idem = await recordWebhookEvent(supabase, {
    provider: "paypal",
    eventType: eventType ?? null,
    externalEventId: externalId ?? null,
    reference: orderId ?? null,
    signatureValid,
    payload: evt,
  });
  if (idem.duplicate) {
    return new Response(JSON.stringify({ received: true, duplicate: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

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
        await transitionState(supabase, "payment", tx.payment_id, "captured", eventType);
        await transitionState(supabase, "payment", tx.payment_id, "settled", "paypal capture settled");
        const { alreadyCompleted } = await markPaymentCompletedIdempotent(supabase, tx.payment_id);
        await recordPaymentInLedger(supabase, tx.payment_id, "paypal", orderId);
        if (!alreadyCompleted) {
          await withRetry("paypal.receipt.email", async () => {
            const { error } = await supabase.functions.invoke("billing-portal", {
              headers: { "x-internal-secret": Deno.env.get("CRON_SECRET") ?? "" },
              body: { action: "auto_send_receipt_for_payment", payment_id: tx.payment_id },
            });
            if (error) throw error;
          });
        }
        if (idem.eventRowId) {
          await supabase.from("payment_webhook_events").update({ payment_id: tx.payment_id }).eq("id", idem.eventRowId);
        }
      }
    }
  } else if (eventType === "PAYMENT.CAPTURE.DENIED") {
    if (orderId) {
      await supabase.from("paypal_transactions").update({
        status: "failed", raw_payload: resource,
      }).eq("order_id", orderId);
      const { data: tx } = await supabase.from("paypal_transactions")
        .select("payment_id").eq("order_id", orderId).maybeSingle();
      if (tx?.payment_id) {
        await transitionState(supabase, "payment", tx.payment_id, "failed", eventType);
        // Never overwrite a completed payment via a later denial event.
        await supabase.from("payments").update({
          status: "failed", failure_reason: eventType,
        }).eq("id", tx.payment_id).neq("status", "completed");
      }
    }
  } else if (eventType === "PAYMENT.CAPTURE.REFUNDED" || eventType === "PAYMENT.CAPTURE.REVERSED") {
    if (orderId) {
      await supabase.from("paypal_transactions").update({
        status: "refunded", raw_payload: resource,
      }).eq("order_id", orderId);
      const { data: tx } = await supabase.from("paypal_transactions")
        .select("payment_id").eq("order_id", orderId).maybeSingle();
      if (tx?.payment_id) {
        // Shared handler: state transition + full ledger reversal.
        await applyRefund(supabase, {
          paymentId: tx.payment_id,
          provider: "paypal",
          providerReference: orderId,
          amount: amountValue ? Number(amountValue) : null,
          reason: eventType,
        });
      }
    }
  } else if (
    eventType === "CUSTOMER.DISPUTE.CREATED" ||
    eventType === "CUSTOMER.DISPUTE.UPDATED"
  ) {
    // Dispute resources reference the disputed capture, not the order.
    const captureId: string | undefined =
      resource?.disputed_transactions?.[0]?.seller_transaction_id ??
      resource?.disputed_transactions?.[0]?.buyer_transaction_id;
    if (captureId) {
      const { data: tx } = await supabase.from("paypal_transactions")
        .select("payment_id").or(`order_id.eq.${captureId},capture_id.eq.${captureId}`).maybeSingle();
      if (tx?.payment_id) {
        await applyDispute(supabase, {
          paymentId: tx.payment_id,
          provider: "paypal",
          providerReference: captureId,
          reason: resource?.reason ?? "dispute opened",
        });
      }
    }
  }


  return new Response(JSON.stringify({ received: true, event: eventType, amount: amountValue }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

/** Mirror a completed payment into the wallet ledger. Never throws. */
// deno-lint-ignore no-explicit-any
async function recordPaymentInLedger(
  supabase: any, paymentId: string, provider: string, providerReference: string,
) {
  const { data: pay } = await supabase.from("payments")
    .select("id, driver_id, owner_id, amount, currency").eq("id", paymentId).maybeSingle();
  if (!pay?.driver_id) return;
  const results = await postRentalPaymentLedger(supabase, {
    paymentId: pay.id,
    driverId: pay.driver_id,
    ownerId: pay.owner_id,
    amount: Number(pay.amount),
    currency: pay.currency ?? "USD",
    provider,
    providerReference,
  });
  for (const r of results) {
    if (!r.ok) console.error("[ledger] post failed:", r.error);
  }
}
