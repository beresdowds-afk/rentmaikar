import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import {
  normalizeEvent,
  reduceState,
  runAnalytics,
  type AnalyticsRow,
} from "../_shared/orchestrator-core.ts";

/**
 * telemetry-ingest — server-side Resident Orchestrator entry point.
 *
 * Accepts one or more raw telemetry records (MQTT topic payloads, Traccar
 * positions, or already-normalised events), reduces them into canonical
 * vehicle state, derives analytics, and persists everything server-side so
 * orchestration no longer depends on a browser tab being open.
 *
 * Callers:
 *  - mqtt-ingestion-worker / other edge functions (service-role bearer)
 *  - pg_cron (x-cron-secret)
 *  - admin / IoT-support dashboards forwarding live browser MQTT frames
 */

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const service = () =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

export interface IngestResult {
  processed: number;
  skipped: number;
  analytics: number;
  vehicles: string[];
}

/** Shared pipeline used by this function and the scheduled worker. */
export async function ingestRecords(
  admin: ReturnType<typeof service>,
  records: Record<string, unknown>[],
): Promise<IngestResult> {
  const result: IngestResult = { processed: 0, skipped: 0, analytics: 0, vehicles: [] };
  if (!records.length) return result;

  const events = records
    .map((r) => normalizeEvent(r))
    .filter((e): e is NonNullable<ReturnType<typeof normalizeEvent>> => !!e);
  result.skipped = records.length - events.length;
  if (!events.length) return result;

  const ids = [...new Set(events.map((e) => e.vehicleId))];
  const { data: existing } = await admin
    .from("vehicle_telemetry_state")
    .select("*")
    .in("vehicle_id", ids);

  const stateMap = new Map<string, Record<string, unknown>>();
  (existing ?? []).forEach((row: Record<string, unknown>) =>
    stateMap.set(String(row.vehicle_id), row)
  );

  const analytics: AnalyticsRow[] = [];
  const telemetryLogs: Record<string, unknown>[] = [];

  for (const event of events) {
    const prev = stateMap.get(event.vehicleId) ?? null;
    const next = reduceState(prev as never, event);
    stateMap.set(event.vehicleId, next as unknown as Record<string, unknown>);
    analytics.push(...runAnalytics(next, event));
    telemetryLogs.push({
      vehicle_id: event.vehicleId,
      data_type: event.eventType || "telemetry",
      payload: event.payload ?? {},
      mqtt_topic: event.topic ?? null,
      received_at: event.timestamp,
    });
    result.processed += 1;
  }

  const upserts = [...stateMap.values()].filter((s) => "last_event_at" in s);
  if (upserts.length) {
    const { error } = await admin
      .from("vehicle_telemetry_state")
      .upsert(upserts as never, { onConflict: "vehicle_id" });
    if (error) console.error("[telemetry-ingest] state upsert failed", error.message);
  }

  if (telemetryLogs.length) {
    const { error } = await admin.from("mqtt_telemetry_logs").insert(telemetryLogs as never);
    if (error) console.error("[telemetry-ingest] telemetry log insert failed", error.message);
  }

  if (analytics.length) {
    const { error } = await admin.from("vehicle_analytics_events").insert(analytics as never);
    if (error) console.error("[telemetry-ingest] analytics insert failed", error.message);
    else result.analytics = analytics.length;
  }

  result.vehicles = ids;
  return result;
}

async function isTrustedCaller(req: Request): Promise<boolean> {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const cronSecret = Deno.env.get("CRON_SECRET");
  const provided = req.headers.get("x-cron-secret");
  if (cronSecret && provided && provided === cronSecret) return true;

  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return false;
  const token = auth.slice(7);
  if (serviceKey && token === serviceKey) return true;

  // Signed-in admin / active IoT support staff may forward browser MQTT frames.
  const user = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } },
  );
  const { data: { user: u } } = await user.auth.getUser();
  if (!u) return false;

  const admin = service();
  const { data: role } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", u.id)
    .in("role", ["admin", "iot_support"])
    .maybeSingle();
  if (role) return true;

  const { data: staff } = await admin
    .from("support_staff")
    .select("id")
    .eq("user_id", u.id)
    .eq("is_active", true)
    .in("support_type", ["iot_installation", "iot_maintenance"])
    .maybeSingle();
  return !!staff;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!(await isTrustedCaller(req))) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const raw = Array.isArray(body?.events)
      ? body.events
      : Array.isArray(body)
      ? body
      : body?.event
      ? [body.event]
      : [body];

    const records = raw
      .filter((r: unknown) => r && typeof r === "object")
      .slice(0, 500) as Record<string, unknown>[];

    if (!records.length) return json({ error: "No telemetry records supplied" }, 400);

    const result = await ingestRecords(service(), records);
    return json({ success: true, ...result });
  } catch (err) {
    console.error("[telemetry-ingest]", err);
    return json({ error: (err as Error).message || "Internal error" }, 500);
  }
});
