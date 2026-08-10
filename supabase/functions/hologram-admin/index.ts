// Admin-only Hologram operations: config check, list SIMs, bulk import,
// activate/suspend, usage sync, connection test and SIM→vehicle linking.
// Every state-changing action is logged to iot_audit_log for traceability.
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { hologram } from "../_shared/hologram-client.ts";

const Body = z.object({
  action: z.enum([
    "status",
    "test_connection",
    "list_sims",
    "import_sims",
    "activate_sim",
    "suspend_sim",
    "resume_sim",
    "change_plan",
    "set_data_limit",
    "sync_usage",
    "sync_one_usage",
    "link_sim",
    "unlink_sim",
    // Full dashboard embedding
    "account",
    "list_orgs",
    "list_plans",
    "list_tags",
    "list_devices",
    "get_device",
    "device_location",
    "device_data",
    "rename_device",
    "send_sms",
  ]),
  sim_id: z.string().min(1).max(64).optional(),
  sim_row_id: z.string().uuid().optional(),
  plan_id: z.number().int().positive().optional(),
  zone: z.string().min(1).max(32).optional(),
  limit_bytes: z.number().int().min(0).optional(),
  device_id_ext: z.union([z.string().min(1).max(64), z.number().int()]).optional(),
  name: z.string().min(1).max(120).optional(),
  message: z.string().min(1).max(1600).optional(),
  limit: z.number().int().min(1).max(500).optional(),
  vehicle_id: z.string().uuid().nullable().optional(),
  device_id: z.string().uuid().nullable().optional(),
});


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), {
      status: s,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return json({ error: "Unauthenticated" }, 401);

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: u, error: uErr } = await supa.auth.getUser(auth.replace("Bearer ", ""));
    if (uErr || !u?.user) return json({ error: "Unauthenticated" }, 401);
    const actor = u.user.id;
    // Authoritative role check against user_roles with the service client
    // (bypasses RLS). The has_role RPC can fail silently under some grants.
    const { data: roleRows } = await supa
      .from("user_roles")
      .select("role")
      .eq("user_id", actor)
      .in("role", ["admin", "iot_support"]);
    const allowed = (roleRows ?? []).length > 0;
    if (!allowed) return json({ error: "Admin only" }, 403);

    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const {
      action, sim_id, sim_row_id, plan_id, zone, limit_bytes,
      device_id_ext, name, message, limit, vehicle_id, device_id,
    } = parsed.data;


    const audit = async (
      row: { action: string; sim_id?: string | null; vehicle_id?: string | null; device_id?: string | null; details?: Record<string, unknown> },
    ) => {
      await supa.from("iot_audit_log").insert({
        performed_by: actor,
        action: row.action,
        sim_id: row.sim_id ?? null,
        vehicle_id: row.vehicle_id ?? null,
        device_id: row.device_id ?? null,
        details: row.details ?? {},
      } as never);
    };

    await hologram.ensureReady();

    if (!hologram.isConfigured()) {
      return json({
        ok: true,
        configured: false,
        message:
          "Hologram is not configured. Add HOLOGRAM_API_KEY and HOLOGRAM_ORG_ID secrets to enable SIM provisioning, usage sync, and lifecycle actions.",
      });
    }

    if (action === "status" || action === "test_connection") {
      const probe = await hologram.listSims(1);
      if (action === "test_connection") {
        await audit({ action: "hologram_connection_tested", details: { ok: probe.ok } });
      }
      return json({ ok: probe.ok, configured: true, probe });
    }

    if (action === "list_sims") {
      const r = await hologram.listSims(100);
      return json({ ok: r.ok, ...r });
    }

    if (action === "import_sims") {
      const r = await hologram.listSims(200);
      if (!r.ok) return json({ ok: false, ...r }, 502);
      const rows = ((r.body as { data?: unknown[] })?.data ?? []) as Array<Record<string, unknown>>;
      let imported = 0;
      for (const s of rows) {
        const providerSimId = String(s.id ?? s.sim ?? "");
        const iccid = String(s.iccid ?? s.sim ?? providerSimId);
        if (!iccid) continue;
        const payload = {
          iccid,
          provider: "hologram",
          provider_sim_id: providerSimId,
          msisdn: (s.phonenumber as string | null) ?? null,
          imsi: (s.imsi as string | null) ?? null,
          status: (s.state as string) ?? "unknown",
          plan_name: (s.plan as string | null) ?? null,
          metadata: s as never,
        };
        const { error } = await supa.from("iot_sim_cards").upsert(payload, { onConflict: "iccid" });
        if (!error) imported++;
      }
      await audit({ action: "hologram_bulk_import", details: { imported, total: rows.length } });
      return json({ ok: true, imported, total: rows.length });
    }

    if (action === "activate_sim") {
      if (!sim_id || !plan_id) return json({ error: "sim_id and plan_id required" }, 400);
      const r = await hologram.activateSim(sim_id, plan_id);
      if (r.ok) {
        const { data: row } = await supa
          .from("iot_sim_cards")
          .update({ status: "live", activated_at: new Date().toISOString(), suspended_at: null })
          .eq("provider_sim_id", sim_id)
          .select("id, vehicle_id, device_id")
          .maybeSingle();
        await audit({
          action: "hologram_sim_activated",
          sim_id: row?.id,
          vehicle_id: row?.vehicle_id,
          device_id: row?.device_id,
          details: { provider_sim_id: sim_id, plan_id },
        });
      }
      return json({ ok: r.ok, ...r });
    }

    if (action === "suspend_sim") {
      if (!sim_id) return json({ error: "sim_id required" }, 400);
      const r = await hologram.suspendSim(sim_id);
      if (r.ok) {
        const { data: row } = await supa
          .from("iot_sim_cards")
          .update({ status: "paused", suspended_at: new Date().toISOString() })
          .eq("provider_sim_id", sim_id)
          .select("id, vehicle_id, device_id")
          .maybeSingle();
        await audit({
          action: "hologram_sim_suspended",
          sim_id: row?.id,
          vehicle_id: row?.vehicle_id,
          device_id: row?.device_id,
          details: { provider_sim_id: sim_id },
        });
      }
      return json({ ok: r.ok, ...r });
    }

    if (action === "sync_one_usage") {
      if (!sim_id) return json({ error: "sim_id required" }, 400);
      const info = await hologram.getSim(sim_id);
      const usage = await hologram.getSimUsage(sim_id);
      const state = (info.ok ? (info.body as { data?: { state?: string } })?.data?.state : null) ?? null;
      const dataMb = usage.ok
        ? Number((usage.body as { data?: { usage_mb?: number } })?.data?.usage_mb ?? 0)
        : null;
      const { data: row } = await supa
        .from("iot_sim_cards")
        .update({
          status: state ?? undefined,
          data_usage_mb: dataMb ?? undefined,
          last_session_at: new Date().toISOString(),
        })
        .eq("provider_sim_id", sim_id)
        .select("id")
        .maybeSingle();
      await audit({
        action: "hologram_sim_usage_synced",
        sim_id: row?.id,
        details: { state, usage_mb: dataMb },
      });
      return json({ ok: true, state, usage_mb: dataMb });
    }

    if (action === "sync_usage") {
      const { data: sims } = await supa
        .from("iot_sim_cards")
        .select("id, provider_sim_id")
        .eq("provider", "hologram")
        .not("provider_sim_id", "is", null)
        .limit(200);
      let updated = 0;
      for (const sim of sims || []) {
        const info = await hologram.getSim(sim.provider_sim_id as string);
        if (!info.ok) continue;
        const usage = await hologram.getSimUsage(sim.provider_sim_id as string);
        const state = (info.body as { data?: { state?: string } })?.data?.state ?? null;
        const dataMb = usage.ok
          ? Number((usage.body as { data?: { usage_mb?: number } })?.data?.usage_mb ?? 0)
          : null;
        await supa
          .from("iot_sim_cards")
          .update({
            status: state ?? undefined,
            data_usage_mb: dataMb ?? undefined,
            last_session_at: new Date().toISOString(),
          })
          .eq("id", sim.id);
        updated++;
      }
      await audit({ action: "hologram_bulk_usage_sync", details: { updated } });
      return json({ ok: true, updated });
    }

    if (action === "link_sim" || action === "unlink_sim") {
      if (!sim_row_id) return json({ error: "sim_row_id required" }, 400);
      const payload = action === "unlink_sim"
        ? { vehicle_id: null, device_id: null }
        : { vehicle_id: vehicle_id ?? null, device_id: device_id ?? null };
      const { data: row, error } = await supa
        .from("iot_sim_cards")
        .update(payload)
        .eq("id", sim_row_id)
        .select("id, iccid, vehicle_id, device_id")
        .maybeSingle();
      if (error) return json({ error: error.message }, 400);
      await audit({
        action: action === "unlink_sim" ? "hologram_sim_unlinked" : "hologram_sim_linked",
        sim_id: row?.id,
        vehicle_id: row?.vehicle_id,
        device_id: row?.device_id,
        details: { iccid: row?.iccid },
      });
      return json({ ok: true, row });
    }

    /* ---------------- Read-only dashboard mirrors ---------------- */

    if (action === "account") {
      const r = await hologram.me();
      return json({ ok: r.ok, org_id: hologram.orgId(), ...r });
    }

    if (action === "list_orgs") {
      const r = await hologram.listOrganizations();
      return json({ ok: r.ok, ...r });
    }

    if (action === "list_plans") {
      const r = await hologram.listPlans();
      return json({ ok: r.ok, ...r });
    }

    if (action === "list_tags") {
      const r = await hologram.listTags();
      return json({ ok: r.ok, ...r });
    }

    if (action === "list_devices") {
      const r = await hologram.listDevices(limit ?? 100);
      return json({ ok: r.ok, ...r });
    }

    if (action === "get_device") {
      if (device_id_ext === undefined) return json({ error: "device_id_ext required" }, 400);
      const r = await hologram.getDevice(device_id_ext);
      return json({ ok: r.ok, ...r });
    }

    if (action === "device_location") {
      if (device_id_ext === undefined) return json({ error: "device_id_ext required" }, 400);
      const r = await hologram.getDeviceLocation(device_id_ext);
      return json({ ok: r.ok, ...r });
    }

    if (action === "device_data") {
      if (device_id_ext === undefined) return json({ error: "device_id_ext required" }, 400);
      const r = await hologram.getDeviceData(device_id_ext, limit ?? 25);
      return json({ ok: r.ok, ...r });
    }

    /* ---------------- Write operations ---------------- */

    if (action === "rename_device") {
      if (device_id_ext === undefined || !name) return json({ error: "device_id_ext and name required" }, 400);
      const r = await hologram.setDeviceName(device_id_ext, name);
      await audit({
        action: "hologram_device_renamed",
        details: { device_id_ext, name, ok: r.ok },
      });
      return json({ ok: r.ok, ...r });
    }

    if (action === "send_sms") {
      if (device_id_ext === undefined || !message) return json({ error: "device_id_ext and message required" }, 400);
      const r = await hologram.sendSms(Number(device_id_ext), message);
      await audit({
        action: "hologram_sms_sent",
        details: { device_id_ext, length: message.length, ok: r.ok },
      });
      return json({ ok: r.ok, ...r });
    }

    if (action === "resume_sim") {
      if (!sim_id) return json({ error: "sim_id required" }, 400);
      const r = await hologram.resumeSim(sim_id);
      if (r.ok) {
        await supa
          .from("iot_sim_cards")
          .update({ status: "live", suspended_at: null })
          .eq("provider_sim_id", sim_id);
      }
      await audit({ action: "hologram_sim_resumed", details: { provider_sim_id: sim_id, ok: r.ok } });
      return json({ ok: r.ok, ...r });
    }

    if (action === "change_plan") {
      if (!sim_id || !plan_id) return json({ error: "sim_id and plan_id required" }, 400);
      const r = await hologram.changePlan(sim_id, plan_id, zone);
      await audit({ action: "hologram_sim_plan_changed", details: { provider_sim_id: sim_id, plan_id, zone, ok: r.ok } });
      return json({ ok: r.ok, ...r });
    }

    if (action === "set_data_limit") {
      if (!sim_id || limit_bytes === undefined) return json({ error: "sim_id and limit_bytes required" }, 400);
      const r = await hologram.setDataLimit(sim_id, limit_bytes);
      if (r.ok) {
        await supa
          .from("iot_sim_cards")
          .update({ data_limit_mb: Math.round(limit_bytes / 1_000_000) })
          .eq("provider_sim_id", sim_id);
      }
      await audit({ action: "hologram_sim_data_limit_set", details: { provider_sim_id: sim_id, limit_bytes, ok: r.ok } });
      return json({ ok: r.ok, ...r });
    }

    return json({ error: "Unsupported action" }, 400);

  } catch (e) {
    console.error("hologram-admin error", e);
    return json({ error: (e as Error).message }, 500);
  }
});
