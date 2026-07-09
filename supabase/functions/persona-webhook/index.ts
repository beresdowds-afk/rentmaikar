// Public webhook — signature-verified with PERSONA_WEBHOOK_SECRET.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

async function hmac(secret: string, body: string) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const STATUS_MAP: Record<string, string> = {
  approved: "approved",
  declined: "declined",
  needs_review: "needs_review",
  pending: "pending",
  expired: "expired",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("method not allowed", { status: 405, headers: corsHeaders });
  try {
    const secret = Deno.env.get("PERSONA_WEBHOOK_SECRET");
    const raw = await req.text();
    if (secret) {
      const provided = req.headers.get("persona-signature") ?? "";
      // Persona sends `t=timestamp,v1=hash` — extract v1
      const v1 = provided.split(",").find((p) => p.trim().startsWith("v1="))?.split("=")[1] ?? provided;
      const expected = await hmac(secret, raw);
      if (v1 !== expected) {
        return new Response("invalid signature", { status: 401, headers: corsHeaders });
      }
    }
    const evt = JSON.parse(raw);
    const inquiry = evt?.data?.attributes?.payload?.data ?? evt?.data;
    const inquiryId = inquiry?.id ?? inquiry?.attributes?.["inquiry-id"];
    const status = STATUS_MAP[inquiry?.attributes?.status] ?? "pending";
    if (!inquiryId) return new Response("missing inquiry id", { status: 400, headers: corsHeaders });

    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: row } = await supa
      .from("persona_inquiries")
      .update({
        status,
        verified_at: status === "approved" ? new Date().toISOString() : null,
        raw_payload: evt,
      })
      .eq("inquiry_id", inquiryId)
      .select()
      .maybeSingle();

    // Cascade to referee if this inquiry belongs to a referee
    if (row && row.subject_type === "referee" && row.subject_ref) {
      const newStatus = status === "approved" ? "verified"
        : status === "declined" ? "action_required"
        : status === "needs_review" ? "mismatch"
        : "running";
      const { data: refRow } = await supa
        .from("referee_verifications")
        .update({
          status: newStatus,
          mismatch_reason: status === "approved" ? null : (inquiry?.attributes?.["decision-reason"] ?? null),
          verified_at: status === "approved" ? new Date().toISOString() : null,
        })
        .eq("id", row.subject_ref)
        .select("application_id, user_id, full_name, referee_index")
        .maybeSingle();

      if (refRow && newStatus !== "verified") {
        // Notify user via inbox (best-effort)
        await supa.from("inbox_messages").insert({
          user_id: refRow.user_id,
          direction: "inbound",
          channel: "system",
          subject: "Referee verification issue",
          body: `Referee #${refRow.referee_index + 1} (${refRow.full_name}) could not be verified. Please review and update this referee's details in your application.`,
          status: "unread",
        }).then(() => {}, () => {});
        await supa.from("applications")
          .update({ referees_verification_status: "action_required" })
          .eq("id", refRow.application_id);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
