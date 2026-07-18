import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

interface TestSendRequest {
  to: string; // E.164, e.g. +15551234567
  channel: "sms" | "whatsapp";
  message?: string;
}

const isValidE164 = (phone: string) => /^\+[1-9]\d{6,14}$/.test(phone.trim());

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Missing bearer token" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes?.user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: isAdmin, error: roleErr } = await admin.rpc("has_role", {
      _user_id: userRes.user.id,
      _role: "admin",
    });
    if (roleErr || !isAdmin) {
      return json({ error: "Admin role required" }, 403);
    }

    const body = (await req.json()) as TestSendRequest;
    if (!body?.to || !isValidE164(body.to)) {
      return json({ error: "Invalid 'to' phone (E.164 required, e.g. +15551234567)" }, 400);
    }
    if (body.channel !== "sms" && body.channel !== "whatsapp") {
      return json({ error: "channel must be 'sms' or 'whatsapp'" }, 400);
    }

    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const smsFrom =
      Deno.env.get("TWILIO_MESSAGING_SERVICE_SID") ||
      Deno.env.get("TWILIO_PHONE_NUMBER");
    const waFrom = Deno.env.get("TWILIO_WHATSAPP_NUMBER");

    if (!accountSid || !authToken) {
      return json({ error: "Twilio credentials not configured" }, 500);
    }

    const message =
      body.message?.slice(0, 320) ||
      `Rentmaikar test message via ${body.channel.toUpperCase()} at ${new Date().toISOString()}`;

    const params = new URLSearchParams();
    params.append("Body", message);

    if (body.channel === "whatsapp") {
      if (!waFrom) {
        return json({ error: "TWILIO_WHATSAPP_NUMBER not configured" }, 500);
      }
      params.append("From", waFrom.startsWith("whatsapp:") ? waFrom : `whatsapp:${waFrom}`);
      params.append("To", `whatsapp:${body.to}`);
    } else {
      if (!smsFrom) {
        return json({ error: "TWILIO_MESSAGING_SERVICE_SID or TWILIO_PHONE_NUMBER required" }, 500);
      }
      if (smsFrom.startsWith("MG")) {
        params.append("MessagingServiceSid", smsFrom);
      } else {
        params.append("From", smsFrom);
      }
      params.append("To", body.to);
    }

    // Include status callback so delivery updates flow via twilio-webhook
    const statusCallback = `${supabaseUrl}/functions/v1/twilio-webhook`;
    params.append("StatusCallback", statusCallback);

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const twRes = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    const twBody = await twRes.json().catch(() => ({}));

    // Log to messaging_events for audit
    try {
      await admin.from("messaging_events").insert({
        event_type: "test_send",
        channel: body.channel,
        recipient: body.to,
        status: twRes.ok ? "queued" : "failed",
        provider: "twilio",
        provider_message_id: twBody?.sid ?? null,
        metadata: {
          initiated_by: userRes.user.id,
          twilio_status: twBody?.status,
          twilio_error_code: twBody?.error_code,
          twilio_error_message: twBody?.error_message,
        },
      });
    } catch (_) {
      // best-effort logging
    }

    if (!twRes.ok) {
      console.error("Twilio send failed", twRes.status, twBody);
      return json(
        {
          error: "Twilio API error",
          status: twRes.status,
          twilio: twBody,
        },
        twRes.status,
      );
    }

    return json({
      success: true,
      channel: body.channel,
      to: body.to,
      sid: twBody?.sid,
      twilioStatus: twBody?.status,
      statusCheckPath: twBody?.sid ? `/twilio-test-send?sid=${twBody.sid}` : null,
    });
  } catch (err) {
    console.error("twilio-test-send error", err);
    return json({ error: (err as Error).message }, 500);
  }
});

// Also support GET ?sid=... to poll delivery status
serve;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
