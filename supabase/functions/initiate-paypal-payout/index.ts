// deno-lint-ignore-file no-explicit-any
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const BodySchema = z.object({
  amount: z.number().positive(),
  payoutAccountId: z.string().uuid(),
  note: z.string().max(255).optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
    const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");
    const mode = (Deno.env.get("PAYPAL_MODE") ?? "sandbox").toLowerCase();
    if (!clientId || !clientSecret) return json({ error: "PayPal not configured" }, 503);

    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return json({ error: "Unauthenticated" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: u } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
    const owner = u?.user;
    if (!owner) return json({ error: "Unauthenticated" }, 401);

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);
    const b = parsed.data;

    const { data: acc } = await supabase.from("owner_payout_accounts")
      .select("*").eq("id", b.payoutAccountId).eq("owner_id", owner.id).maybeSingle();
    if (!acc || acc.provider !== "paypal" || !acc.paypal_email) {
      return json({ error: "Invalid PayPal payout account" }, 400);
    }

    const { count } = await supabase.from("owner_payouts")
      .select("*", { count: "exact", head: true })
      .eq("owner_id", owner.id).in("status", ["pending", "processing"]);
    if ((count ?? 0) > 0) return json({ error: "A payout is already in progress" }, 409);

    const base = mode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
    const tokenResp = await fetch(`${base}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    const token = await tokenResp.json();
    if (!tokenResp.ok) return json({ error: "PayPal auth failed" }, 502);

    const reference = `pyt_${crypto.randomUUID().replace(/-/g, "")}`;
    const payoutResp = await fetch(`${base}/v1/payments/payouts`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        sender_batch_header: {
          sender_batch_id: reference, email_subject: "RentMaikar payout",
          email_message: b.note ?? "Your RentMaikar owner earnings",
        },
        items: [{
          recipient_type: "EMAIL",
          amount: { value: b.amount.toFixed(2), currency: "USD" },
          receiver: acc.paypal_email,
          note: b.note ?? "RentMaikar owner payout",
          sender_item_id: reference,
        }],
      }),
    });
    const payoutBody = await payoutResp.json();
    if (!payoutResp.ok) return json({ error: payoutBody?.message ?? "payout failed", raw: payoutBody }, 502);

    const batchStatus = payoutBody?.batch_header?.batch_status ?? "PENDING";
    const status = batchStatus === "SUCCESS" ? "completed"
      : batchStatus === "DENIED" ? "failed" : "processing";

    const { data: payout } = await supabase.from("owner_payouts").insert({
      owner_id: owner.id, payout_account_id: acc.id, provider: "paypal",
      amount: b.amount, currency: "USD", status,
      transfer_reference: reference,
      transfer_code: payoutBody?.batch_header?.payout_batch_id,
      initiated_by: "owner", raw_payload: payoutBody,
    }).select("*").maybeSingle();

    return json({ payout });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "unknown" }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
