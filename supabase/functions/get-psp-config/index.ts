// deno-lint-ignore-file no-explicit-any
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const paystackPublic = Deno.env.get("PAYSTACK_PUBLIC_KEY") ?? "";
  const opayMerchant = Deno.env.get("OPAY_MERCHANT_ID") ?? "";
  const opayPublic = Deno.env.get("OPAY_PUBLIC_KEY") ?? "";
  const opayEnv = Deno.env.get("OPAY_ENVIRONMENT") ?? "sandbox";

  return new Response(
    JSON.stringify({
      paystack: {
        configured: Boolean(paystackPublic && Deno.env.get("PAYSTACK_SECRET_KEY")),
        publicKey: paystackPublic,
      },
      opay: {
        configured: Boolean(opayMerchant && Deno.env.get("OPAY_SECRET_KEY")),
        merchantId: opayMerchant,
        publicKey: opayPublic,
        environment: opayEnv,
      },
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
