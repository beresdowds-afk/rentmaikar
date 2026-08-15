// Unified telemetry adapter. Lets edge functions target EMQX (MQTT)
// or Traccar (REST) through a single interface driven by the
// telemetry_providers table. EMQX remains the active default until
// an admin flips the toggle in the Admin dashboard.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SAREKON_COMMAND_MAP, sarekon } from "./sarekon-client.ts";
import { traccar } from "./traccar-client.ts";
import { classifyManagementFailure, getEmqxManagementConfig } from "./emqx-config.ts";
import { getEmqxCredentials } from "./emqx-credentials.ts";

export type TelemetryProviderName = "emqx" | "traccar" | "sarekon";

export interface DeviceState {
  online: boolean;
  lastSeen: string | null;
  latitude?: number | null;
  longitude?: number | null;
  speed?: number | null;
  ignition?: boolean | null;
  raw?: unknown;
}

export interface TelemetryAdapter {
  name: TelemetryProviderName;
  getDeviceState(deviceId: string): Promise<DeviceState>;
  sendCommand(deviceId: string, command: string, payload?: Record<string, unknown>): Promise<{ ok: boolean; error?: string }>;
}

function supa() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

async function fetchActiveProvider(): Promise<{ name: TelemetryProviderName; base_url: string | null; api_key_secret_name: string | null }> {
  const { data } = await supa()
    .from("telemetry_providers")
    .select("name, base_url, api_key_secret_name")
    .eq("is_active", true)
    .order("priority", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!data) return { name: "traccar", base_url: null, api_key_secret_name: "TRACCAR_API_TOKEN" };
  return data as { name: TelemetryProviderName; base_url: string | null; api_key_secret_name: string | null };
}

// -------- EMQX adapter (thin — existing functions still call EMQX directly)
const emqxAdapter: TelemetryAdapter = {
  name: "emqx",
  async getDeviceState(deviceId) {
    const url = Deno.env.get("EMQX_API_URL");
    const key = Deno.env.get("EMQX_API_KEY");
    const secret = Deno.env.get("EMQX_API_SECRET");
    if (!url || !key || !secret) return { online: false, lastSeen: null };
    try {
      const auth = "Basic " + btoa(`${key}:${secret}`);
      const res = await fetch(`${url}/clients/${encodeURIComponent(deviceId)}`, { headers: { Authorization: auth } });
      if (!res.ok) return { online: false, lastSeen: null };
      const body = await res.json();
      return { online: Boolean(body?.connected), lastSeen: body?.connected_at ?? null, raw: body };
    } catch {
      return { online: false, lastSeen: null };
    }
  },
  async sendCommand(deviceId, command, payload = {}) {
    const url = Deno.env.get("EMQX_API_URL");
    const key = Deno.env.get("EMQX_API_KEY");
    const secret = Deno.env.get("EMQX_API_SECRET");
    if (!url || !key || !secret) return { ok: false, error: "EMQX not configured" };
    const auth = "Basic " + btoa(`${key}:${secret}`);
    const topic = `rentmaikar/vehicle/${deviceId}/command`;
    const res = await fetch(`${url}/publish`, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ topic, payload: JSON.stringify({ command, ...payload }), qos: 1 }),
    });
    return { ok: res.ok, error: res.ok ? undefined : `EMQX ${res.status}` };
  },
};

// -------- Traccar adapter (REST). Uses TRACCAR_API_TOKEN/TRACCAR_TOKEN when set,
// otherwise falls back to basic auth with TRACCAR_EMAIL + TRACCAR_PASSWORD.
function traccarAuth(): string | null {
  const token = Deno.env.get("TRACCAR_API_TOKEN") || Deno.env.get("TRACCAR_TOKEN");
  if (token) return `Bearer ${token}`;
  const email = Deno.env.get("TRACCAR_EMAIL");
  const password = Deno.env.get("TRACCAR_PASSWORD");
  if (email && password) return "Basic " + btoa(`${email}:${password}`);
  return null;
}

