import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type AppRole =
  | "admin"
  | "admin_assistant"
  | "owner"
  | "driver"
  | "legal_support"
  | "iot_support"
  | "vehicle_support";

interface CreateUserBody {
  email: string;
  full_name: string;
  role: AppRole;
  phone?: string;
}

function generateTempPassword(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 24) + "!Aa1";
}

// Normalize to E.164 (+ followed by 8–15 digits).
function normalizePhone(raw?: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Strip everything except leading + and digits.
  const cleaned = "+" + trimmed.replace(/[^\d]/g, "");
  return /^\+\d{8,15}$/.test(cleaned) ? cleaned : null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
console.log("STEP 1 Role check");
    // Check caller is admin directly (service role bypasses has_role() guard
   console.log("STEP 2 Create auth user");
    // because auth.uid() is NULL when called with the service key).
    const { data: callerRoles, error: callerRoleErr } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    if (callerRoleErr) {
      console.error("caller role lookup failed:", callerRoleErr);
      return new Response(JSON.stringify({ error: "Role check failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!(callerRoles || []).some((r) => r.role === "admin")) {
      return new Response(JSON.stringify({ error: "Admins only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
console.log("STEP 3 Insert role");
    const body = (await req.json()) as CreateUserBody;
    const { email, full_name, role } = body;
    if (!email || !full_name || !role) {
      return new Response(
        JSON.stringify({ error: "email, full_name and role are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Drivers and owners must self-register so they complete their own
    // identity + address verification. Block admin-side creation.
    if (role === "driver" || role === "owner") {
      return new Response(
        JSON.stringify({
          error:
            "Drivers and owners must self-register through the public signup so they complete identity verification themselves.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Validate phone if provided – reject bad numbers before user creation.
    let normalizedPhone: string | null = null;
    if (body.phone && body.phone.trim()) {
      normalizedPhone = normalizePhone(body.phone);
      if (!normalizedPhone) {
        return new Response(
          JSON.stringify({
            error:
              "Invalid phone number. Use international format, e.g. +15551234567.",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    const tempPassword = generateTempPassword();
    const { data: created, error: createErr } =
      await admin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        phone: normalizedPhone || undefined,
        user_metadata: { full_name },
      });

    if (createErr || !created.user) {
      return new Response(
        JSON.stringify({ error: createErr?.message || "Failed to create user" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const newUserId = created.user.id;

    const { error: roleErr } = await admin
      .from("user_roles")
      .insert({ user_id: newUserId, role });
    if(roleErr){
    throw roleErr;
}("role insert failed:", roleErr);

    await admin
    console.log("STEP 4 Create profile");
    const { error: profileError } = await admin
  .from("profiles")
  .upsert({
      user_id: newUserId,
      email,
      full_name,
      phone: normalizedPhone,
      is_active: true,
  });

if (profileError) {
    throw profileError;
}
    const siteUrl =
      req.headers.get("origin") ||
      Deno.env.get("SITE_URL") ||
      "https://rentmaikar.com";

    const { data: linkData } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${siteUrl}/reset-password` },
    });
    console.log("STEP 5 Generate reset link");
    const resetLink = linkData?.properties?.action_link || `${siteUrl}/auth`;

    // Fire the standard reset-password email.
   
    console.log("STEP 6 Send email")
      ;let emailSent = false;
    let emailError: string | null = null;
    try {
      const { error: resetErr } = await admin.auth.resetPasswordForEmail(
        email,
        { redirectTo: `${siteUrl}/reset-password` },
      );
      if (resetErr) throw resetErr;
      emailSent = true;
    } catch (e: any) {
      emailError = e?.message || "reset email failed";
      console.error("reset email failed:", e);
    }

    // Best-effort branded welcome email (does not affect emailSent flag).
    try {
      await admin.functions.invoke("send-outbound-email", {
        body: {
          action: "send",
          to: email,
          templateName: "password_reset",
          category: "auth",
          priority: "high",
          data: {
            name: full_name,
            resetLink,
            note: `An administrator created your Rentmaikar ${role.replace(
              "_",
              " ",
            )} account. Please sign in as soon as possible and set your password using the "Forgot password" flow.`,
          },
        },
      });
    } catch (e) {
      console.error("welcome email failed:", e);
    }
console.log("STEP 7 Send SMS");
    let smsSent = false;
    let smsError: string | null = null;
    if (normalizedPhone) {
      try {
        const { error: smsErr } = await admin.functions.invoke(
          "send-sms-notification",
          {
            body: {
              phone: normalizedPhone,
              channel: "sms",
              notificationType: "general",
              name: full_name,
              customMessage: `Welcome to Rentmaikar, ${full_name}! Your ${role.replace(
                "_",
                " ",
              )} account was created by an administrator. Sign in at ${siteUrl}/auth and use "Forgot password" to set your own password.`,
            },
          },
        );
        if (smsErr) throw smsErr;
        smsSent = true;
      } catch (e: any) {
        smsError = e?.message || "sms failed";
        console.error("welcome SMS failed:", e);
      }
    }

    const instructions = [
      `1. Ask ${full_name} to open ${siteUrl}/auth and click "Forgot password".`,
      `2. They will receive a reset link at ${email}${
        normalizedPhone ? ` and an SMS at ${normalizedPhone}` : ""
      }.`,
      `3. Once they set a new password, they can sign in as ${role.replace(
        "_",
        " ",
      )}.`,
    ].join("\n");

    // Audit log — includes admin id, created user id, and notification flags.
   console.log("STEP 8 Audit");
    const {error:auditError}=await admin
.from("role_audit_log")
.insert({...});

if(auditError){
    console.error(auditError);
}
      actor_id: userData.user.id,
      target_user_id: newUserId,
      action: "created",
      new_role: role,
      notes: JSON.stringify({
        summary: `Created by administrator ${userData.user.email || userData.user.id}. Pending password reset.`,
        email,
        phone: normalizedPhone,
        email_sent: emailSent,
        sms_sent: smsSent,
        email_error: emailError,
        sms_error: smsError,
      }),
    });

    return new Response(
      JSON.stringify({
        success: true,
        user_id: newUserId,
        email,
        phone: normalizedPhone,
        email_sent: emailSent,
        sms_sent: smsSent,
        email_error: emailError,
        sms_error: smsError,
        message:
          `User created. Password-reset email ${
            emailSent ? "sent" : "FAILED"
          }${
            normalizedPhone
              ? `; SMS ${smsSent ? "sent" : "FAILED"}.`
              : "; no phone provided so no SMS was sent."
          }`,
        instructions,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err: any) {
    console.error("admin-create-user error:", err);
    return new Response(
      JSON.stringify({ error: err?.message || stack:err.stack }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
