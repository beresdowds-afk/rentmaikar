// Admin-only Traccar operations: config check, list, pull sync (writes to
// iot_devices + mqtt_telemetry_logs enriched with vehicle_id), remote
// commands (engineStop/engineResume/custom), device→vehicle linking, and
// a persistent iot_sync_state row for the ingestion monitor. All lifecycle
// commands are logged to iot_audit_log.
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { traccar, type TraccarDevice, type TraccarPosition } from "../_shared/traccar-client.ts";

const Body = z.object({
  action: z.enum([
    "status",
    "test_connection",
    "list_devices",
    "sync",
    "send_command",
    "link_device",
    "unlink_device",
    "get_sync_state",
  ]),
  device_id: z.number().int().positive().optional(),
  device_row_id: z.string().uuid().optional(),
  vehicle_id: z.string().uuid().nullable().optional(),
  command: z.string().min(2).max(48).optional(),
  attributes: z.record(z.unknown()).optional(),
});

const KNOTS_TO_KMH = 1.852;
const PROVIDER = "traccar";

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
    const { data: isAdmin } = await supa.rpc("has_role", { _user_id: actor, _role: "admin" });
    if (!isAdmin) return json({ error: "Admin only" }, 403);

    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const { action, device_id, device_row_id, vehicle_id, command, attributes } = parsed.data;

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

    const setSyncState = async (patch: Record<string, unknown>) => {
      await supa.from("iot_sync_state").upsert(
        { provider: PROVIDER, ...patch, updated_at: new Date().toISOString() },
        { onConflict: "provider" },
      );
    };

    if (action === "get_sync_state") {
      const { data } = await supa
        .from("iot_sync_state").select("*").eq("provider", PROVIDER).maybeSingle();
      return json({ ok: true, state: data });
    }

    if (!traccar.isConfigured()) {
      return json({
        ok: true,
        configured: false,
        base_url: null,
        message:
          "Traccar is not configured. Add TRACCAR_BASE_URL and either TRACCAR_TOKEN or TRACCAR_EMAIL + TRACCAR_PASSWORD.",
      });
    }

    if (action === "status" || action === "test_connection") {
      const ping = await traccar.ping();
      if (action === "test_connection") {
        await audit({ action: "traccar_connection_tested", details: { ok: ping.ok } });
      }
      return json({ ok: true, configured: true, base_url: traccar.baseUrl(), ping });
    }

    if (action === "list_devices") {
      const r = await traccar.listDevices();
      return json({ ok: r.ok, base_url: traccar.baseUrl(), ...r });
    }

    if (action === "sync") {
      await setSyncState({ state: "running", last_sync_at: new Date().toISOString() });
      const dr = await traccar.listDevices();
      if (!dr.ok) {
        await setSyncState({
          state: "error",
          last_error_at: new Date().toISOString(),
          last_error: JSON.stringify(dr),
        });
        return json({ ok: false, step: "devices", ...dr }, 502);
      }
      const pr = await traccar.latestPositions();
      const positions: TraccarPosition[] = pr.ok ? pr.body : [];
      const posByDevice = new Map<number, TraccarPosition>();
      for (const p of positions) posByDevice.set(p.deviceId, p);

      let upserts = 0;
      let inserts = 0;
      const nowIso = new Date().toISOString();
      for (const d of dr.body as TraccarDevice[]) {
        const p = posByDevice.get(d.id);
        const status = d.status === "online" ? "active" : d.status === "offline" ? "offline" : "unknown";
        const serial = d.uniqueId || `traccar-${d.id}`;

        // Preserve any existing vehicle_id / device row when upserting
        const { data: existing } = await supa
          .from("iot_devices")
          .select("id, vehicle_id")
          .eq("serial_number", serial)
          .maybeSingle();

        const row = {
          serial_number: serial,
          provider: "traccar",
          device_model: d.model ?? null,
          status,
          last_ping: d.lastUpdate ?? nowIso,
          telemetry_enabled: !d.disabled,
          latitude: p?.latitude ?? null,
          longitude: p?.longitude ?? null,
          health_details: {
            traccar_device_id: d.id,
            positionId: d.positionId,
            phone: d.phone,
            contact: d.contact,
            attributes: d.attributes ?? {},
            last_position: p
              ? { speed_kmh: (p.speed || 0) * KNOTS_TO_KMH, course: p.course, address: p.address }
              : null,
          },
        };
        const { data: upserted, error } = await supa
          .from("iot_devices")
          .upsert(row, { onConflict: "serial_number" })
          .select("id, vehicle_id")
          .maybeSingle();
        if (!error) upserts++;

        const linkedVehicleId = upserted?.vehicle_id ?? existing?.vehicle_id ?? null;

        if (p) {
          const { error: telErr } = await supa.from("mqtt_telemetry_logs").insert({
            data_type: "traccar_position",
            vehicle_id: linkedVehicleId ?? serial,
            payload: {
              lat: p.latitude,
              lng: p.longitude,
              speed_kmh: (p.speed || 0) * KNOTS_TO_KMH,
              course: p.course,
              valid: p.valid,
              address: p.address,
              attributes: p.attributes,
              device_time: p.deviceTime,
              fix_time: p.fixTime,
              iot_device_id: upserted?.id ?? existing?.id ?? null,
              linked_vehicle_id: linkedVehicleId,
            },
            mqtt_topic: `traccar/${serial}/position`,
            received_at: p.serverTime || nowIso,
          } as never);
          if (!telErr) inserts++;
        }
      }
      await setSyncState({
        state: "ok",
        last_success_at: nowIso,
        devices_synced: upserts,
        positions_imported: inserts,
        last_error: null,
      });
      return json({
        ok: true,
        devices_synced: upserts,
        positions_received: positions.length,
        positions_imported: inserts,
      });
    }

    if (action === "send_command") {
      if (!device_id || !command) return json({ error: "device_id and command required" }, 400);
      const r = await traccar.sendCommand(device_id, command, attributes ?? {});
      // Try to resolve the local iot_devices row/vehicle from health_details.traccar_device_id
      const { data: match } = await supa
        .from("iot_devices")
        .select("id, vehicle_id, serial_number, health_details")
        .eq("provider", "traccar")
        .contains("health_details", { traccar_device_id: device_id } as never)
        .maybeSingle();
      await audit({
        action: `traccar_command_${command}`,
        device_id: match?.id ?? null,
        vehicle_id: match?.vehicle_id ?? null,
        details: {
          ok: r.ok,
          traccar_device_id: device_id,
          command,
          attributes: attributes ?? {},
          serial_number: match?.serial_number ?? null,
          response: r,
        },
      });
      return json({ ok: r.ok, ...r });
    }

    if (action === "link_device" || action === "unlink_device") {
      if (!device_row_id) return json({ error: "device_row_id required" }, 400);
      const payload = action === "unlink_device"
        ? { vehicle_id: null, is_linked: false }
        : { vehicle_id: vehicle_id ?? null, is_linked: !!vehicle_id };
      const { data: row, error } = await supa
        .from("iot_devices")
        .update(payload)
        .eq("id", device_row_id)
        .select("id, serial_number, vehicle_id")
        .maybeSingle();
      if (error) return json({ error: error.message }, 400);
      await audit({
        action: action === "unlink_device" ? "traccar_device_unlinked" : "traccar_device_linked",
        device_id: row?.id ?? null,
        vehicle_id: row?.vehicle_id ?? null,
        details: { serial_number: row?.serial_number },
      });
      return json({ ok: true, row });
    }

    return json({ error: "Unsupported action" }, 400);
  } catch (e) {
    console.error("traccar-admin error", e);
    await createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    ).from("iot_sync_state").upsert(
      {
        provider: PROVIDER,
        state: "error",
        last_error_at: new Date().toISOString(),
        last_error: (e as Error).message,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "provider" },
    );
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
