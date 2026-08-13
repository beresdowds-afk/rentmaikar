// Admin-only Sarekon operations: connection status, device list, pull sync
// (writes to iot_devices + mqtt_telemetry_logs so the existing live map and
// telemetry feed pick the data up), remote commands via the Sarekon command
// queue, device→vehicle linking, and iot_sync_state for the ingestion monitor.
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import {
  SAREKON_COMMAND_MAP,
  missingCredentials,
  sarekon,
  type SarekonDevice,
  type SarekonResult,
} from "../_shared/sarekon-client.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { invalidateProviderConfig } from "../_shared/provider-config.ts";


const PROVIDER = "sarekon";

const Body = z.object({
  action: z.enum([
    "status",
    "test_connection",
    "list_devices",
    "sync",
    "sync_devices",
    "sync_telemetry",
    "refresh_commands",
    "sync_status",
    "send_command",
    "command_parameters",
    "command_history",
    "device_detail",
    "link_device",
    "unlink_device",
    "get_sync_state",
  ]),
  dvd_id: z.string().min(1).max(128).optional(),
  device_row_id: z.string().uuid().optional(),
  vehicle_id: z.string().uuid().nullable().optional(),
  vehicle_ids: z.array(z.string().uuid()).optional(),
  command: z.string().min(2).max(64).optional(),
  parameters: z.record(z.unknown()).optional(),
  limit: z.number().int().positive().max(200).optional(),
  refresh_credentials: z.boolean().optional(),
});

/** Scoped sync-state rows so telemetry, devices and commands report separately. */
const SCOPE_PROVIDER = {
  devices: "sarekon",
  telemetry: "sarekon_telemetry",
  commands: "sarekon_commands",
} as const;


interface Diagnosis {
  code: string;
  title: string;
  detail: string;
  hints: string[];
  status?: number;
}

