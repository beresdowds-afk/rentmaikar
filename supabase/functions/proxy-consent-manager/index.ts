// Driver-facing proxy billing manager.
// Actions:
//  - create: create a proxy account row (driver only, one at a time)
//  - resend: resend the consent link via email/SMS/WhatsApp
//  - mark_identity: (admin or system) mark identity verified after Persona callback
//  - tokenize_card: attach a tokenized card returned by Paystack/PayPal on the consent page
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const CreateBody = z.object({
  action: z.literal("create"),
  proxy_full_name: z.string().trim().min(2).max(120),
  proxy_email: z.string().trim().email().max(200),
  proxy_phone: z.string().trim().min(6).max(30).optional(),
  proxy_relationship: z.string().trim().max(80).optional(),
  region: z.enum(["US", "NG"]).default("US"),
  channels: z.array(z.enum(["email", "sms", "whatsapp"])).min(1).default(["email"]),
});

const ResendBody = z.object({
  action: z.literal("resend"),
  proxy_account_id: z.string().uuid(),
  channels: z.array(z.enum(["email", "sms", "whatsapp"])).min(1),
});

const IdentityBody = z.object({
  action: z.literal("mark_identity"),
  proxy_account_id: z.string().uuid(),
  status: z.enum(["submitted", "verified", "failed"]),
  persona_inquiry_id: z.string().optional(),
});

const CardBody = z.object({
  action: z.literal("tokenize_card"),
  token: z.string().min(20),
  provider: z.enum(["paystack", "paypal", "opay"]),
  card_token: z.string().min(4).max(500),
  card_last4: z.string().regex(/^\d{4}$/),
  card_brand: z.string().max(30).optional(),
  card_exp_month: z.number().int().min(1).max(12).optional(),
  card_exp_year: z.number().int().min(2024).max(2100).optional(),
});

const Body = z.union([CreateBody, ResendBody, IdentityBody, CardBody]);

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method not allowed" });

  const url = Deno.env.get("SUPABASE_URL")!;
  const service = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json(400, { error: parsed.error.flatten() });
  const p = parsed.data;

  // Public consent page uses tokenize_card without a session
  const authHeader = req.headers.get("authorization") ?? "";
  let userId: string | null = null;
  if (authHeader.startsWith("Bearer ")) {
    const jwt = authHeader.slice(7);
    const { data } = await service.auth.getUser(jwt);
    userId = data.user?.id ?? null;
  }

  const APP_URL = Deno.env.get("APP_URL") ?? "https://rentmaikar.lovable.app";

  try {
    if (p.action === "create") {
      if (!userId) return json(401, { error: "not authenticated" });
      const { data, error } = await service.from("driver_proxy_billing_accounts").insert({
        driver_id: userId,
        proxy_full_name: p.proxy_full_name,
        proxy_email: p.proxy_email.toLowerCase(),
        proxy_phone: p.proxy_phone,
        proxy_relationship: p.proxy_relationship,
        region: p.region,
        status: "pending",
        consent_channels: p.channels,
      }).select("*").single();
      if (error) return json(400, { error: error.message });
      await sendConsentInvites(service, data, p.channels, APP_URL);
      await service.from("driver_proxy_billing_accounts")
        .update({ status: "awaiting_consent", consent_status: "sent", consent_sent_at: new Date().toISOString() })
        .eq("id", data.id);
      return json(200, { ok: true, proxy_account_id: data.id, consent_link: `${APP_URL}/proxy/consent?token=${data.consent_token}` });
    }

    if (p.action === "resend") {
      if (!userId) return json(401, { error: "not authenticated" });
      const { data: row } = await service.from("driver_proxy_billing_accounts")
        .select("*").eq("id", p.proxy_account_id).maybeSingle();
      if (!row || row.driver_id !== userId) return json(404, { error: "not found" });
      if (row.status === "revoked" || row.status === "active") return json(409, { error: "cannot resend for this status" });
      await sendConsentInvites(service, row, p.channels, APP_URL);
      await service.from("driver_proxy_billing_accounts")
        .update({ consent_sent_at: new Date().toISOString(), consent_channels: p.channels })
        .eq("id", row.id);
      await service.from("proxy_billing_audit_log").insert({
        proxy_account_id: row.id, driver_id: row.driver_id, actor_id: userId, actor_role: "driver",
        action: "consent_resent", details: { channels: p.channels },
      });
      return json(200, { ok: true });
    }

    if (p.action === "mark_identity") {
      // Only admin or service role paths should hit this; require auth
      if (!userId) return json(401, { error: "not authenticated" });
      const { data: isAdmin } = await service.rpc("is_admin");
      if (!isAdmin) return json(403, { error: "admin only" });
      const patch: Record<string, unknown> = { identity_status: p.status };
      if (p.status === "verified") patch.identity_verified_at = new Date().toISOString();
      if (p.persona_inquiry_id) patch.persona_inquiry_id = p.persona_inquiry_id;
      const { error } = await service.from("driver_proxy_billing_accounts").update(patch).eq("id", p.proxy_account_id);
      if (error) return json(400, { error: error.message });
      return json(200, { ok: true });
    }

    if (p.action === "tokenize_card") {
      const { data: row } = await service.from("driver_proxy_billing_accounts")
        .select("*").eq("consent_token", p.token).maybeSingle();
      if (!row) return json(404, { error: "invalid token" });
      if (row.consent_status !== "signed") return json(409, { error: "consent not signed" });
      const { error } = await service.from("driver_proxy_billing_accounts").update({
        card_provider: p.provider, card_token: p.card_token, card_last4: p.card_last4,
        card_brand: p.card_brand, card_exp_month: p.card_exp_month, card_exp_year: p.card_exp_year,
        status: "active",
      }).eq("id", row.id);
      if (error) return json(400, { error: error.message });
      await service.from("proxy_billing_audit_log").insert({
        proxy_account_id: row.id, driver_id: row.driver_id, actor_id: null, actor_role: "proxy",
        action: "card_tokenized", details: { provider: p.provider, last4: p.card_last4 },
      });
      return json(200, { ok: true });
    }

    return json(400, { error: "unknown action" });
  } catch (e) {
    return json(500, { error: String(e) });
  }
});

async function sendConsentInvites(supa: any, row: any, channels: string[], appUrl: string) {
  const link = `${appUrl}/proxy/consent?token=${row.consent_token}`;
  const subject = "Proxy billing consent requested";
  const message = `${row.proxy_full_name}, a driver on Rentmaikar has listed you as their proxy card holder. Please review the request, verify your identity, and sign the consent form: ${link}\n\nIf you didn't expect this, ignore this message. Link expires in 14 days.`;
  const jobs: Promise<any>[] = [];
  if (channels.includes("email")) {
    jobs.push(supa.functions.invoke("send-transactional-email", {
      body: { templateName: "generic-notice", recipientEmail: row.proxy_email,
        idempotencyKey: `proxy-consent-${row.id}-${Date.now()}`,
        templateData: { subject, body: message, ctaLabel: "Review request", ctaUrl: link } },
    }).catch(() => null));
  }
  if (channels.includes("sms") && row.proxy_phone) {
    jobs.push(supa.functions.invoke("send-sms", { body: { to: row.proxy_phone, message } }).catch(() => null));
  }
  if (channels.includes("whatsapp") && row.proxy_phone) {
    jobs.push(supa.functions.invoke("send-whatsapp", { body: { to: row.proxy_phone, message } }).catch(() => null));
  }
  await Promise.all(jobs);
}
