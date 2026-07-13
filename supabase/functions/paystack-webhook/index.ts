// deno-lint-ignore-file no-explicit-any
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

async function notifyPush(paymentId: string, rentalId: string | null, status: string, amount?: number, currency?: string, reference?: string) {
  const secret = Deno.env.get("CRON_SECRET");
  if (!secret) return;
  try {
    await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-payment-notification`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-internal-secret": secret },
      body: JSON.stringify({ paymentId, rentalId, status, provider: "paystack", amount, currency, reference }),
    });
  } catch { /* best-effort */ }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!secret) return new Response("not configured", { status: 503 });

  const raw = await req.text();
  const signature = req.headers.get("x-paystack-signature") ?? "";
  const expected = createHmac("sha512", secret).update(raw).digest("hex");
  if (signature !== expected) return new Response("invalid signature", { status: 401 });

  const evt = JSON.parse(raw);
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const reference: string | undefined = evt?.data?.reference;

  if (evt.event === "charge.success" && reference) {
    await supabase.from("paystack_transactions").update({
      status: "completed",
      channel: evt.data.channel,
      gateway_response: evt.data.gateway_response,
      failure_reason: null,
      raw_payload: evt.data,
    }).eq("reference", reference);

    const { data: tx } = await supabase.from("paystack_transactions")
      .select("payment_id, amount, currency, rental_id").eq("reference", reference).maybeSingle();
    if (tx?.payment_id) {
      await supabase.from("payments").update({
        status: "completed", processed_at: new Date().toISOString(), failure_reason: null,
      }).eq("id", tx.payment_id);
      await notifyPush(tx.payment_id, tx.rental_id ?? null, "completed", tx.amount ? Number(tx.amount) / 100 : undefined, tx.currency ?? undefined, reference);
    }
  } else if (evt.event === "charge.failed" && reference) {
    await supabase.from("paystack_transactions").update({
      status: "failed",
      failure_reason: evt.data.gateway_response ?? "failed",
      raw_payload: evt.data,
    }).eq("reference", reference);
    const { data: tx } = await supabase.from("paystack_transactions")
      .select("payment_id, amount, currency, rental_id").eq("reference", reference).maybeSingle();
    if (tx?.payment_id) {
      await supabase.from("payments").update({
        status: "failed", failure_reason: evt.data.gateway_response ?? "failed",
      }).eq("id", tx.payment_id);
      await notifyPush(tx.payment_id, tx.rental_id ?? null, "failed", tx.amount ? Number(tx.amount) / 100 : undefined, tx.currency ?? undefined, reference);
    }
  } else if (evt.event === "transfer.success" || evt.event === "transfer.failed") {
    const ref = evt?.data?.reference ?? evt?.data?.transfer_code;
    if (ref) {
      const success = evt.event === "transfer.success";
      await supabase.from("owner_payouts").update({
        status: success ? "completed" : "failed",
        processed_at: new Date().toISOString(),
        failure_reason: success ? null : evt.data.reason ?? "transfer failed",
        raw_payload: evt.data,
      }).eq("transfer_reference", ref);
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
