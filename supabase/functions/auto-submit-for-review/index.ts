// Auto-submit an application for admin review once all required documents are uploaded.
// - Called by the driver client when their document completion hits 100%.
// - Idempotent: only transitions `pending` -> `under_review` once.
// - Triggers notify-referees + verify-referees + persona-create-inquiry as best-effort.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type Region = "usa" | "nigeria";

// Mirrors the client's required-doc matrix so the server enforces the same gate.
const DRIVER_REQUIRED: Record<Region, string[]> = {
  usa: ["driver_license", "national_id", "rideshare_approval"],
  nigeria: ["driver_license", "national_id", "police_report", "nin", "bvn", "rideshare_approval"],
};

async function callFn(name: string, body: unknown, authHeader: string | null) {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader ?? `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
      },
      body: JSON.stringify(body),
    });
    const txt = await res.text();
    return { ok: res.ok, status: res.status, body: txt };
  } catch (e) {
    return { ok: false, status: 0, body: (e as Error).message };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing Authorization" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: userData, error: uerr } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
  if (uerr || !userData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const user = userData.user;

  const { data: app, error: appErr } = await admin
    .from("applications")
    .select("id,email,status,country_code,application_type,first_name,last_name")
    .eq("email", user.email!)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (appErr || !app) {
    return new Response(JSON.stringify({ error: "No application found for this user" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const region: Region = (app.country_code ?? "").toString().toUpperCase() === "NG" ? "nigeria" : "usa";
  const required = DRIVER_REQUIRED[region];

  const { data: docs } = await admin
    .from("user_documents")
    .select("document_type,status")
    .eq("user_id", user.id)
    .is("vehicle_id", null);

  const uploaded = new Set((docs ?? []).filter((d: any) => d.status !== "rejected").map((d: any) => d.document_type));
  const missing = required.filter((t) => !uploaded.has(t));
  if (missing.length > 0) {
    return new Response(JSON.stringify({ error: "Missing required documents", missing }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const alreadySubmitted = app.status !== "pending";

  if (!alreadySubmitted) {
    const { error: upErr } = await admin
      .from("applications")
      .update({ status: "under_review", updated_at: new Date().toISOString() })
      .eq("id", app.id)
      .eq("status", "pending"); // guard against races
    if (upErr) {
      return new Response(JSON.stringify({ error: upErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // Best-effort: kick off the downstream verification pipeline
  const [notify, verify, persona] = await Promise.all([
    callFn("notify-referees", { application_id: app.id }, authHeader),
    callFn("verify-referees", { application_id: app.id }, authHeader),
    callFn("persona-create-inquiry", { application_id: app.id }, authHeader),
  ]);

  return new Response(JSON.stringify({
    ok: true,
    application_id: app.id,
    status: alreadySubmitted ? app.status : "under_review",
    already_submitted: alreadySubmitted,
    downstream: {
      notify_referees: { ok: notify.ok, status: notify.status },
      verify_referees: { ok: verify.ok, status: verify.status },
      persona_create_inquiry: { ok: persona.ok, status: persona.status },
    },
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
});
