import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { requireAuthenticatedUser } from "../_shared/auth-guards.ts";

const Body = z.object({
  order_id: z.string().min(1).max(128),
});

function getPayPalBase(mode: string): string {
  return mode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authRes = await requireAuthenticatedUser(req);
  if (authRes instanceof Response) return authRes;

  try {
    const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
    const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");
    const mode = (Deno.env.get("PAYPAL_MODE") ?? "sandbox").toLowerCase();

    if (!clientId || !clientSecret) {
      return new Response(JSON.stringify({ error: "PayPal not configured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { order_id } = parsed.data;
    const base = getPayPalBase(mode);

    const tokenRes = await fetch(`${base}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${clientId}:${clientSecret}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      throw new Error(`PayPal token error ${tokenRes.status}: ${err}`);
    }
    const { access_token } = await tokenRes.json();

    const captureRes = await fetch(`${base}/v2/checkout/orders/${order_id}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation",
      },
    });

    const capture = await captureRes.json();
    if (!captureRes.ok) {
      throw new Error(`PayPal capture error ${captureRes.status}: ${JSON.stringify(capture)}`);
    }

    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const purchaseUnit = capture.purchase_units?.[0];
    const captureRecord = purchaseUnit?.payments?.captures?.[0];
    const captureId = captureRecord?.id ?? null;
    const captureStatus = captureRecord?.status ?? capture.status ?? "UNKNOWN";
    const payer = capture.payer;

    const { data: existingTx } = await supa
      .from("paypal_transactions")
      .select("payment_id")
      .eq("order_id", order_id)
      .maybeSingle();

    const paymentId = existingTx?.payment_id;

    if (paymentId) {
      const { error: paymentError } = await supa
        .from("payments")
        .update({
          status: captureStatus === "COMPLETED" ? "completed" : "processing",
          processed_at: new Date().toISOString(),
          transaction_id: order_id,
        })
        .eq("id", paymentId);

      if (paymentError) {
        console.error("[capture-paypal-order] payment update error:", paymentError);
      }
    }

    const { error: txError } = await supa
      .from("paypal_transactions")
      .update({
        capture_id: captureId,
        status: captureStatus === "COMPLETED" ? "captured" : "capture_pending",
        payer_email: payer?.email_address ?? null,
        payer_id: payer?.payer_id ?? null,
        raw_capture_response: capture,
      })
      .eq("order_id", order_id);

    if (txError) {
      console.error("[capture-paypal-order] transaction update error:", txError);
    }

    return new Response(
      JSON.stringify({
        order_id,
        capture_id: captureId,
        status: captureStatus,
        payment_id: paymentId ?? null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[capture-paypal-order] error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
