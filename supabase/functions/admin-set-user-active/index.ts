import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Body {
  target_user_id: string;
  active: boolean;
  reason: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (status: number, payload: unknown) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { error: "Missing authorization" });

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json(401, { error: "Invalid session" });

    const body = (await req.json()) as Body;
    const { target_user_id, active, reason } = body || ({} as Body);
    if (!target_user_id || typeof active !== "boolean") {
      return json(400, { error: "target_user_id and active are required" });
    }
    if (!reason || reason.trim().length < 5) {
      return json(400, {
        error: "A reason (at least 5 characters) is required for audit.",
      });
    }
    if (target_user_id === userData.user.id) {
      return json(400, { error: "You cannot deactivate your own account." });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Caller must be admin OR admin_assistant with can_manage_users = true.
    const { data: callerRoles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    const roles = (callerRoles || []).map((r: any) => r.role);
    const isAdmin = roles.includes("admin");
    let isAssistantWithPerm = false;
    if (!isAdmin && roles.includes("admin_assistant")) {
      const { data: perm } = await admin
        .from("admin_assistant_permissions")
        .select("can_manage_users")
        .eq("user_id", userData.user.id)
        .maybeSingle();
      isAssistantWithPerm = !!perm?.can_manage_users;
    }
    if (!isAdmin && !isAssistantWithPerm) {
      return json(403, {
        error:
          "Only admins or admin assistants with the Manage Users permission can change activation status.",
      });
    }

    // Look up target role — protect other admins from being toggled by assistants.
    const { data: targetRoles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", target_user_id);
    const targetRoleList = (targetRoles || []).map((r: any) => r.role);
    if (targetRoleList.includes("admin") && !isAdmin) {
      return json(403, {
        error: "Admin assistants cannot change an admin's activation status.",
      });
    }

    const now = new Date().toISOString();
    const { error: updateErr } = await admin
      .from("profiles")
      .update({ is_active: active, updated_at: now })
      .eq("user_id", target_user_id);
    if (updateErr) return json(400, { error: updateErr.message });

    // Best-effort: block auth login when deactivated, restore when reactivated.
    try {
      await admin.auth.admin.updateUserById(target_user_id, {
        ban_duration: active ? "none" : "876000h", // ~100 years
      });
    } catch (e) {
      console.error("auth ban toggle failed:", e);
    }

    // Audit log
    await admin.from("role_audit_log").insert({
      actor_id: userData.user.id,
      target_user_id,
      action: active ? "user_activated" : "user_deactivated",
      old_role: null,
      new_role: null,
      notes: JSON.stringify({
        summary: active
          ? "Account reactivated by administrator"
          : "Account deactivated by administrator",
        actor_kind: isAdmin ? "admin" : "admin_assistant",
        target_roles: targetRoleList,
        reason,
        at: now,
      }),
    });

    return json(200, {
      success: true,
      target_user_id,
      active,
      message: `User ${active ? "activated" : "deactivated"}.`,
    });
  } catch (err: any) {
    console.error("admin-set-user-active error:", err);
    return json(500, { error: err?.message || "Unknown error" });
  }
});
