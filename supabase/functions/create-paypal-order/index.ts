import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { requireAuthenticatedUser } from "../_shared/auth-guards.ts";
import { resolvePaymentContext } from "../_shared/resolve-payment-context.ts";

const Body = z.object({
  amount: z.number().positive().max(1_000_000),
  currency: z.string().length(3).default("USD"),
  rental_id: z.string().uuid().optional(),
  vehicle_id: z.string().uuid().optional(),
  owner_id: z.string().uuid().optional(),
  driver_id: z.string().uuid().optional(),
  payment_frequency: z.enum(["daily", "weekly"]).default("weekly"),
  description: z.string().max(200).optional(),
});

function getPayPalBase(mode: string): string {
  return mode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authRes = await requireAuthenticatedUser(req);
  if (authRes instanceof Response) return authRes;
  const userId = authRes.userId;

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

    const data = parsed.data;
    if (data.currency.toUpperCase() !== "USD") {
      return new Response(JSON.stringify({ error: "PayPal only accepts USD" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const orderRes = await fetch(`${base}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          amount: {
            currency_code: data.currency.toUpperCase(),
            value: data.amount.toFixed(2),
          },
          description: data.description ?? "Rentmaikar payment",
          custom_id: data.rental_id ?? undefined,
        }],
        application_context: {
          brand_name: "Rentmaikar",
          landing_page: "NO_PREFERENCE",
          user_action: "PAY_NOW",
          return_url: `${Deno.env.get("APP_URL") ?? ""}/payment/success`,
          cancel_url: `${Deno.env.get("APP_URL") ?? ""}/payment/cancel`,
        },
      }),
    });

    const order = await orderRes.json();
    if (!orderRes.ok) {
      throw new Error(`PayPal order error ${orderRes.status}: ${JSON.stringify(order)}`);
    }

    // Persist order intent using the service role client.
    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    // Driver identity ALWAYS from JWT — reject spoofed values.
    if (data.driver_id && data.driver_id !== userId) {
      return new Response(JSON.stringify({ error: "driver_id does not match authenticated user" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const driverId = userId;

    const ctx = await resolvePaymentContext({
      supabase: supa,
      rentalId: data.rental_id,
      vehicleId: data.vehicle_id,
      ownerId: data.owner_id,
    });
    if ("error" in ctx) {
      return new Response(JSON.stringify({ error: ctx.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paymentInsert: Record<string, unknown> = {
      driver_id: driverId,
      owner_id: ctx.ownerId,
      vehicle_id: ctx.vehicleId,
      rental_id: ctx.rentalId,
      amount: data.amount,
      currency: data.currency.toUpperCase(),
      payment_frequency: data.payment_frequency,
      payment_method: "paypal",
      transaction_id: order.id,
      status: "pending",
    };

    const { data: payment, error: paymentError } = await supa
      .from("payments")
      .insert(paymentInsert)
      .select("id")
      .single();

    if (paymentError || !payment?.id) {
      console.error("[create-paypal-order] payment insert error:", paymentError);
      return new Response(JSON.stringify({ error: "Failed to record payment" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const txInsert: Record<string, unknown> = {
      payment_id: payment.id,
      rental_id: ctx.rentalId,
      driver_id: driverId,
      owner_id: ctx.ownerId,
      vehicle_id: ctx.vehicleId,
      order_id: order.id,
      status: "created",
      amount: data.amount,
      currency: data.currency.toUpperCase(),
      raw_order_response: order,
    };

    const { error: txError } = await supa.from("paypal_transactions").insert(txInsert);
    if (txError) {
      console.error("[create-paypal-order] paypal transaction insert error:", txError);
    }

    return new Response(
      JSON.stringify({
        order_id: order.id,
        payment_id: payment?.id ?? null,
        approve_url: order.links?.find((l: any) => l.rel === "approve")?.href ?? null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[create-paypal-order] error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
