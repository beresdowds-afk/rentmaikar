// deno-lint-ignore-file no-explicit-any
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const BodySchema = z.object({
  amount: z.number().positive(),
  payoutAccountId: z.string().uuid(),
  reason: z.string().max(100).optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!secret) return json({ error: "Paystack not configured" }, 503);

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
    if (!acc || acc.provider !== "paystack" || !acc.recipient_code) {
      return json({ error: "Invalid Paystack payout account" }, 400);
    }

    // Guard against duplicate in-flight
    const { count } = await supabase.from("owner_payouts")
      .select("*", { count: "exact", head: true })
      .eq("owner_id", owner.id).in("status", ["pending", "processing"]);
    if ((count ?? 0) > 0) return json({ error: "A payout is already in progress" }, 409);

    const reference = `pyt_${crypto.randomUUID().replace(/-/g, "")}`;
    const amountMinor = Math.round(b.amount * 100);

    const resp = await fetch("https://api.paystack.co/transfer", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "balance", amount: amountMinor, currency: acc.currency,
        recipient: acc.recipient_code, reason: b.reason ?? "RentMaikar owner payout", reference,
      }),
    });
    const body = await resp.json();
    if (!resp.ok || !body?.status) return json({ error: body?.message ?? "transfer failed" }, 502);

    const { data: payout } = await supabase.from("owner_payouts").insert({
      owner_id: owner.id, payout_account_id: acc.id, provider: "paystack",
      amount: b.amount, currency: acc.currency,
      status: body.data.status === "success" ? "completed" : "processing",
      transfer_reference: reference, transfer_code: body.data.transfer_code,
      initiated_by: "owner", raw_payload: body.data,
    }).select("*").maybeSingle();

    return json({ payout });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "unknown" }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
