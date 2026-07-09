// Sends confidential attestation invitations to every referee on an application,
// via Email + SMS + WhatsApp. Each referee receives a unique one-time token link
// to a public attestation page. Callable by the applicant (owner of the app) or admin.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const Body = z.object({ application_id: z.string().uuid() });

const PUBLIC_APP_URL = Deno.env.get("PUBLIC_APP_URL") ?? "https://rentmaikar.com";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const TWILIO_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_FROM = Deno.env.get("TWILIO_PHONE_NUMBER");
const TWILIO_WA_FROM = Deno.env.get("TWILIO_WHATSAPP_FROM") ?? (TWILIO_FROM ? `whatsapp:${TWILIO_FROM}` : null);
const TERMII_API_KEY = Deno.env.get("TERMII_API_KEY");
const TERMII_SENDER_ID = Deno.env.get("TERMII_SENDER_ID") ?? "Rentmaikar";

function genToken() {
  const b = new Uint8Array(24);
  crypto.getRandomValues(b);
  return Array.from(b).map(x => x.toString(16).padStart(2, "0")).join("");
}

async function sendEmail(to: string, name: string, driverName: string, link: string) {
  if (!RESEND_API_KEY || !to) return { ok: false, skipped: !RESEND_API_KEY };
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#0A1628">
      <h2 style="color:#10B981">Confidential Referee Attestation</h2>
      <p>Hello ${name || "there"},</p>
      <p><strong>${driverName}</strong> has listed you as a referee on their Rentmaikar driver application.
      We are kindly asking you to attest to their suitability as a rideshare driver.</p>
      <p><strong>Your response is confidential.</strong> Attesting to this driver does <strong>not</strong>
      place you under any financial obligation, guarantee, or liability on the driver's behalf.</p>
      <p style="margin:24px 0">
        <a href="${link}" style="background:#10B981;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">
          Provide your attestation
        </a>
      </p>
      <p style="color:#6b7280;font-size:12px">If the button doesn't work, paste this link into your browser:<br/>${link}</p>
      <p style="color:#6b7280;font-size:12px">Rentmaikar — support@rentmaikar.com</p>
    </div>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Rentmaikar Verification <verify@rentmaikar.com>",
      to: [to], subject: `Confidential referee attestation for ${driverName}`, html,
    }),
  });
  return { ok: res.ok, status: res.status };
}

async function sendTwilio(to: string, body: string, channel: "sms" | "whatsapp") {
  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) return { ok: false, skipped: true };
  const from = channel === "whatsapp" ? TWILIO_WA_FROM! : TWILIO_FROM;
  const dest = channel === "whatsapp" ? `whatsapp:${to}` : to;
  const auth = btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`);
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ To: dest, From: from, Body: body }),
  });
  return { ok: res.ok, status: res.status };
}

async function sendTermii(to: string, body: string) {
  if (!TERMII_API_KEY) return { ok: false, skipped: true };
  const res = await fetch("https://api.ng.termii.com/api/sms/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to, from: TERMII_SENDER_ID, sms: body, type: "plain", channel: "generic", api_key: TERMII_API_KEY }),
  });
  return { ok: res.ok, status: res.status };
}

function isNigeria(phone?: string | null) {
  return !!phone && (phone.startsWith("+234") || phone.startsWith("234"));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten() }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const auth = req.headers.get("authorization") ?? "";
    const jwt = auth.replace(/^Bearer\s+/i, "");
    const { data: userData } = jwt ? await supa.auth.getUser(jwt) : { data: { user: null } as any };
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: app } = await supa.from("applications").select("id,user_id,full_name,first_name,last_name")
      .eq("id", parsed.data.application_id).maybeSingle();
    if (!app) return new Response(JSON.stringify({ error: "application not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const isOwner = app.user_id === userData.user.id;
    if (!isOwner) {
      const { data: role } = await supa.from("user_roles").select("role")
        .eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
      if (!role) return new Response(JSON.stringify({ error: "forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const driverName = (app as any).full_name
      ?? [(app as any).first_name, (app as any).last_name].filter(Boolean).join(" ")
      ?? "A Rentmaikar driver";

    const { data: refs } = await supa.from("referee_verifications").select("*")
      .eq("application_id", app.id).order("referee_index");
    if (!refs || refs.length === 0) return new Response(JSON.stringify({ ok: true, sent: 0, message: "no referees" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const results: any[] = [];
    for (const r of refs) {
      const token = (r as any).attestation_token ?? genToken();
      const link = `${PUBLIC_APP_URL}/referee-attest?token=${token}`;
      const smsBody = `Hi ${r.full_name || "there"}, ${driverName} listed you as a referee on Rentmaikar. Please confirm their suitability (confidential, no financial obligation): ${link}`;

      const channels: string[] = [];
      let emailRes: any = { skipped: true }, smsRes: any = { skipped: true }, waRes: any = { skipped: true };

      if (r.email) { emailRes = await sendEmail(r.email, r.full_name, driverName, link); if (emailRes.ok) channels.push("email"); }
      if (r.phone) {
        if (isNigeria(r.phone)) {
          smsRes = await sendTermii(r.phone, smsBody);
          if (smsRes.ok) channels.push("sms");
        } else {
          smsRes = await sendTwilio(r.phone, smsBody, "sms");
          if (smsRes.ok) channels.push("sms");
        }
        waRes = await sendTwilio(r.phone, smsBody, "whatsapp");
        if (waRes.ok) channels.push("whatsapp");
      }

      await supa.from("referee_verifications").update({
        attestation_token: token,
        attestation_status: channels.length ? "sent" : (r as any).attestation_status ?? "not_sent",
        attestation_sent_at: new Date().toISOString(),
        notified_channels: channels,
      }).eq("id", r.id);

      results.push({ referee_index: r.referee_index, channels, email: emailRes, sms: smsRes, whatsapp: waRes });
    }

    return new Response(JSON.stringify({ ok: true, application_id: app.id, sent: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