const traccarAdapter: TelemetryAdapter = {
  name: "traccar",
  async getDeviceState(deviceId) {
    const base = Deno.env.get("TRACCAR_BASE_URL");
    const auth = traccarAuth();
    if (!base || !auth) return { online: false, lastSeen: null };

    try {
      const headers = { Authorization: auth, Accept: "application/json" };
      const devRes = await fetch(`${base}/api/devices?uniqueId=${encodeURIComponent(deviceId)}`, { headers });
      if (!devRes.ok) return { online: false, lastSeen: null };
      const devs = await devRes.json();
      const dev = Array.isArray(devs) ? devs[0] : null;
      if (!dev) return { online: false, lastSeen: null };
      const posRes = await fetch(`${base}/api/positions?deviceId=${dev.id}`, { headers });
      const positions = posRes.ok ? await posRes.json() : [];
      const p = Array.isArray(positions) ? positions[0] : null;
      return {
        online: dev.status === "online",
        lastSeen: dev.lastUpdate ?? null,
        latitude: p?.latitude ?? null,
        longitude: p?.longitude ?? null,
        speed: p?.speed ?? null,
        ignition: p?.attributes?.ignition ?? null,
        raw: { device: dev, position: p },
      };
    } catch {
      return { online: false, lastSeen: null };
    }
  },
  async sendCommand(deviceId, command, payload = {}) {
    const base = Deno.env.get("TRACCAR_BASE_URL");
    const auth = traccarAuth();
    if (!base || !auth) return { ok: false, error: "Traccar not configured" };
    try {
      const headers = { Authorization: auth, "Content-Type": "application/json" };

      const devRes = await fetch(`${base}/api/devices?uniqueId=${encodeURIComponent(deviceId)}`, { headers });
      const devs = devRes.ok ? await devRes.json() : [];
      const dev = Array.isArray(devs) ? devs[0] : null;
      if (!dev) return { ok: false, error: "device not found" };
      const map: Record<string, string> = { immobilize: "engineStop", mobilize: "engineResume" };
      const type = map[command] ?? "custom";
      const res = await fetch(`${base}/api/commands/send`, {
        method: "POST", headers,
        body: JSON.stringify({ deviceId: dev.id, type, attributes: payload }),
      });
      return { ok: res.ok, error: res.ok ? undefined : `Traccar ${res.status}` };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  },
};

/** Traccar is the platform default; EMQX is the automatic fallback. */
export const DEFAULT_PROVIDER: TelemetryProviderName = "traccar";
export const FALLBACK_PROVIDER: TelemetryProviderName = "emqx";

export async function getTelemetryAdapter(): Promise<TelemetryAdapter> {
  const name = await getActiveProviderName();
  return adapters[name];
}

/**
 * Resolves the provider to use right now: the admin-selected/default provider
 * when its secrets are present, otherwise the fallback provider.
 */
export async function getActiveProviderName(): Promise<TelemetryProviderName> {
  const { name } = await fetchActiveProvider();
  const primary: TelemetryProviderName =
    name === "emqx" || name === "sarekon" || name === "traccar" ? name : DEFAULT_PROVIDER;
  if (isProviderConfigured(primary)) return primary;
  for (const candidate of ["traccar", "sarekon", "emqx"] as TelemetryProviderName[]) {
    if (candidate !== primary && isProviderConfigured(candidate)) return candidate;
  }
  return primary;
}

/** Send a command through the active provider, retrying on the other provider on failure. */
export async function sendCommandWithFallback(
  deviceId: string,
  command: string,
  payload: Record<string, unknown> = {},
): Promise<{ ok: boolean; provider: TelemetryProviderName; error?: string; fell_back?: boolean }> {
  const primary = await getActiveProviderName();
  const first = await adapters[primary].sendCommand(deviceId, command, payload);
  if (first.ok) return { ...first, provider: primary };
  const order: TelemetryProviderName[] = ["traccar", "sarekon", "emqx"];
  for (const other of order) {
    if (other === primary || !isProviderConfigured(other)) continue;
    const next = await adapters[other].sendCommand(deviceId, command, payload);
    if (next.ok) return { ...next, provider: other, fell_back: true };
  }
  return { ...first, provider: primary };
}

export function isProviderConfigured(name: TelemetryProviderName): boolean {
  if (name === "traccar") {
    return Boolean(
      (Deno.env.get("TRACCAR_BASE_URL") &&
        (Deno.env.get("TRACCAR_API_TOKEN") ||
          Deno.env.get("TRACCAR_TOKEN") ||
          (Deno.env.get("TRACCAR_EMAIL") && Deno.env.get("TRACCAR_PASSWORD")))) ||
        traccar.isConfigured(),
    );
  }
  if (name === "sarekon") {
    return Boolean((Deno.env.get("SAREKON_USER_ID") && Deno.env.get("SAREKON_PASSWORD")) || sarekon.isConfigured());
  }
  return Boolean(Deno.env.get("EMQX_API_URL") && Deno.env.get("EMQX_API_KEY") && Deno.env.get("EMQX_API_SECRET"));
}

/**
 * Live reachability probe. Uses the same admin-managed credential resolution as
 * the dedicated provider dashboards (vault / platform_kv_settings, then env) and
 * endpoints that exist on every plan, so a healthy provider is never reported as
 * unreachable just because a probe path (e.g. EMQX `/nodes`) is plan-restricted.
 */
export async function testProvider(
  name: TelemetryProviderName,
): Promise<{ ok: boolean; configured: boolean; status?: number; error?: string }> {
  try {
    if (name === "traccar") {
      await traccar.ensureReady();
      if (!traccar.isConfigured()) return { ok: false, configured: false, error: "Traccar credentials missing" };
      const r = await traccar.ping();
      if (r.ok) return { ok: true, configured: true, status: 200 };
      const err = r as { reason?: string; status?: number; message?: string; body?: unknown };
      return {
        ok: false,
        configured: true,
        status: err.status,
        error: `${err.reason ?? "request_failed"}${err.message ? `: ${err.message}` : ""}${
          err.body ? `: ${String(typeof err.body === "string" ? err.body : JSON.stringify(err.body)).slice(0, 200)}` : ""
        }`,
      };
    }

    if (name === "sarekon") {
      await sarekon.ensureReady();
      if (!sarekon.isConfigured()) return { ok: false, configured: false, error: "GPSANDTRACK credentials missing" };
      const r = await sarekon.ping();
      if (r.ok) return { ok: true, configured: true, status: 200 };
      const err = r as { reason?: string; status?: number; message?: string; body?: unknown };
      return {
        ok: false,
        configured: true,
        status: err.status,
        error: `${err.reason ?? "request_failed"}${err.message ? `: ${err.message}` : ""}${
          err.body ? `: ${String(typeof err.body === "string" ? err.body : JSON.stringify(err.body)).slice(0, 200)}` : ""
        }`,
      };
    }

    // EMQX: admin-configured management endpoint + vault/env credentials.
    const cfg = await getEmqxManagementConfig();
    const creds = await getEmqxCredentials();
    if (!creds) return { ok: false, configured: false, error: "EMQX credentials missing" };
    if (!cfg.managementEnabled) {
      return { ok: false, configured: true, error: "EMQX management API disabled for this deployment" };
    }
    const apiUrl = cfg.apiUrl.replace(/\/$/, "");
    const auth = "Basic " + btoa(`${creds.key}:${creds.secret}`);
    // `/clients` is allowed on every plan (serverless forbids `/nodes` and `/stats`).
    const res = await fetch(`${apiUrl}/clients?limit=1`, {
      headers: { Authorization: auth, Accept: "application/json" },
    });
    if (res.ok) return { ok: true, configured: true, status: res.status };
    const detail = (await res.text().catch(() => "")).slice(0, 200);
    const { reason } = classifyManagementFailure(res.status, detail);
    return { ok: false, configured: true, status: res.status, error: `${reason}${detail ? `: ${detail}` : ""}` };
  } catch (e) {

    return { ok: false, configured: true, error: String(e) };
  }
}

// -------- GPSANDTRACK adapter (REST, session auth)
const sarekonAdapter: TelemetryAdapter = {
  name: "sarekon",
  async getDeviceState(deviceId) {
    await sarekon.ensureReady();
    if (!sarekon.isConfigured()) return { online: false, lastSeen: null };
    const r = await sarekon.showDevice(deviceId);
    if (!r.ok || !r.body) return { online: false, lastSeen: null };
    const d = r.body;
    const stale = d.lastUpdate ? Date.now() - new Date(d.lastUpdate).getTime() > 30 * 60_000 : true;
    return {
      online: (d.status ? /online|active|connected/i.test(d.status) : false) || !stale,
      lastSeen: d.lastUpdate,
      latitude: d.latitude,
      longitude: d.longitude,
      speed: d.speedKmh,
      ignition: d.ignition,
      raw: d.raw,
    };
  },
  async sendCommand(deviceId, command, payload = {}) {
    await sarekon.ensureReady();
    if (!sarekon.isConfigured()) return { ok: false, error: "GPSANDTRACK not configured" };
    const mapped = SAREKON_COMMAND_MAP[command] ?? command;
    const r = await sarekon.sendCommand(deviceId, mapped, payload);
    if (r.ok) return { ok: true };
    const err = r.reason === "provider_error" || r.reason === "auth_error"
      ? `GPSANDTRACK ${r.status}`
      : r.reason === "network_error"
      ? r.message
      : "GPSANDTRACK not configured";
    return { ok: false, error: err };
  },
};

export const adapters = { emqx: emqxAdapter, traccar: traccarAdapter, sarekon: sarekonAdapter };
