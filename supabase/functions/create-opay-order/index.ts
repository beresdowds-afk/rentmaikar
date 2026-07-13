// deno-lint-ignore-file no-explicit-any
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createHmac } from "node:crypto";
import { z } from "npm:zod@3";
import { resolvePaymentContext } from "../_shared/resolve-payment-context.ts";

const BodySchema = z.object({
  amount: z.number().positive(),
  rentalId: z.string().uuid().optional(),
  vehicleId: z.string().uuid().optional(),
  driverId: z.string().uuid().optional(),
  paymentFrequency: z.enum(["daily", "weekly"]).optional(),
  description: z.string().max(255).optional(),
  callbackUrl: z.string().url().optional(),
  returnUrl: z.string().url().optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const merchantId = Deno.env.get("OPAY_MERCHANT_ID");
    const secretKey = Deno.env.get("OPAY_SECRET_KEY");
    const publicKey = Deno.env.get("OPAY_PUBLIC_KEY");
    const env = (Deno.env.get("OPAY_ENVIRONMENT") ?? "sandbox").toLowerCase();
    if (!merchantId || !secretKey || !publicKey) return json({ error: "Opay not configured" }, 503);

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);
    const b = parsed.data;

    const auth = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    let driverId = b.driverId;
    if (auth.startsWith("Bearer ")) {
      const { data: u } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
      driverId = driverId ?? u?.user?.id;
    }
    if (!driverId) return json({ error: "Unauthenticated" }, 401);

    const ctx = await resolvePaymentContext({
      supabase, rentalId: b.rentalId, vehicleId: b.vehicleId,
    });
    if ("error" in ctx) return json({ error: ctx.error }, 400);

    const reference = `rmk_${crypto.randomUUID().replace(/-/g, "")}`;
    const amountMinor = Math.round(b.amount * 100);
    const baseUrl = env === "live" ? "https://liveapi.opaycheckout.com" : "https://sandboxapi.opaycheckout.com";

    const payload = {
      country: "NG",
      reference,
      amount: { total: amountMinor, currency: "NGN" },
      returnUrl: b.returnUrl,
      callbackUrl: b.callbackUrl,
      cancelUrl: b.returnUrl,
      expireAt: 30,
      productList: [{
        productId: b.rentalId ?? "rental",
        name: b.description ?? "RentMaikar rental payment",
        description: b.description ?? "Rental payment",
        price: amountMinor, quantity: 1, currency: "NGN",
      }],
      userInfo: { userId: driverId },
    };

    const bodyStr = JSON.stringify(payload);
    const sig = createHmac("sha512", secretKey).update(bodyStr).digest("hex");

    const resp = await fetch(`${baseUrl}/api/v1/international/cashier/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${publicKey}`,
        MerchantId: merchantId,
        Signature: sig,
      },
      body: bodyStr,
    });
    const pay = await resp.json();
    if (!resp.ok || pay?.code !== "00000") {
      return json({ error: pay?.message ?? "Opay create failed", raw: pay }, 502);
    }

    const { data: payment, error: paymentError } = await supabase.from("payments").insert({
      rental_id: ctx.rentalId, driver_id: driverId,
      owner_id: ctx.ownerId, vehicle_id: ctx.vehicleId,
      amount: b.amount, currency: "NGN",
      status: "pending", payment_method: "opay",
      payment_frequency: b.paymentFrequency ?? "weekly", transaction_id: reference,
    }).select("id").single();

    if (paymentError || !payment?.id) {
      console.error("[create-opay-order] payment insert failed:", paymentError);
      return json({ error: "Failed to record payment" }, 500);
    }

    await supabase.from("opay_transactions").insert({
      reference, order_no: pay.data?.orderNo, cashier_url: pay.data?.cashierUrl,
      currency: "NGN", amount: b.amount, status: "pending",
      rental_id: ctx.rentalId, driver_id: driverId, vehicle_id: ctx.vehicleId,
      payment_id: payment.id, raw_payload: pay.data,
    });

    return json({
      reference, order_no: pay.data?.orderNo, cashier_url: pay.data?.cashierUrl,
      payment_id: payment.id,
    });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "unknown" }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
