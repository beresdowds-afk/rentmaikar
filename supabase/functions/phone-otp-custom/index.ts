// Custom phone OTP (SMS via Twilio connector).
// Alternative to Supabase-native phone auth. Selected via
// public.platform_kv_settings key='phone_otp_provider'.

// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

async function sha256(input: string) {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

async function sendSms(to: string, body: string) {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const twilioKey = Deno.env.get("TWILIO_API_KEY");
  const from = Deno.env.get("TWILIO_PHONE_NUMBER") ?? Deno.env.get("TWILIO_FROM");
  if (!lovableKey || !twilioKey || !from) {
    throw new Error("Twilio is not configured (missing TWILIO_API_KEY, TWILIO_PHONE_NUMBER, or LOVABLE_API_KEY)");
  }
  const res = await fetch(`${GATEWAY_URL}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": twilioKey,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: from, Body: body }),
  });
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Twilio error [${res.status}]: ${errBody}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { action, phone, code, full_name, role } = await req.json();
    if (!phone || typeof phone !== "string" || !phone.startsWith("+")) {
      return jsonRes({ error: "Phone must be in E.164 format" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (action === "send") {
      // Rate limit: max 3 in last 10 minutes per phone
      const since = new Date(Date.now() - 10 * 60_000).toISOString();
      const { count } = await admin
        .from("phone_otp_codes")
        .select("*", { count: "exact", head: true })
        .eq("phone", phone)
        .gte("created_at", since);
      if ((count ?? 0) >= 3) {
        return jsonRes({ error: "Too many OTP requests. Please wait a few minutes." }, 429);
      }

      const otp = String(Math.floor(100000 + Math.random() * 900000));
      const code_hash = await sha256(otp);
      const expires_at = new Date(Date.now() + 5 * 60_000).toISOString();

      const { error: insertErr } = await admin.from("phone_otp_codes").insert({
        phone, code_hash, channel: "sms", expires_at,
      });
      if (insertErr) throw insertErr;

      await sendSms(phone, `Your Rentmaikar verification code is ${otp}. Expires in 5 minutes.`);
      return jsonRes({ success: true });
    }

    if (action === "verify") {
      if (!code || typeof code !== "string") return jsonRes({ error: "Missing code" }, 400);

      const code_hash = await sha256(code);
      const { data: rows, error: readErr } = await admin
        .from("phone_otp_codes")
        .select("*")
        .eq("phone", phone)
        .is("consumed_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1);
      if (readErr) throw readErr;
      const row = rows?.[0];
      if (!row) return jsonRes({ error: "Code expired. Please request a new one." }, 400);
      if (row.code_hash !== code_hash) {
        await admin.from("phone_otp_codes").update({ attempts: (row.attempts ?? 0) + 1 }).eq("id", row.id);
        return jsonRes({ error: "Incorrect code" }, 400);
      }
      await admin.from("phone_otp_codes").update({ consumed_at: new Date().toISOString() }).eq("id", row.id);

      // Find or create user by phone
      let userId: string | null = null;
      const { data: list } = await admin.auth.admin.listUsers();
      const existing = list?.users.find((u: any) => u.phone === phone.replace(/^\+/, "") || u.phone === phone);
      if (existing) {
        userId = existing.id;
      } else {
        const { data: created, error: createErr } = await admin.auth.admin.createUser({
          phone,
          phone_confirm: true,
          user_metadata: { full_name: full_name ?? null },
        });
        if (createErr) throw createErr;
        userId = created.user?.id ?? null;
        if (userId && role && ["driver", "owner"].includes(role)) {
          await admin.from("user_roles").upsert({ user_id: userId, role }, { onConflict: "user_id,role" });
        }
      }
      if (!userId) return jsonRes({ error: "Could not resolve user" }, 500);

      // Issue a short-lived password so the client can sign in and get a session
      const tempPassword = crypto.randomUUID() + "!Aa1";
      await admin.auth.admin.updateUserById(userId, { password: tempPassword });

      return jsonRes({ success: true, user_id: userId, phone, temp_password: tempPassword });
    }

    return jsonRes({ error: "Unknown action" }, 400);
  } catch (e: any) {
    console.error("phone-otp-custom error:", e?.message ?? e);
    return jsonRes({ error: e?.message ?? String(e) }, 500);
  }
});
