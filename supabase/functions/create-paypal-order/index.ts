import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { requireAuthenticatedUser } from "../_shared/auth-guards.ts";

const Body = z.object({
  amount: z.number().positive().max(1_000_000),
  currency: z.string().length(3).default("USD"),
  rental_id: z.string().uuid().optional(),
  description: z.string().max(200).optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authRes = await requireAuthenticatedUser(req);
  if (authRes instanceof Response) return authRes;

  try {

    const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
    const secret = Deno.env.get("PAYPAL_SECRET");
    const mode = (Deno.env.get("PAYPAL_MODE") ?? "sandbox").toLowerCase();
    if (!clientId || !secret) {
      return new Response(JSON.stringify({ error: "PayPal not configured" }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const base = mode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
    const tokRes = await fetch(`${base}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${clientId}:${secret}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    if (!tokRes.ok) throw new Error(`paypal token ${tokRes.status}`);
    const { access_token } = await tokRes.json();

    const orderRes = await fetch(`${base}/v2/checkout/orders`, {
      method: "POST",
      headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          amount: { currency_code: parsed.data.currency.toUpperCase(), value: parsed.data.amount.toFixed(2) },
          description: parsed.data.description ?? "Rentmaikar payment",
          custom_id: parsed.data.rental_id ?? undefined,
        }],
      }),
    });
    const order = await orderRes.json();
    if (!orderRes.ok) throw new Error(`paypal order ${orderRes.status}: ${JSON.stringify(order)}`);

    // Log intent
    try {
      const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const auth = req.headers.get("authorization") ?? "";
      const jwt = auth.replace(/^Bearer\s+/i, "");
      const { data: userData } = jwt ? await supa.auth.getUser(jwt) : { data: { user: null } as any };
      await supa.from("payments").insert({
        user_id: userData?.user?.id ?? null,
        rental_id: parsed.data.rental_id ?? null,
        amount: parsed.data.amount,
        currency: parsed.data.currency.toUpperCase(),
        provider: "paypal",
        provider_reference: order.id,
        status: "pending",
      });
    } catch { /* logging is best-effort */ }

    return new Response(JSON.stringify({ order_id: order.id, approve_url: order.links?.find((l: any) => l.rel === "approve")?.href }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
