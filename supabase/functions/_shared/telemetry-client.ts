// Unified telemetry adapter. Lets edge functions target EMQX (MQTT)
// or Traccar (REST) through a single interface driven by the
// telemetry_providers table. EMQX remains the active default until
// an admin flips the toggle in the Admin dashboard.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export type TelemetryProviderName = "emqx" | "traccar";

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
  if (!data) return { name: "emqx", base_url: null, api_key_secret_name: "EMQX_API_KEY" };
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

// -------- Traccar adapter (REST). Ready for activation once TRACCAR_* secrets exist.
const traccarAdapter: TelemetryAdapter = {
  name: "traccar",
  async getDeviceState(deviceId) {
    const base = Deno.env.get("TRACCAR_BASE_URL");
    const token = Deno.env.get("TRACCAR_API_TOKEN");
    if (!base || !token) return { online: false, lastSeen: null };
    try {
      const headers = { Authorization: `Bearer ${token}`, Accept: "application/json" };
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
    const token = Deno.env.get("TRACCAR_API_TOKEN");
    if (!base || !token) return { ok: false, error: "Traccar not configured" };
    try {
      const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
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

export async function getTelemetryAdapter(): Promise<TelemetryAdapter> {
  const { name } = await fetchActiveProvider();
  return name === "traccar" ? traccarAdapter : emqxAdapter;
}

export const adapters = { emqx: emqxAdapter, traccar: traccarAdapter };