function diagnose(r: SarekonResult): Diagnosis {
  if (r.ok) {
    return { code: "ok", title: "Connection successful", detail: "Sarekon session created.", hints: [] };
  }
  if (r.reason === "not_configured") {
    return {
      code: "not_configured",
      title: "Sarekon credentials are missing",
      detail: `Missing: ${(r.missing ?? []).join(", ") || "credentials"}.`,
      hints: ["Save the Sarekon user ID and password in the platform secrets, then test again."],
    };
  }
  if (r.reason === "network_error") {
    return {
      code: "network_error",
      title: "Could not reach the Sarekon API",
      detail: r.message,
      hints: ["Confirm https://api.sarekon.com/v1 is reachable and not blocked."],
    };
  }
  if (r.reason === "auth_error") {
    return {
      code: "invalid_credentials",
      title: "Sarekon rejected the credentials",
      detail: (r.body && typeof r.body === "object"
        ? String((r.body as Record<string, unknown>).description ?? "")
        : "") || `The user ID/password was refused (HTTP ${r.status}).`,
      hints: ["Re-enter the Sarekon user ID and password.", "Confirm the account is active."],
      status: r.status,
    };
  }
  return {
    code: "provider_error",
    title: `Sarekon returned HTTP ${r.status}`,
    detail: typeof r.body === "string"
      ? r.body.slice(0, 300)
      : String((r.body as Record<string, unknown> | null)?.description ?? JSON.stringify(r.body ?? {})).slice(0, 300),
    hints: ["Retry; if it persists check the Sarekon account subscription/permissions."],
    status: r.status,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    const cronSecret = Deno.env.get("CRON_SECRET") ?? "";
    const isCron = !!cronSecret && (req.headers.get("x-cron-secret") ?? "") === cronSecret;

    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    let actor: string | null = null;
    if (!isCron) {
      if (!auth.startsWith("Bearer ")) return json({ error: "Unauthenticated" }, 401);
      const { data: u, error: uErr } = await supa.auth.getUser(auth.replace("Bearer ", ""));
      if (uErr || !u?.user) return json({ error: "Unauthenticated" }, 401);
      actor = u.user.id;
      const { data: roleRows, error: roleErr } = await supa
        .from("user_roles")
        .select("role")
        .eq("user_id", actor)
        .in("role", ["admin", "iot_support"]);
      if (roleErr) return json({ error: "Role check failed" }, 500);
      if (!roleRows || roleRows.length === 0) return json({ error: "Admin only" }, 403);
    }

    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const { action, dvd_id, device_row_id, vehicle_id, vehicle_ids, command, parameters, limit, refresh_credentials } =
      parsed.data;

    // A freshly saved credential version must beat the 60s config cache.
    if (refresh_credentials) {
      invalidateProviderConfig("sarekon");
      sarekon.resetSession();
    }

    const audit = async (row: {
      action: string;
      device_id?: string | null;
      vehicle_id?: string | null;
      details?: Record<string, unknown>;
    }) => {
      await supa.from("iot_audit_log").insert({
        performed_by: actor,
        action: row.action,
        device_id: row.device_id ?? null,
        vehicle_id: row.vehicle_id ?? null,
        details: row.details ?? {},
      } as never);
    };

    const setScopeState = async (
      scope: keyof typeof SCOPE_PROVIDER,
      patch: Record<string, unknown>,
    ) => {
      await supa.from("iot_sync_state").upsert(
        { provider: SCOPE_PROVIDER[scope], ...patch, updated_at: new Date().toISOString() },
        { onConflict: "provider" },
      );
    };

    const setSyncState = async (patch: Record<string, unknown>) => setScopeState("devices", patch);

    const activity = async (
      event: string,
      level: "info" | "warn" | "error",
      message: string,
      details: Record<string, unknown> = {},
    ) => {
      await supa.from("iot_sync_activity_log").insert({
        provider: PROVIDER, event, level, message, details,
      } as never);
    };

    if (action === "get_sync_state") {
      const { data } = await supa.from("iot_sync_state").select("*").eq("provider", PROVIDER).maybeSingle();
      return json({ ok: true, state: data });
    }

    if (action === "sync_status") {
      const { data: states } = await supa
        .from("iot_sync_state")
        .select("*")
        .in("provider", Object.values(SCOPE_PROVIDER));
      const { data: events } = await supa
        .from("iot_sync_activity_log")
        .select("event, level, message, details, created_at")
        .eq("provider", PROVIDER)
        .order("created_at", { ascending: false })
        .limit(limit ?? 25);
      const { count: mapped } = await supa
        .from("iot_devices")
        .select("id", { count: "exact", head: true })
        .eq("provider", PROVIDER)
        .not("latitude", "is", null)
        .not("longitude", "is", null);
      const { count: total } = await supa
        .from("iot_devices")
        .select("id", { count: "exact", head: true })
        .eq("provider", PROVIDER);
      const byScope: Record<string, unknown> = {};
      for (const [scope, provider] of Object.entries(SCOPE_PROVIDER)) {
        byScope[scope] = (states ?? []).find((s: Record<string, unknown>) => s.provider === provider) ?? null;
      }
      return json({
        ok: true,
        scopes: byScope,
        activity: events ?? [],
        map_merge: { devices_total: total ?? 0, devices_on_map: mapped ?? 0 },
      });
    }



    if (action === "link_device" || action === "unlink_device") {
      if (!device_row_id) return json({ error: "device_row_id required" }, 400);
      const target = action === "link_device" ? vehicle_id ?? null : null;
      if (action === "link_device" && !target) return json({ error: "vehicle_id required" }, 400);
      if (target) {
        const { data: clash } = await supa
          .from("iot_devices")
          .select("id, serial_number, provider")
          .eq("vehicle_id", target)
          .neq("id", device_row_id)
          .maybeSingle();
        if (clash) {
          return json({
            ok: false,
            conflict: true,
            existing_device: clash,
            message: `Vehicle already linked to ${clash.provider} device ${clash.serial_number}. Unlink it first.`,
          });
        }
      }
      const { error } = await supa.from("iot_devices").update({ vehicle_id: target }).eq("id", device_row_id);
      if (error) return json({ ok: false, error: error.message }, 400);
      await audit({
        action: action === "link_device" ? "sarekon_device_linked" : "sarekon_device_unlinked",
        device_id: device_row_id,
        vehicle_id: target,
      });
      return json({ ok: true });
    }

    await sarekon.ensureReady();

    if (!sarekon.isConfigured()) {
      const missing = missingCredentials();
      if (action === "test_connection") {
        await activity("test_connection_failed", "warn", "Test connection: credentials missing", { missing });
      }
      return json({
        ok: true,
        configured: false,
        base_url: sarekon.baseUrl(),
        message: "Sarekon is not configured. Save the Sarekon user ID and password.",
        diagnosis: {
          code: "not_configured",
          title: "Sarekon credentials are missing",
          detail: `Missing: ${missing.join(", ") || "credentials"}.`,
          hints: ["Add SAREKON_USER_ID and SAREKON_PASSWORD in platform secrets."],
          missing,
        },
      });
    }

    if (action === "status" || action === "test_connection") {
      const started = Date.now();
      const ping = await sarekon.ping();
      const latency_ms = Date.now() - started;
      const diagnosis = diagnose(ping);
      if (action === "test_connection") {
        await audit({ action: "sarekon_connection_tested", details: { ok: ping.ok, diagnosis } });
        await activity(
          ping.ok ? "test_connection_ok" : "test_connection_failed",
          ping.ok ? "info" : "error",
          ping.ok ? `Authenticated with Sarekon in ${latency_ms}ms` : `${diagnosis.title} — ${diagnosis.detail}`,
          { diagnosis, base_url: sarekon.baseUrl() },
        );
      }
      return json({ ok: true, configured: true, base_url: sarekon.baseUrl(), latency_ms, authenticated: ping.ok, diagnosis });
    }

    if (action === "list_devices") {
      const r = await sarekon.listDevices();
      return json({ ok: r.ok, base_url: sarekon.baseUrl(), diagnosis: diagnose(r), devices: r.ok ? r.body : [] });
    }

    if (action === "device_detail") {
      if (!dvd_id) return json({ error: "dvd_id required" }, 400);
      const [detail, locations, trips, messages, commands] = await Promise.all([
        sarekon.showDevice(dvd_id),
        sarekon.locations(dvd_id, limit ?? 25),
        sarekon.trips(dvd_id, limit ?? 25),
        sarekon.messages(dvd_id, limit ?? 25),
        sarekon.commandHistory(dvd_id, limit ?? 25),
      ]);
      return json({
        ok: true,
        device: detail.ok ? detail.body : null,
        locations: locations.ok ? locations.body : [],
        trips: trips.ok ? trips.body : [],
        messages: messages.ok ? messages.body : [],
        commands: commands.ok ? commands.body : [],
      });
    }

    if (action === "command_parameters") {
      const r = await sarekon.commandParameters();
      return json({ ok: r.ok, parameters: r.ok ? r.body : [], diagnosis: diagnose(r) });
    }

    if (action === "command_history" || action === "refresh_commands") {
      const startedMs = Date.now();
      const nowIso = new Date().toISOString();
      const r = await sarekon.commandHistory(dvd_id, limit ?? 50);
      const dg = diagnose(r);
      if (action === "refresh_commands") {
        await setScopeState("commands", {
          last_sync_at: nowIso,
          state: r.ok ? "ok" : "error",
          ...(r.ok
            ? { last_success_at: nowIso, devices_synced: (r.body as unknown[]).length, last_error: null, last_error_at: null }
            : { last_error: `${dg.title}: ${dg.detail}`, last_error_at: nowIso }),
        });
        await activity(
          r.ok ? "command_queue_refreshed" : "command_queue_refresh_failed",
          r.ok ? "info" : "error",
          r.ok
            ? `Command queue refreshed (${(r.body as unknown[]).length} entries) in ${Date.now() - startedMs}ms`
            : `${dg.title} — ${dg.detail}`,
          { dvd_id: dvd_id ?? null, diagnosis: dg },
        );
      }
      return json({ ok: r.ok, commands: r.ok ? r.body : [], diagnosis: dg });
    }


    if (action === "send_command") {
      if (!dvd_id || !command) return json({ error: "dvd_id and command are required" }, 400);
      if (actor) {
        const rl = await checkRateLimit(actor, "sarekon-admin:send_command", 20);
        if (!rl.allowed) {
          return json({ ok: false, error: "rate_limited", retry_after_seconds: rl.retry_after_seconds }, 429);
        }
      }
      const mapped = SAREKON_COMMAND_MAP[command] ?? command;
      const r = await sarekon.sendCommand(dvd_id, mapped, parameters ?? {});
      await audit({
        action: `sarekon_command_${command}`,
        vehicle_id: vehicle_id ?? null,
        details: { dvd_id, command, mapped, parameters: parameters ?? {}, ok: r.ok },
      });
      await activity(
        r.ok ? "command_sent" : "command_failed",
        r.ok ? "info" : "error",
        `${mapped} → ${dvd_id}${r.ok ? " queued" : " failed"}`,
        { dvd_id, command: mapped, diagnosis: diagnose(r) },
      );
      return json({ ok: r.ok, provider: PROVIDER, diagnosis: diagnose(r), response: r.ok ? r.body : undefined });
    }

    if (action === "sync" || action === "sync_devices" || action === "sync_telemetry") {
      // devices  -> registry/asset metadata only (no telemetry rows written)
      // telemetry-> registry positions + mqtt_telemetry_logs feed
      const writeTelemetry = action !== "sync_devices";
      const scopeLabel = action === "sync_devices" ? "device" : action === "sync_telemetry" ? "telemetry" : "full";
      const startedMs = Date.now();
      const nowIso = new Date().toISOString();
      await setSyncState({ state: "running", last_sync_at: nowIso });
      if (writeTelemetry) await setScopeState("telemetry", { state: "running", last_sync_at: nowIso });
      await activity("sync_started", "info", `Sarekon ${scopeLabel} sync started`, {
        triggered_by: isCron ? "schedule" : "admin",
        scope: scopeLabel,
      });

      const dr = await sarekon.listDevices();
      if (!dr.ok) {
        const dg = diagnose(dr);
        await setSyncState({ state: "error", last_error_at: nowIso, last_error: `${dg.title}: ${dg.detail}` });
        if (writeTelemetry) {
          await setScopeState("telemetry", { state: "error", last_error_at: nowIso, last_error: `${dg.title}: ${dg.detail}` });
        }
        await activity("device_fetch_failed", "error", `${dg.title} — ${dg.detail}`, { diagnosis: dg });
        return json({ ok: false, step: "devices", diagnosis: dg }, 502);
      }


      const vehicleFilter = vehicle_ids && vehicle_ids.length ? new Set(vehicle_ids) : null;
      const deviceErrors: Array<{ device: string; error: string }> = [];
      let upserts = 0;
      let inserts = 0;
      let skippedByFilter = 0;

      for (const d of dr.body as SarekonDevice[]) {
        const serial = d.serial || d.id;
        if (!serial) continue;

        const { data: existing } = await supa
          .from("iot_devices")
          .select("id, vehicle_id")
          .eq("serial_number", serial)
          .maybeSingle();

        if (vehicleFilter && (!existing?.vehicle_id || !vehicleFilter.has(existing.vehicle_id))) {
          skippedByFilter++;
          continue;
        }

        const status = d.status
          ? (/online|active|connected/i.test(d.status) ? "active" : /offline|disconnected/i.test(d.status) ? "offline" : "unknown")
          : "unknown";

        const row = {
          serial_number: serial,
          provider: PROVIDER,
          device_model: d.model,
          status,
          last_ping: d.lastUpdate ?? nowIso,
          latitude: d.latitude,
          longitude: d.longitude,
          health_details: {
            sarekon_dvd_id: d.id,
            name: d.name,
            last_position: (d.latitude !== null && d.longitude !== null)
              ? { speed_kmh: d.speedKmh ?? 0, course: d.course ?? 0, address: d.address, ignition: d.ignition }
              : null,
            raw: d.raw,
          },
        };

        const { data: upserted, error } = await supa
          .from("iot_devices")
          .upsert(row, { onConflict: "serial_number" })
          .select("id, vehicle_id")
          .maybeSingle();
        if (error) {
          deviceErrors.push({ device: serial, error: error.message });
          continue;
        }
        upserts++;

        const linkedVehicleId = upserted?.vehicle_id ?? existing?.vehicle_id ?? null;

        if (writeTelemetry && d.latitude !== null && d.longitude !== null) {
          const { error: telErr } = await supa.from("mqtt_telemetry_logs").insert({
            data_type: "sarekon_position",
            vehicle_id: linkedVehicleId ?? serial,
            payload: {
              lat: d.latitude,
              lng: d.longitude,
              speed_kmh: d.speedKmh ?? 0,
              course: d.course ?? 0,
              ignition: d.ignition,
              address: d.address,
              iot_device_id: upserted?.id ?? existing?.id ?? null,
              linked_vehicle_id: linkedVehicleId,
              device_time: d.lastUpdate,
            },
            mqtt_topic: `sarekon/${serial}/position`,
            received_at: d.lastUpdate ?? nowIso,
          } as never);
          if (telErr) deviceErrors.push({ device: serial, error: `position: ${telErr.message}` });
          else inserts++;
        }
      }

      const hasErrors = deviceErrors.length > 0;
      await setSyncState({
        state: hasErrors ? "degraded" : "ok",
        last_success_at: nowIso,
        devices_synced: upserts,
        positions_imported: inserts,
        last_error: hasErrors ? deviceErrors[0].error : null,
        last_error_at: hasErrors ? nowIso : null,
      });
      if (writeTelemetry) {
        await setScopeState("telemetry", {
          state: hasErrors ? "degraded" : "ok",
          last_success_at: nowIso,
          devices_synced: upserts,
          positions_imported: inserts,
          last_error: hasErrors ? deviceErrors[0].error : null,
          last_error_at: hasErrors ? nowIso : null,
        });
      }
      for (const de of deviceErrors.slice(0, 25)) {
        await activity("device_sync_error", "error", `${de.device}: ${de.error}`, de);
      }
      await activity(
        "sync_completed",
        hasErrors ? "warn" : "info",
        `${scopeLabel} sync: ${upserts} device(s), ${inserts} position(s) in ${Date.now() - startedMs}ms` +
          (hasErrors ? ` — ${deviceErrors.length} error(s)` : ""),
        { scope: scopeLabel, devices_synced: upserts, positions_imported: inserts, skipped_by_vehicle_filter: skippedByFilter },
      );

      // Map-merge safeguard: positions only ever land on iot_devices, which the
      // single existing fleet map reads — never a separate provider map/table.
      const { count: onMap } = await supa
        .from("iot_devices")
        .select("id", { count: "exact", head: true })
        .eq("provider", PROVIDER)
        .not("latitude", "is", null)
        .not("longitude", "is", null);

      return json({
        ok: true,
        scope: scopeLabel,
        devices_synced: upserts,
        positions_imported: inserts,
        devices_on_shared_map: onMap ?? 0,
        skipped_by_vehicle_filter: skippedByFilter,
        device_errors: deviceErrors.slice(0, 25),
      });

    }

    return json({ error: "Unsupported action" }, 400);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
