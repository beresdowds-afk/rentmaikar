// Public webhook — signature-verified with PERSONA_WEBHOOK_SECRET.
import { corsHeaders } from "../_shared/cors.ts";
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

function collectMismatches(attrs: any): Record<string, unknown> {
  const mm: Record<string, unknown> = {};
  const checks = attrs?.checks ?? attrs?.["checks"] ?? [];
  if (Array.isArray(checks)) {
    for (const c of checks) {
      const st = c?.status ?? c?.attributes?.status;
      if (st && st !== "passed") {
        mm[c?.name ?? c?.attributes?.name ?? "unknown"] = {
          status: st,
          reasons: c?.reasons ?? c?.attributes?.reasons,
        };
      }
    }
  }
  const dr = attrs?.["decision-reason"] ?? attrs?.decision_reason;
  if (dr) mm._decision_reason = dr;
  return mm;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("method not allowed", { status: 405, headers: corsHeaders });
  try {
    const secret = Deno.env.get("PERSONA_WEBHOOK_SECRET");
    const raw = await req.text();
    if (secret) {
      const provided = req.headers.get("persona-signature") ?? "";
      const v1 = provided.split(",").find((p) => p.trim().startsWith("v1="))?.split("=")[1] ?? provided;
      const expected = await hmac(secret, raw);
      if (v1 !== expected) {
        return new Response("invalid signature", { status: 401, headers: corsHeaders });
      }
    }
    const evt = JSON.parse(raw);
    const inquiry = evt?.data?.attributes?.payload?.data ?? evt?.data;
    const inquiryId = inquiry?.id ?? inquiry?.attributes?.["inquiry-id"];
    const attrs = inquiry?.attributes ?? {};
    const status = STATUS_MAP[attrs?.status] ?? "pending";
    if (!inquiryId) return new Response("missing inquiry id", { status: 400, headers: corsHeaders });

    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const mismatch = collectMismatches(attrs);

    const { data: row } = await supa
      .from("persona_inquiries")
      .update({
        status,
        verified_at: status === "approved" ? new Date().toISOString() : null,
        mismatch_fields: mismatch,
        raw_payload: evt,
      })
      .eq("inquiry_id", inquiryId)
      .select()
      .maybeSingle();

    if (row) {
      // Self approval → mark profile
      if (row.subject_type === "self") {
        await supa.from("profiles").update({
          identity_verification_status: status,
          identity_verified_at: status === "approved" ? new Date().toISOString() : null,
          identity_verified_inquiry_id: status === "approved" ? inquiryId : null,
        }).eq("user_id", row.user_id);
      }

      // Referee cascade
      if (row.subject_type === "referee" && row.subject_ref) {
        const newStatus = status === "approved" ? "verified"
          : status === "declined" ? "action_required"
          : status === "needs_review" ? "mismatch"
          : "running";
        const { data: refRow } = await supa
          .from("referee_verifications")
          .update({
            status: newStatus,
            mismatch_reason: status === "approved" ? null : (attrs?.["decision-reason"] ?? null),
            verified_at: status === "approved" ? new Date().toISOString() : null,
          })
          .eq("id", row.subject_ref)
          .select("application_id, user_id, full_name, referee_index")
          .maybeSingle();

        if (refRow && newStatus !== "verified") {
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
