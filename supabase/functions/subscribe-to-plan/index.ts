// Initiates a subscription checkout for a plan (Paystack for NGN, PayPal for USD).
// Driver/user identity is ALWAYS derived from JWT. Enforces eligibility & insurance-requires-training rule.
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const Body = z.object({
  plan_id: z.string().uuid(),
  callback_url: z.string().url().optional(),
});

function getPayPalBase(mode: string) {
  return mode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return json({ error: "Unauthenticated" }, 401);

    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: u, error: uErr } = await supa.auth.getUser(auth.replace("Bearer ", ""));
    if (uErr || !u?.user) return json({ error: "Unauthenticated" }, 401);
    const userId = u.user.id;

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const { plan_id, callback_url } = parsed.data;

    // Load plan
    const { data: plan, error: planErr } = await supa
      .from("subscription_plans")
      .select("id,name,plan_type,price,currency,billing_interval,region,eligible_roles,is_active")
      .eq("id", plan_id)
      .maybeSingle();
    if (planErr || !plan || !plan.is_active) return json({ error: "Plan not found or inactive" }, 404);

    // Role eligibility
    const { data: roles } = await supa.from("user_roles").select("role").eq("user_id", userId);
    const roleSet = new Set((roles ?? []).map((r) => r.role as string));
    const eligible = (plan.eligible_roles as string[]).some((r) => roleSet.has(r));
    if (!eligible) return json({ error: `Your role is not eligible for the ${plan.plan_type} plan` }, 403);

    // Insurance requires active training in same region
    if (plan.plan_type === "insurance") {
      const { data: hasTraining } = await supa.rpc("has_active_subscription", {
        _user_id: userId, _plan_type: "training", _region: plan.region,
      });
      if (!hasTraining) return json({ error: "Driver Training subscription required before Insurance" }, 409);
    }

    // Prevent duplicate active same-type
    const { data: hasSame } = await supa.rpc("has_active_subscription", {
      _user_id: userId, _plan_type: plan.plan_type, _region: null,
    });
    if (hasSame) return json({ error: `You already have an active ${plan.plan_type} subscription` }, 409);

    const { data: profile } = await supa.from("profiles").select("email").eq("user_id", userId).maybeSingle();
    const email = profile?.email;
    if (!email) return json({ error: "Profile email not found" }, 400);

    // Route by currency
    if (plan.currency === "NGN") {
      const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
      if (!secret) return json({ error: "Paystack not configured" }, 503);
      const reference = `sub_${crypto.randomUUID().replace(/-/g, "")}`;
      const resp = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          amount: Math.round(Number(plan.price) * 100),
          currency: "NGN",
          reference,
          callback_url,
          metadata: { subscription_plan_id: plan.id, user_id: userId, plan_type: plan.plan_type },
        }),
      });
      const pay = await resp.json();
      if (!resp.ok || !pay?.status) {
        console.error("[subscribe-to-plan] paystack init failed:", pay);
        return json({ error: pay?.message ?? "Paystack init failed", details: pay }, 502);
      }
      return json({
        provider: "paystack",
        reference,
        checkout_url: pay.data.authorization_url,
        plan,
      });
    }

    if (plan.currency === "USD") {
      const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
      const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");
      const mode = (Deno.env.get("PAYPAL_MODE") ?? "sandbox").toLowerCase();
      if (!clientId || !clientSecret) return json({ error: "PayPal not configured" }, 503);
      const base = getPayPalBase(mode);
      const tokRes = await fetch(`${base}/v1/oauth2/token`, {
        method: "POST",
        headers: {
          Authorization: "Basic " + btoa(`${clientId}:${clientSecret}`),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
      });
      if (!tokRes.ok) return json({ error: "PayPal token error", details: await tokRes.text() }, 502);
      const { access_token } = await tokRes.json();

      const returnBase = callback_url ?? `${Deno.env.get("APP_URL") ?? ""}/subscriptions/success`;
      const cancelBase = `${Deno.env.get("APP_URL") ?? ""}/subscriptions`;

      const orderRes = await fetch(`${base}/v2/checkout/orders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [{
            amount: { currency_code: "USD", value: Number(plan.price).toFixed(2) },
            description: `${plan.name} (${plan.billing_interval})`,
            custom_id: `sub:${plan.id}:${userId}`,
          }],
          application_context: {
            brand_name: "Rentmaikar",
            user_action: "PAY_NOW",
            return_url: returnBase,
            cancel_url: cancelBase,
          },
        }),
      });
      const order = await orderRes.json();
      if (!orderRes.ok) {
        console.error("[subscribe-to-plan] paypal order failed:", order);
        return json({ error: "PayPal order failed", details: order }, 502);
      }
      const approve = (order.links ?? []).find((l: { rel: string; href: string }) => l.rel === "approve")?.href;
      return json({ provider: "paypal", reference: order.id, checkout_url: approve, plan });
    }

    return json({ error: `Unsupported currency ${plan.currency}` }, 400);
  } catch (e) {
    console.error("[subscribe-to-plan] error:", e);
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});
