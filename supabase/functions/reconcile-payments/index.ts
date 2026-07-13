// deno-lint-ignore-file no-explicit-any
// Scheduled reconciliation: cross-checks Paystack/Opay/PayPal transactions
// against provider APIs and backfills missing/pending payment rows so
// receipts render and balances update even when a webhook/callback was missed.
//
// Auth: pg_cron passes x-cron-secret matching CRON_SECRET.
// Scope: transactions created in the last 7 days that are pending, mismatched,
// or missing a payment_id link.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createHmac } from "node:crypto";
import { resolvePaymentContext } from "../_shared/resolve-payment-context.ts";

const LOOKBACK_HOURS = 24 * 7;
const MAX_PER_PSP = 200;

type Supa = ReturnType<typeof createClient>;

interface ReconcileResult {
  psp: string;
  checked: number;
  updated: number;
  backfilled_payments: number;
  errors: Array<{ reference?: string; order_id?: string; error: string }>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const cronSecret = Deno.env.get("CRON_SECRET");
  const provided = req.headers.get("x-cron-secret") ?? new URL(req.url).searchParams.get("secret");
  if (cronSecret && provided !== cronSecret) {
    return json({ error: "Unauthorized" }, 401);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const sinceIso = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000).toISOString();
  const results: ReconcileResult[] = [];

  try { results.push(await reconcilePaystack(supabase, sinceIso)); }
  catch (e) { results.push({ psp: "paystack", checked: 0, updated: 0, backfilled_payments: 0, errors: [{ error: String(e) }] }); }

  try { results.push(await reconcileOpay(supabase, sinceIso)); }
  catch (e) { results.push({ psp: "opay", checked: 0, updated: 0, backfilled_payments: 0, errors: [{ error: String(e) }] }); }

  try { results.push(await reconcilePaypal(supabase, sinceIso)); }
  catch (e) { results.push({ psp: "paypal", checked: 0, updated: 0, backfilled_payments: 0, errors: [{ error: String(e) }] }); }

  return json({ success: true, since: sinceIso, results });
});

