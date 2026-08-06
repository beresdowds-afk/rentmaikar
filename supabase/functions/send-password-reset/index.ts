// Self-service password reset that does NOT depend on Supabase's built-in
// auth mailer. It mints a recovery link with the service role and delivers it
// through our own branded Resend pipeline (send-outbound-email), which is the
// same path every other transactional email uses.
//
// Always responds `{ ok: true }` so it can never be used to enumerate accounts.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const ok = () =>
    new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email ?? "").trim().toLowerCase();
    if (!email || email.length > 254 || !EMAIL_RE.test(email)) return ok();

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Server-side rate limit: 3 reset emails per address per 15 minutes.
    const { data: allowed } = await admin.rpc("check_auth_rate_limit", {
      _identifier: `reset:${email}`,
      _endpoint: "auth.reset_password.server",
      _max_requests: 3,
      _window_seconds: 900,
    });
    if (allowed === false) return ok();

    const siteUrl =
      (typeof body?.redirectOrigin === "string" &&
      /^https:\/\/[a-z0-9.-]+(\.lovable\.app|\.lovableproject\.com|rentmaikar\.com)$/i.test(
        body.redirectOrigin,
      )
        ? body.redirectOrigin
        : null) ??
      req.headers.get("origin") ??
      Deno.env.get("SITE_URL") ??
      "https://rentmaikar.com";

    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${siteUrl}/reset-password` },
    });

    if (linkErr || !linkData?.properties?.action_link) {
      // Unknown address (or auth error) — stay silent to the caller.
      console.log("reset link not generated:", linkErr?.message ?? "no link");
      return ok();
    }

    let name = "there";
    const userId = (linkData as { user?: { id?: string } })?.user?.id;
    if (userId) {
      const { data: prof } = await admin
        .from("profiles")
        .select("full_name")
        .eq("user_id", userId)
        .maybeSingle();
      if (prof?.full_name) name = String(prof.full_name).split(" ")[0];
    }

    // send-outbound-email is guarded by requireServiceRole, which compares the
    // raw Bearer token — so call it with an explicit service-role header
    // instead of functions.invoke (which does not always forward it).
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sendRes = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-outbound-email`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          action: "send",
          to: email,
          templateName: "password_reset",
          category: "auth",
          priority: "high",
          data: {
            firstName: name,
            resetUrl: linkData.properties.action_link,
            expiresIn: "60 minutes",
          },
        }),
      },
    );
    // Detect failure both from the HTTP status and from a soft-failure body
    // (send-outbound-email answers 200 with { success: false } when the
    // provider rejects, e.g. an unverified Resend sender domain).
    let delivered = sendRes.ok;
    const rawBody = await sendRes.text();
    if (delivered) {
      try {
        const parsed = JSON.parse(rawBody);
        if (parsed?.success === false || parsed?.error) delivered = false;
      } catch { /* non-JSON body — trust the status */ }
    }

    if (!delivered) {
      console.error("branded reset email failed:", sendRes.status, rawBody);
      // Fallback: use the built-in auth mailer so the user is never stranded
      // without a way back into their account.
      const { error: fallbackErr } = await admin.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl}/reset-password`,
      });
      if (fallbackErr) {
        console.error("fallback reset email failed:", fallbackErr.message);
      } else {
        console.log("reset email delivered via built-in auth mailer");
      }
    }



    return ok();
  } catch (e) {
    console.error("send-password-reset error:", (e as Error)?.message ?? e);
    return ok();
  }
});
