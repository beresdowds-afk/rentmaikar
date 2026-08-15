import { corsHeaders } from "../_shared/cors.ts";
import { requireAuthenticatedUser } from "../_shared/auth-guards.ts";
import { resolvePayPalMode,
  ensurePayPalConfig,
} from "../_shared/paypal-client.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authRes = await requireAuthenticatedUser(req);
  if (authRes instanceof Response) return authRes;

  const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
  await ensurePayPalConfig();
  const mode = resolvePayPalMode();

  if (!clientId) {
    return new Response(JSON.stringify({ error: "PayPal not configured" }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }


  return new Response(
    JSON.stringify({
      client_id: clientId,
      environment: mode === "live" ? "production" : "sandbox",
      mode,
      currency: "USD",
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
