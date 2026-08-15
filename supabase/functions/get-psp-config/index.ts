// deno-lint-ignore-file no-explicit-any
import { corsHeaders } from "../_shared/cors.ts";
import { isOpayConfigured, resolveOpayEnv } from "../_shared/opay-client.ts";

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const paystackPublic = Deno.env.get("PAYSTACK_PUBLIC_KEY") ?? "";
  const opayMerchant = Deno.env.get("OPAY_MERCHANT_ID") ?? "";
  const opayPublic = Deno.env.get("OPAY_PUBLIC_KEY") ?? "";
  const opayEnv = resolveOpayEnv();

  return new Response(
    JSON.stringify({
      paystack: {
        configured: Boolean(paystackPublic && Deno.env.get("PAYSTACK_SECRET_KEY")),
        publicKey: paystackPublic,
      },
      opay: {
        configured: isOpayConfigured(),
        merchantId: opayMerchant,
        publicKey: opayPublic,
        environment: opayEnv,
      },
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
