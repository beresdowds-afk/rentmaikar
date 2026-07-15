// deno-lint-ignore-file no-explicit-any
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

async function notifyPush(paymentId: string, rentalId: string | null, status: string, amount?: number, currency?: string, reference?: string) {
  const secret = Deno.env.get("CRON_SECRET");
  if (!secret) return;
  try {
    await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-payment-notification`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-internal-secret": secret },
      body: JSON.stringify({ paymentId, rentalId, status, provider: "opay", amount, currency, reference }),
    });
  } catch { /* best-effort */ }
}


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
    .select("payment_id, amount, currency, rental_id").eq("reference", reference).maybeSingle();
  if (tx?.payment_id) {
    await supabase.from("payments").update({
      status, failure_reason: failure,
      processed_at: status === "completed" ? new Date().toISOString() : null,
    }).eq("id", tx.payment_id);
    await notifyPush(tx.payment_id, tx.rental_id ?? null, status, tx.amount ? Number(tx.amount) : undefined, tx.currency ?? undefined, reference);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