// ---------- Paystack ----------
async function reconcilePaystack(supa: Supa, sinceIso: string): Promise<ReconcileResult> {
  const out: ReconcileResult = { psp: "paystack", checked: 0, updated: 0, backfilled_payments: 0, errors: [] };
  const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!secret) return out;

  const { data: txs } = await supa
    .from("paystack_transactions")
    .select("id, reference, status, payment_id, rental_id, driver_id, vehicle_id, amount, currency")
    .gte("created_at", sinceIso)
    .or("status.eq.pending,payment_id.is.null")
    .limit(MAX_PER_PSP);

  for (const tx of txs ?? []) {
    out.checked++;
    try {
      const resp = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(tx.reference)}`, {
        headers: { Authorization: `Bearer ${secret}` },
      });
      const body = await resp.json();
      if (!resp.ok || !body?.status) {
        out.errors.push({ reference: tx.reference, error: body?.message ?? `HTTP ${resp.status}` });
        continue;
      }
      const data = body.data;
      const success = data.status === "success";
      const status = success ? "completed" : data.status === "failed" ? "failed" : "pending";
      const failure = success ? null : data.gateway_response ?? null;

      const paymentId = await ensurePayment(supa, {
        existingPaymentId: tx.payment_id,
        rentalId: tx.rental_id,
        driverId: tx.driver_id,
        vehicleId: tx.vehicle_id,
        amount: Number(tx.amount),
        currency: tx.currency,
        method: "paystack",
        transactionRef: tx.reference,
        status,
        failure,
      });
      if (paymentId && !tx.payment_id) out.backfilled_payments++;

      await supa.from("paystack_transactions").update({
        status,
        channel: data.channel,
        gateway_response: data.gateway_response,
        failure_reason: failure,
        raw_payload: data,
        payment_id: paymentId ?? tx.payment_id,
      }).eq("id", tx.id);

      if (paymentId) {
        await supa.from("payments").update({
          status,
          failure_reason: failure,
          processed_at: status === "completed" ? new Date().toISOString() : null,
        }).eq("id", paymentId);
      }
      out.updated++;
    } catch (e) {
      out.errors.push({ reference: tx.reference, error: String(e) });
    }
  }
  return out;
}

// ---------- Opay ----------
async function reconcileOpay(supa: Supa, sinceIso: string): Promise<ReconcileResult> {
  const out: ReconcileResult = { psp: "opay", checked: 0, updated: 0, backfilled_payments: 0, errors: [] };
  const merchantId = Deno.env.get("OPAY_MERCHANT_ID");
  const secretKey = Deno.env.get("OPAY_SECRET_KEY");
  const publicKey = Deno.env.get("OPAY_PUBLIC_KEY");
  const env = (Deno.env.get("OPAY_ENVIRONMENT") ?? "sandbox").toLowerCase();
  if (!merchantId || !secretKey || !publicKey) return out;

  const baseUrl = env === "live" ? "https://liveapi.opaycheckout.com" : "https://sandboxapi.opaycheckout.com";

  const { data: txs } = await supa
    .from("opay_transactions")
    .select("id, reference, status, payment_id, rental_id, driver_id, vehicle_id, amount, currency")
    .gte("created_at", sinceIso)
    .or("status.eq.pending,payment_id.is.null")
    .limit(MAX_PER_PSP);

  for (const tx of txs ?? []) {
    out.checked++;
    try {
      const payload = JSON.stringify({ reference: tx.reference, country: "NG" });
      const sig = createHmac("sha512", secretKey).update(payload).digest("hex");
      const resp = await fetch(`${baseUrl}/api/v1/international/cashier/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${publicKey}`,
          MerchantId: merchantId,
          Signature: sig,
        },
        body: payload,
      });
      const body = await resp.json();
      if (!resp.ok) {
        out.errors.push({ reference: tx.reference, error: body?.message ?? `HTTP ${resp.status}` });
        continue;
      }
      const opayStatus: string = body?.data?.status ?? "PENDING";
      const status = opayStatus === "SUCCESS" ? "completed"
        : opayStatus === "FAIL" || opayStatus === "CLOSE" ? "failed" : "pending";
      const failure = status === "failed" ? body?.data?.failureReason ?? opayStatus : null;

      const paymentId = await ensurePayment(supa, {
        existingPaymentId: tx.payment_id,
        rentalId: tx.rental_id,
        driverId: tx.driver_id,
        vehicleId: tx.vehicle_id,
        amount: Number(tx.amount),
        currency: tx.currency,
        method: "opay",
        transactionRef: tx.reference,
        status,
        failure,
      });
      if (paymentId && !tx.payment_id) out.backfilled_payments++;

      await supa.from("opay_transactions").update({
        status, failure_reason: failure, raw_payload: body?.data,
        payment_id: paymentId ?? tx.payment_id,
      }).eq("id", tx.id);

      if (paymentId) {
        await supa.from("payments").update({
          status, failure_reason: failure,
          processed_at: status === "completed" ? new Date().toISOString() : null,
        }).eq("id", paymentId);
      }
      out.updated++;
    } catch (e) {
      out.errors.push({ reference: tx.reference, error: String(e) });
    }
  }
  return out;
}

// ---------- PayPal ----------
async function reconcilePaypal(supa: Supa, sinceIso: string): Promise<ReconcileResult> {
  const out: ReconcileResult = { psp: "paypal", checked: 0, updated: 0, backfilled_payments: 0, errors: [] };
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
  const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");
  const mode = (Deno.env.get("PAYPAL_MODE") ?? "sandbox").toLowerCase();
  if (!clientId || !clientSecret) return out;
  const base = mode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

  const tokRes = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${clientId}:${clientSecret}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!tokRes.ok) {
    out.errors.push({ error: `PayPal token ${tokRes.status}` });
    return out;
  }
  const { access_token } = await tokRes.json();

  const { data: txs } = await supa
    .from("paypal_transactions")
    .select("id, order_id, status, payment_id, rental_id, driver_id, owner_id, vehicle_id, amount, currency")
    .gte("created_at", sinceIso)
    .in("status", ["created", "capture_pending", "pending"])
    .limit(MAX_PER_PSP);

  for (const tx of txs ?? []) {
    out.checked++;
    try {
      const orderRes = await fetch(`${base}/v2/checkout/orders/${tx.order_id}`, {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      const order = await orderRes.json();
      if (!orderRes.ok) {
        out.errors.push({ order_id: tx.order_id, error: `HTTP ${orderRes.status}` });
        continue;
      }

      let captureStatus = order.status;
      let captureId: string | null = null;
      let captureRecord: any = order.purchase_units?.[0]?.payments?.captures?.[0] ?? null;

      // If APPROVED but not yet captured, capture it now.
      if (order.status === "APPROVED") {
        const capRes = await fetch(`${base}/v2/checkout/orders/${tx.order_id}/capture`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${access_token}`,
            "Content-Type": "application/json",
            "Prefer": "return=representation",
          },
        });
        const cap = await capRes.json();
        if (capRes.ok) {
          captureRecord = cap.purchase_units?.[0]?.payments?.captures?.[0] ?? captureRecord;
          captureStatus = captureRecord?.status ?? cap.status ?? captureStatus;
        } else {
          out.errors.push({ order_id: tx.order_id, error: `capture HTTP ${capRes.status}` });
        }
      }
      captureId = captureRecord?.id ?? null;

      const status = captureStatus === "COMPLETED" ? "completed"
        : captureStatus === "VOIDED" || captureStatus === "DECLINED" ? "failed" : "pending";

      const paymentId = await ensurePayment(supa, {
        existingPaymentId: tx.payment_id,
        rentalId: tx.rental_id,
        driverId: tx.driver_id,
        vehicleId: tx.vehicle_id,
        ownerId: tx.owner_id,
        amount: Number(tx.amount),
        currency: tx.currency,
        method: "paypal",
        transactionRef: tx.order_id,
        status,
        failure: status === "failed" ? captureStatus : null,
      });
      if (paymentId && !tx.payment_id) out.backfilled_payments++;

      await supa.from("paypal_transactions").update({
        capture_id: captureId,
        status: captureStatus === "COMPLETED" ? "captured"
          : captureStatus === "VOIDED" || captureStatus === "DECLINED" ? "failed"
          : "capture_pending",
        raw_capture_response: order,
        payment_id: paymentId ?? tx.payment_id,
      }).eq("id", tx.id);

      if (paymentId) {
        await supa.from("payments").update({
          status,
          processed_at: status === "completed" ? new Date().toISOString() : null,
        }).eq("id", paymentId);
      }
      out.updated++;
    } catch (e) {
      out.errors.push({ order_id: tx.order_id, error: String(e) });
    }
  }
  return out;
}

