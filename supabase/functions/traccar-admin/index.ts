// Admin-only Traccar operations: config check, list, pull sync (writes to
// iot_devices + mqtt_telemetry_logs), and remote commands (engineStop /
// engineResume / custom). Falls back to safe stub responses when
// TRACCAR_* secrets are missing so the dashboard still renders.
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { traccar, type TraccarDevice, type TraccarPosition } from "../_shared/traccar-client.ts";

const Body = z.object({
  action: z.enum(["status", "list_devices", "sync", "send_command"]),
  device_id: z.number().int().positive().optional(),
  command: z.string().min(2).max(48).optional(),
  attributes: z.record(z.unknown()).optional(),
});

const KNOTS_TO_KMH = 1.852;

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
    const { data: isAdmin } = await supa.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Admin only" }, 403);

    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const { action, device_id, command, attributes } = parsed.data;

    if (!traccar.isConfigured()) {
      return json({
        ok: true,
        configured: false,
        base_url: null,
        message:
          "Traccar is not configured. Add TRACCAR_BASE_URL and either TRACCAR_TOKEN or TRACCAR_EMAIL + TRACCAR_PASSWORD.",
      });
    }

    if (action === "status") {
      const ping = await traccar.ping();
      return json({ ok: true, configured: true, base_url: traccar.baseUrl(), ping });
    }

    if (action === "list_devices") {
      const r = await traccar.listDevices();
      return json({ ok: r.ok, base_url: traccar.baseUrl(), ...r });
    }

    if (action === "sync") {
      const dr = await traccar.listDevices();
      if (!dr.ok) return json({ ok: false, step: "devices", ...dr }, 502);
      const pr = await traccar.latestPositions();
      const positions: TraccarPosition[] = pr.ok ? pr.body : [];
      const posByDevice = new Map<number, TraccarPosition>();
      for (const p of positions) posByDevice.set(p.deviceId, p);

      let upserts = 0;
      const nowIso = new Date().toISOString();
      for (const d of dr.body as TraccarDevice[]) {
        const p = posByDevice.get(d.id);
        const status = d.status === "online" ? "active" : d.status === "offline" ? "offline" : "unknown";
        const row = {
          serial_number: d.uniqueId || `traccar-${d.id}`,
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
        const { error } = await supa
          .from("iot_devices")
          .upsert(row, { onConflict: "serial_number" });
        if (!error) upserts++;

        if (p) {
          await supa.from("mqtt_telemetry_logs").insert({
            data_type: "traccar_position",
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
            },
            mqtt_topic: `traccar/${d.uniqueId}/position`,
            received_at: p.serverTime || nowIso,
          } as never);
        }
      }
      return json({
        ok: true,
        devices_synced: upserts,
        positions_received: positions.length,
      });
    }

    if (action === "send_command") {
      if (!device_id || !command) return json({ error: "device_id and command required" }, 400);
      const r = await traccar.sendCommand(device_id, command, attributes ?? {});
      return json({ ok: r.ok, ...r });
    }

    return json({ error: "Unsupported action" }, 400);
  } catch (e) {
    console.error("traccar-admin error", e);
    return json({ error: (e as Error).message }, 500);
  }
});
