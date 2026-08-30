// Resend delivery-event webhook.
//
// Receives email.delivered / email.bounced / email.complained / email.opened /
// email.clicked / email.delivery_delayed events and records the FINAL outcome
// for each message in email_send_log (the monitoring source of truth), so the
// admin email delivery page reflects reality beyond the initial send result.
//
// Signature: Svix (svix-id / svix-timestamp / svix-signature) using
// RESEND_WEBHOOK_SECRET. Falls back to a plain HMAC of the raw body for
// non-Svix style signatures. Fails closed when no secret is configured.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, apikey, content-type, svix-id, svix-timestamp, svix-signature, webhook-id, webhook-timestamp, webhook-signature",
  "Content-Type": "application/json",
};

const b64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)));

async function hmacBase64(secretBytes: Uint8Array, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return b64(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message)));
}

function secretBytes(secret: string): Uint8Array {
  // Svix secrets look like "whsec_<base64>"; the base64 part is the raw key.
  if (secret.startsWith("whsec_")) {
    const raw = secret.slice(6);
    try {
      return Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
    } catch {
      return new TextEncoder().encode(raw);
    }
  }
  return new TextEncoder().encode(secret);
}

async function verifySignature(req: Request, rawBody: string): Promise<boolean> {
  const secret = Deno.env.get("RESEND_WEBHOOK_SECRET");
  if (!secret) {
    console.error("RESEND_WEBHOOK_SECRET not configured — rejecting event");
    return false;
  }
  const header =
    req.headers.get("svix-signature") ?? req.headers.get("webhook-signature");
  if (!header) return false;

  const id = req.headers.get("svix-id") ?? req.headers.get("webhook-id") ?? "";
  const ts = req.headers.get("svix-timestamp") ?? req.headers.get("webhook-timestamp") ?? "";

  // Reject replays older than 5 minutes when a timestamp is present.
  if (ts) {
    const skew = Math.abs(Date.now() / 1000 - Number(ts));
    if (!Number.isFinite(skew) || skew > 300) return false;
  }

  const provided = header
    .split(" ")
    .map((p) => (p.includes(",") ? p.split(",")[1] : p))
    .filter(Boolean);

  const candidates = new Set<string>();
  if (id && ts) candidates.add(await hmacBase64(secretBytes(secret), `${id}.${ts}.${rawBody}`));
  candidates.add(await hmacBase64(secretBytes(secret), rawBody));
  candidates.add(await hmacBase64(new TextEncoder().encode(secret), rawBody));

  return provided.some((sig) => candidates.has(sig));
}

/** Map a Resend event type to an email_send_log status (null = ignore). */
function statusFor(type: string): string | null {
  switch (type) {
    case "email.delivered":
      return "sent";
    case "email.bounced":
      return "bounced";
    case "email.complained":
      return "complained";
    case "email.failed":
      return "failed";
    default:
      // opened / clicked / sent / delivery_delayed carry no final outcome.
      return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const rawBody = await req.text();

  if (!(await verifySignature(req, rawBody))) {
    return new Response(JSON.stringify({ error: "invalid signature" }), {
      status: 401,
      headers: corsHeaders,
    });
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  const type = String(event?.type ?? "");
  const data = (event?.data ?? {}) as Record<string, unknown>;
  const status = statusFor(type);

  const providerId = String(data?.email_id ?? (data as { id?: string })?.id ?? "");
  const recipient = Array.isArray(data?.to)
    ? String((data.to as string[])[0] ?? "")
    : String(data?.to ?? "");
  const reason =
    (data?.bounce as { message?: string } | undefined)?.message ??
    (data?.reason as string | undefined) ??
    (data?.error as string | undefined) ??
    null;

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  if (!status) {
    return new Response(JSON.stringify({ ok: true, ignored: type }), { headers: corsHeaders });
  }

  try {
    // Correlate back to the original send: our email_send_log rows carry either
    // the provider id or an app-side idempotency key in metadata.
    let messageId = providerId;
    let templateName = "unknown";

    const { data: existing } = await admin
      .from("email_send_log")
      .select("message_id, template_name")
      .or(
        [
          providerId ? `message_id.eq.${providerId}` : null,
          providerId ? `metadata->>provider_message_id.eq.${providerId}` : null,
        ]
          .filter(Boolean)
          .join(","),
      )
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing?.message_id) {
      messageId = existing.message_id as string;
      templateName = (existing.template_name as string) ?? templateName;
    } else if (!messageId) {
      messageId = `resend-event-${crypto.randomUUID()}`;
    }

    // Append the latest status; every dashboard query dedupes by message_id and
    // keeps the newest row, so this becomes the final outcome.
    await admin.from("email_send_log").insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: recipient || "unknown",
      status,
      error_message: reason,
      metadata: {
        source: "resend-webhook",
        event_type: type,
        provider_message_id: providerId || null,
        raw: data,
      },
    });

    // Keep the queue table in sync where we can match on the provider id.
    if (providerId) {
      const patch: Record<string, unknown> =
        status === "sent"
          ? { status: "delivered", delivered_at: new Date().toISOString() }
          : { status, failed_at: new Date().toISOString(), error: reason };
      await admin.from("email_logs").update(patch).eq("message_id", providerId);
    }

    return new Response(JSON.stringify({ ok: true, type, status, message_id: messageId }), {
      headers: corsHeaders,
    });
  } catch (e) {
    console.error("resend-events error:", (e as Error)?.message ?? e);
    return new Response(JSON.stringify({ error: "processing failed" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
