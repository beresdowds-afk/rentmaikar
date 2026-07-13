// deno-lint-ignore-file no-explicit-any
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const secretKey = Deno.env.get("OPAY_SECRET_KEY");
  if (!secretKey) return new Response("not configured", { status: 503 });

  const raw = await req.text();
  const sig = req.headers.get("Signature") ?? "";
  const expected = createHmac("sha512", secretKey).update(raw).digest("hex");
  if (sig !== expected) return new Response("invalid signature", { status: 401 });

  const evt = JSON.parse(raw);
  const reference: string | undefined = evt?.payload?.reference ?? evt?.reference;
  const opayStatus: string = evt?.payload?.status ?? evt?.status ?? "PENDING";
  if (!reference) return new Response(JSON.stringify({ received: true }), { headers: corsHeaders });

  const status = opayStatus === "SUCCESS" ? "completed"
    : (opayStatus === "FAIL" || opayStatus === "CLOSE") ? "failed" : "pending";
  const failure = status === "failed" ? evt?.payload?.failureReason ?? opayStatus : null;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  await supabase.from("opay_transactions").update({
    status, failure_reason: failure, raw_payload: evt.payload ?? evt,
  }).eq("reference", reference);

  const { data: tx } = await supabase.from("opay_transactions")
    .select("payment_id").eq("reference", reference).maybeSingle();
  if (tx?.payment_id) {
    await supabase.from("payments").update({
      status, failure_reason: failure,
      processed_at: status === "completed" ? new Date().toISOString() : null,
    }).eq("id", tx.payment_id);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
