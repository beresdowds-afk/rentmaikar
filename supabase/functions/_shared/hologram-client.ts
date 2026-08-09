// Hologram REST API client (https://dashboard.hologram.io/api/1)
// Auth: HTTP Basic with username `apikey` and the API key as password.
// All responses are `{ success, data | error }`. Rate limited -> HTTP 429.
// Supabase Edge Function compatible.

import { ensureProviderConfig, providerConfigSource, providerOverride } from "./provider-config.ts";

const BASE = "https://dashboard.hologram.io/api/1";

function creds() {
  const apiKey = providerOverride("hologram", "api_key") ?? Deno.env.get("HOLOGRAM_API_KEY");
  const orgId = providerOverride("hologram", "org_id") ?? Deno.env.get("HOLOGRAM_ORG_ID");
  if (!apiKey || !orgId) return null;
  return { apiKey, orgId };
}

export type HologramResult =
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; reason: "not_configured" }
  | { ok: false; reason: "provider_error" | "rate_limited"; status: number; body: unknown };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function call(
  path: string,
  init: RequestInit = {},
  attempt = 0,
): Promise<HologramResult> {
  const c = creds();
  if (!c) return { ok: false, reason: "not_configured" };

  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: "Basic " + btoa(`apikey:${c.apiKey}`),
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  const body = await response.json().catch(() => ({}));

  // Hologram asks callers to back off 5-10s on 429. Retry twice.
  if (response.status === 429 && attempt < 2) {
    await sleep(5000 + attempt * 2500);
    return call(path, init, attempt + 1);
  }

  if (!response.ok || (body as { success?: boolean })?.success === false) {
    console.error("Hologram API error", path, response.status, body);
    return {
      ok: false,
      reason: response.status === 429 ? "rate_limited" : "provider_error",
      status: response.status,
      body,
    };
  }

  return { ok: true, body: body as Record<string, unknown> };
}

function withOrg(path: string, extra: Record<string, string | number | undefined> = {}) {
  const c = creds();
  const params = new URLSearchParams();
  if (c?.orgId) params.set("orgid", c.orgId);
  for (const [k, v] of Object.entries(extra)) {
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export const hologram = {
  /** Warm admin-managed credentials before any sync getter is used. */
  async ensureReady() {
    await ensureProviderConfig("hologram");
  },

  configSource() {
    return providerConfigSource("hologram");
  },

  isConfigured() {
    return !!creds();
  },

  orgId() {
    return creds()?.orgId ?? null;
  },

  /* ---------------- Account & organizations ---------------- */

  me() {
    return call("/users/me");
  },

  listOrganizations() {
    return call("/organizations");
  },

  /* ---------------- Cellular links (SIMs) ---------------- */

  listSims(limit = 50) {
    return call(withOrg("/links/cellular", { limit }));
  },

  getSim(simId: string) {
    return call(`/links/cellular/${simId}`);
  },

  activateSim(simId: string, planId: number, zone?: string) {
    return call(`/links/cellular/${simId}/state`, {
      method: "POST",
      body: JSON.stringify({ state: "live", plan: planId, ...(zone ? { zone } : {}) }),
    });
  },

  suspendSim(simId: string) {
    return call(`/links/cellular/${simId}/state`, {
      method: "POST",
      body: JSON.stringify({ state: "pause" }),
    });
  },

  resumeSim(simId: string) {
    return call(`/links/cellular/${simId}/state`, {
      method: "POST",
      body: JSON.stringify({ state: "live" }),
    });
  },

  changePlan(simId: string, planId: number, zone?: string) {
    return call(`/links/cellular/${simId}/plan`, {
      method: "POST",
      body: JSON.stringify({ plan: planId, ...(zone ? { zone } : {}) }),
    });
  },

  getSimUsage(simId: string) {
    return call(`/links/cellular/${simId}/usage`);
  },

  /** Monthly data limit in bytes (0 = unlimited). */
  setDataLimit(simId: string, limitBytes: number) {
    return call(`/links/cellular/${simId}/threshold/data`, {
      method: "POST",
      body: JSON.stringify({ data: limitBytes }),
    });
  },

  /* ---------------- Devices ---------------- */

  listDevices(limit = 100) {
    return call(withOrg("/devices", { limit }));
  },

  getDevice(deviceId: string | number) {
    return call(`/devices/${deviceId}`);
  },

  getDeviceLocation(deviceId: string | number) {
    return call(`/devices/${deviceId}/location`);
  },

  setDeviceName(deviceId: string | number, name: string) {
    return call(`/devices/${deviceId}`, {
      method: "PUT",
      body: JSON.stringify({ name }),
    });
  },

  /** Cloud data / session records for a device. */
  getDeviceData(deviceId: string | number, limit = 25) {
    return call(withOrg("/csr/rdm", { deviceid: String(deviceId), limit }));
  },

  /* ---------------- Tags ---------------- */

  listTags() {
    return call(withOrg("/devices/tags"));
  },

  /* ---------------- Messaging ---------------- */

  /** Send an SMS to a device (cloud-to-device). */
  sendSms(deviceId: number, body: string) {
    return call("/sms/incoming", {
      method: "POST",
      body: JSON.stringify({ deviceid: deviceId, body }),
    });
  },

  /* ---------------- Billing / plans ---------------- */

  listPlans() {
    return call(withOrg("/plans"));
  },

  getBalance() {
    const c = creds();
    return call(`/organizations/${c?.orgId}/balance`);
  },
};
