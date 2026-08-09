import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireCronSecretAsync } from "../_shared/cron-auth.ts";
import { getEmqxManagementConfig, classifyManagementFailure } from "../_shared/emqx-config.ts";
import { getEmqxCredentials } from "../_shared/emqx-credentials.ts";
import { ingestRecords, logIngestRun, serviceClient } from "../_shared/telemetry-ingest-core.ts";

/**
 * mqtt-ingestion-worker — scheduled server-side MQTT ingestion.
 *
 * Runs every minute (pg_cron). Because EMQX Serverless offers no persistent
 * subscriber slot for an edge runtime, the worker pulls the latest retained
 * telemetry message per active vehicle topic through the management API and
 * feeds it into the server-side Resident Orchestrator. Every run is logged in
 * telemetry_ingest_runs, and the worker degrades gracefully (never 500s) when
 * the management API is unreachable — device telemetry paths are unaffected.
 */

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const TOPIC_SUFFIXES = ["telemetry", "location", "status"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const denied = await requireCronSecretAsync(req);
  if (denied) return denied;

  const startedAt = Date.now();
  const admin = serviceClient();

  const finish = async (row: Record<string, unknown>) => {
    await logIngestRun(admin, { ...row, duration_ms: Date.now() - startedAt });
    return json({ success: true, ...row });
  };

  try {
    const cfg = await getEmqxManagementConfig();
    const creds = await getEmqxCredentials();

    if (!cfg.managementEnabled || !creds) {
      return await finish({
        source: "mqtt_worker",
        provider: "emqx",
        broker_reachable: false,
        degraded_reason: !cfg.managementEnabled
          ? "management_api_disabled"
          : "management_api_no_credentials",
      });
    }

    const apiUrl = cfg.apiUrl.replace(/\/$/, "");
    const authB64 = btoa(`${creds.key}:${creds.secret}`);
    const emqxFetch = async (path: string) => {
      const resp = await fetch(`${apiUrl}${path}`, {
        headers: { Authorization: `Basic ${authB64}`, "Content-Type": "application/json" },
      });
      if (!resp.ok) {
        const detail = await resp.text();
        const { reason } = classifyManagementFailure(resp.status, detail);
        throw Object.assign(new Error(reason), { reason });
      }
      return resp.json();
    };

    // Vehicles we care about: linked, telemetry-enabled IoT devices.
    const { data: devices } = await admin
      .from("iot_devices")
      .select("vehicle_id")
      .not("vehicle_id", "is", null)
      .eq("telemetry_enabled", true)
      .limit(500);

    const vehicleIds = [
      ...new Set((devices ?? []).map((d: Record<string, unknown>) => String(d.vehicle_id))),
    ];

    if (!vehicleIds.length) {
      return await finish({
        source: "mqtt_worker",
        provider: "emqx",
        broker_reachable: true,
        devices_seen: 0,
        events_processed: 0,
      });
    }

    const records: Record<string, unknown>[] = [];
    let reachable = false;
    let degradedReason: string | null = null;

    for (const vehicleId of vehicleIds) {
      for (const suffix of TOPIC_SUFFIXES) {
        const topic = `rentmaikar/vehicle/${vehicleId}/${suffix}`;
        try {
          const msg = await emqxFetch(
            `/mqtt/retainer/message/${encodeURIComponent(topic)}`,
          );
          reachable = true;
          const payloadRaw = (msg as Record<string, unknown>)?.payload;
          if (payloadRaw == null) continue;
          let payload: Record<string, unknown>;
          try {
            payload = typeof payloadRaw === "string" ? JSON.parse(payloadRaw) : payloadRaw as Record<string, unknown>;
          } catch {
            payload = { raw: payloadRaw };
          }
          records.push({
            source: "mqtt",
            topic,
            vehicleId,
            eventType: suffix,
            timestamp: (msg as Record<string, unknown>)?.publish_at
              ? new Date(Number((msg as Record<string, unknown>).publish_at)).toISOString()
              : new Date().toISOString(),
            payload,
          });
        } catch (e) {
          const reason = (e as { reason?: string }).reason;
          // 404 simply means "no retained message on that topic".
          if (reason && reason !== "not_found") degradedReason = reason;
        }
      }
    }

    if (!reachable && degradedReason) {
      return await finish({
        source: "mqtt_worker",
        provider: "emqx",
        broker_reachable: false,
        devices_seen: vehicleIds.length,
        degraded_reason: degradedReason,
      });
    }

    const result = await ingestRecords(admin, records);

    return await finish({
      source: "mqtt_worker",
      provider: "emqx",
      broker_reachable: true,
      devices_seen: vehicleIds.length,
      events_processed: result.processed,
      analytics_emitted: result.analytics,
      degraded_reason: degradedReason,
    });
  } catch (err) {
    console.error("[mqtt-ingestion-worker]", err);
    return await finish({
      source: "mqtt_worker",
      provider: "emqx",
      broker_reachable: false,
      error: (err as Error).message?.slice(0, 500) ?? "unknown",
    });
  }
});
