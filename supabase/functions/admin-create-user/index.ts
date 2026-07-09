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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // ── Auth: verify caller is an admin ───────────────
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
    const { data: isAdminData } = await admin.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdminData) {
      return new Response(JSON.stringify({ error: "Admins only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Input ─────────────────────────────────────────
    const body = (await req.json()) as CreateUserBody;
    const { email, full_name, role, phone } = body;
    if (!email || !full_name || !role) {
      return new Response(
        JSON.stringify({ error: "email, full_name and role are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ── Create auth user (email confirmed, random temp password) ──
    const tempPassword = generateTempPassword();
    const { data: created, error: createErr } =
      await admin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        phone: phone || undefined,
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

    // ── Assign role ───────────────────────────────────
    const { error: roleErr } = await admin
      .from("user_roles")
      .insert({ user_id: newUserId, role });
    if (roleErr) console.error("role insert failed:", roleErr);

    // ── Ensure profile is enabled platform-wide + phone stored ──
    await admin
      .from("profiles")
      .update({
        is_active: true,
        full_name,
        phone: phone || null,
      })
      .eq("user_id", newUserId);

    // ── Log admin audit ──────────────────────────────
    await admin.from("role_audit_log").insert({
      actor_id: userData.user.id,
      target_user_id: newUserId,
      action: "created",
      new_role: role,
      notes: `Created by administrator with pending password reset (email: ${email})`,
    });

    // ── Generate password recovery link (used in the email) ──
    const siteUrl =
      req.headers.get("origin") ||
      Deno.env.get("SITE_URL") ||
      "https://rentmaikar.com";
    const { data: linkData } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${siteUrl}/reset-password` },
    });
    const resetLink = linkData?.properties?.action_link || `${siteUrl}/auth`;

    // ── Fire the standard reset-password email via Supabase ──
    // Ensures the user gets the actual "forgot password" flow email.
    await admin.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/reset-password`,
    });

    // ── Send welcome email (best-effort) ─────────────
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

    // ── Send SMS (best-effort, only if phone provided) ──
    if (phone) {
      try {
        await admin.functions.invoke("send-sms-notification", {
          body: {
            phone,
            channel: "sms",
            notificationType: "general",
            name: full_name,
            customMessage: `Welcome to Rentmaikar, ${full_name}! Your ${role.replace(
              "_",
              " ",
            )} account was created by an administrator. Please sign in at ${siteUrl}/auth as soon as possible and use "Forgot password" to set your own password.`,
          },
        });
      } catch (e) {
        console.error("welcome SMS failed:", e);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: newUserId,
        message:
          "User created. A password-reset email has been sent" +
          (phone ? " and an SMS notification dispatched." : "."),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err: any) {
    console.error("admin-create-user error:", err);
    return new Response(
      JSON.stringify({ error: err?.message || "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
