import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const Body = z.object({
  amount: z.number().positive().max(50_000_000),
  currency: z.enum(["NGN"]).default("NGN"),
  region_code: z.string().max(32).optional(),
  country: z.string().max(32).optional(),
  reference: z.string().min(3).max(64).optional(),
  callback_url: z.string().url().optional(),
  rental_id: z.string().uuid().optional(),
  customer: z.object({
    name: z.string().min(1).max(120),
    email: z.string().email(),
    phone: z.string().min(6).max(20),
  }),
});

function isNigeriaRegion(v?: string | null) {
  if (!v) return true; // permissive when unknown; currency+phone still gate below
  const s = v.toUpperCase();
  return s === "NG" || s === "NGA" || s === "NIGERIA";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const secretKey = Deno.env.get("OPAY_SECRET_KEY");
    const publicKey = Deno.env.get("OPAY_PUBLIC_KEY");
    const merchantId = Deno.env.get("OPAY_MERCHANT_ID");
    if (!secretKey || !publicKey || !merchantId) {
      return new Response(JSON.stringify({ error: "Opay not configured" }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Strict region enforcement: Opay is only for Nigeria.
    const regionInput = parsed.data.region_code ?? parsed.data.country;
    if (!isNigeriaRegion(regionInput)) {
      return new Response(JSON.stringify({
        error: "Opay checkout is only available for Nigeria. Use PayPal or the region's default PSP.",
        code: "region_not_supported",
      }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (parsed.data.currency !== "NGN") {
      return new Response(JSON.stringify({ error: "Opay only accepts NGN" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Phone must be a Nigerian number (+234 or 0 prefix)
    const phoneDigits = parsed.data.customer.phone.replace(/[^0-9+]/g, "");
    if (!(phoneDigits.startsWith("+234") || phoneDigits.startsWith("234") || phoneDigits.startsWith("0"))) {
      return new Response(JSON.stringify({ error: "Opay requires a Nigerian phone number" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reference = parsed.data.reference ?? crypto.randomUUID();
    const body = {
      country: "NG",
      reference,
      amount: { total: Math.round(parsed.data.amount * 100), currency: parsed.data.currency },
      returnUrl: parsed.data.callback_url ?? "",
      cancelUrl: parsed.data.callback_url ?? "",
      callbackUrl: parsed.data.callback_url ?? "",
      userInfo: {
        userName: parsed.data.customer.name,
        userEmail: parsed.data.customer.email,
        userMobile: parsed.data.customer.phone,
      },
      productList: [{ productId: "rentmaikar", name: "Rentmaikar Payment", price: Math.round(parsed.data.amount * 100), quantity: 1 }],
    };
    const res = await fetch("https://cashierapi.opayweb.com/api/v1/international/cashier/create", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${publicKey}`,
        "MerchantId": merchantId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok || data.code !== "00000") {
      return new Response(JSON.stringify({ error: "Opay error", detail: data }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    try {
      const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const auth = req.headers.get("authorization") ?? "";
      const jwt = auth.replace(/^Bearer\s+/i, "");
      const { data: userData } = jwt ? await supa.auth.getUser(jwt) : { data: { user: null } as any };
      await supa.from("payments").insert({
        user_id: userData?.user?.id ?? null,
        rental_id: parsed.data.rental_id ?? null,
        amount: parsed.data.amount,
        currency: parsed.data.currency,
        provider: "opay",
        provider_reference: reference,
        status: "pending",
      });
    } catch { /* best-effort */ }

    return new Response(JSON.stringify({
      reference,
      cashier_url: data?.data?.cashierUrl,
      order_no: data?.data?.orderNo,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