// ---------- shared ----------
interface EnsurePaymentArgs {
  existingPaymentId?: string | null;
  rentalId?: string | null;
  driverId?: string | null;
  vehicleId?: string | null;
  ownerId?: string | null;
  amount: number;
  currency: string;
  method: "paystack" | "opay" | "paypal";
  transactionRef: string;
  status: "pending" | "completed" | "failed";
  failure?: string | null;
}

/** Returns a payment_id (existing or newly created), or null when context can't be resolved. */
async function ensurePayment(supa: Supa, a: EnsurePaymentArgs): Promise<string | null> {
  if (a.existingPaymentId) return a.existingPaymentId;
  if (!a.driverId) return null;

  const ctx = await resolvePaymentContext({
    supabase: supa,
    rentalId: a.rentalId,
    vehicleId: a.vehicleId,
    ownerId: a.ownerId,
  });
  if ("error" in ctx) return null;

  const { data, error } = await supa.from("payments").insert({
    rental_id: ctx.rentalId,
    driver_id: a.driverId,
    owner_id: ctx.ownerId,
    vehicle_id: ctx.vehicleId,
    amount: a.amount,
    currency: a.currency,
    status: a.status,
    payment_method: a.method,
    payment_frequency: "weekly",
    transaction_id: a.transactionRef,
    failure_reason: a.failure ?? null,
    processed_at: a.status === "completed" ? new Date().toISOString() : null,
  }).select("id").single();

  if (error) {
    console.error("[reconcile-payments] backfill payment insert failed:", error);
    return null;
  }
  return data.id as string;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
