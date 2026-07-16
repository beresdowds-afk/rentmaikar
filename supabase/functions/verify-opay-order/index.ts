// deno-lint-ignore-file no-explicit-any
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createHmac } from "node:crypto";
import { z } from "npm:zod@3";
import { requireAuthenticatedUser } from "../_shared/auth-guards.ts";

const BodySchema = z.object({ reference: z.string().min(6).max(128) });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Require an authenticated caller AND require them to be a party on the
  // transaction they're verifying. Prevents anonymous enumeration and
  // status-flipping attacks on other users' payments.
  const authRes = await requireAuthenticatedUser(req);
  if (authRes instanceof Response) return authRes;
  const userId = authRes.userId;

  try {
    const merchantId = Deno.env.get("OPAY_MERCHANT_ID");
    const secretKey = Deno.env.get("OPAY_SECRET_KEY");
    const publicKey = Deno.env.get("OPAY_PUBLIC_KEY");
    const env = (Deno.env.get("OPAY_ENVIRONMENT") ?? "sandbox").toLowerCase();
    if (!merchantId || !secretKey || !publicKey) return json({ error: "Opay not configured" }, 503);

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);
    const { reference } = parsed.data;

    const supabaseCheck = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: ownTx } = await supabaseCheck.from("opay_transactions")
      .select("driver_id").eq("reference", reference).maybeSingle();
    if (ownTx && ownTx.driver_id && ownTx.driver_id !== userId) {
      return json({ error: "Forbidden" }, 403);
    }

    const baseUrl = env === "live" ? "https://liveapi.opaycheckout.com" : "https://sandboxapi.opaycheckout.com";
    const payload = JSON.stringify({ reference, country: "NG" });
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
    if (!resp.ok) return json({ error: body?.message ?? "verify failed", raw: body }, 502);

    const opayStatus: string = body?.data?.status ?? "PENDING";
    const status = opayStatus === "SUCCESS" ? "completed"
      : opayStatus === "FAIL" || opayStatus === "CLOSE" ? "failed" : "pending";
    const failure = status === "failed" ? body?.data?.failureReason ?? opayStatus : null;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    await supabase.from("opay_transactions").update({
      status, failure_reason: failure, raw_payload: body?.data,
    }).eq("reference", reference);

    const { data: tx } = await supabase.from("opay_transactions")
      .select("payment_id").eq("reference", reference).maybeSingle();
    if (tx?.payment_id) {
      await supabase.from("payments").update({
        status, failure_reason: failure,
        processed_at: status === "completed" ? new Date().toISOString() : null,
      }).eq("id", tx.payment_id);
    }

    return json({ status, reference, payment_id: tx?.payment_id ?? null });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "unknown" }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
