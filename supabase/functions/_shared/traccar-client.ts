// Traccar API client — reads TRACCAR_BASE_URL and either TRACCAR_TOKEN
// (session bearer / API token) OR TRACCAR_EMAIL + TRACCAR_PASSWORD.
// Returns { ok: false, reason: "not_configured" } until secrets are set,
// so the rest of the app keeps working.
//
// Docs: https://www.traccar.org/api-reference/

import { ensureProviderConfig, providerConfigSource, providerOverride } from "./provider-config.ts";

type OkResult<T = unknown> = { ok: true; body: T };
type ErrResult =
  | { ok: false; reason: "not_configured"; missing?: string[] }
  | { ok: false; reason: "network_error"; message: string }
  | { ok: false; reason: "provider_error"; status: number; body: unknown; auth_mode?: string };
export type TraccarResult<T = unknown> = OkResult<T> | ErrResult;

function creds() {
  const base = (providerOverride("traccar", "base_url") || Deno.env.get("TRACCAR_BASE_URL") || "").replace(/\/$/, "");
  const token = providerOverride("traccar", "token") || Deno.env.get("TRACCAR_TOKEN") || "";
  const email = providerOverride("traccar", "email") || Deno.env.get("TRACCAR_EMAIL") || "";
  const password = providerOverride("traccar", "password") || Deno.env.get("TRACCAR_PASSWORD") || "";
  if (!base) return null;
  if (!token && !(email && password)) return null;
  return { base, token, email, password };
}

/** Which credential pieces are absent — powers precise "not configured" errors. */
export function missingCredentials(): string[] {
  const base = providerOverride("traccar", "base_url") || Deno.env.get("TRACCAR_BASE_URL") || "";
  const token = providerOverride("traccar", "token") || Deno.env.get("TRACCAR_TOKEN") || "";
  const email = providerOverride("traccar", "email") || Deno.env.get("TRACCAR_EMAIL") || "";
  const password = providerOverride("traccar", "password") || Deno.env.get("TRACCAR_PASSWORD") || "";
  const missing: string[] = [];
  if (!base) missing.push("base_url");
  if (!token) {
    if (!email) missing.push("email");
    if (!password) missing.push("password");
  }
  return missing;
}

export function authMode(): "token" | "basic" | "none" {
  const c = creds();
  if (!c) return "none";
  return c.token ? "token" : "basic";
}

function authHeader(c: NonNullable<ReturnType<typeof creds>>): Record<string, string> {
  if (c.token) return { Authorization: `Bearer ${c.token}` };
  return { Authorization: "Basic " + btoa(`${c.email}:${c.password}`) };
}

async function call<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<TraccarResult<T>> {
  const c = creds();
  if (!c) return { ok: false, reason: "not_configured", missing: missingCredentials() };
  let res: Response;
  try {
    res = await fetch(`${c.base}/api${path}`, {
      ...init,
      headers: {
        ...authHeader(c),
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(init.headers || {}),
      },
      signal: AbortSignal.timeout(20_000),
    });
  } catch (e) {
    return { ok: false, reason: "network_error", message: (e as Error).message || String(e) };
  }
  const raw = await res.text().catch(() => "");
  let body: unknown = {};
  try { body = raw ? JSON.parse(raw) : {}; } catch { body = raw.slice(0, 400); }
  if (!res.ok) {
    return { ok: false, reason: "provider_error", status: res.status, body, auth_mode: c.token ? "token" : "basic" };
  }
  return { ok: true, body: body as T };
}


export interface TraccarDevice {
  id: number;
  name: string;
  uniqueId: string;
  status: string;
  lastUpdate: string | null;
  positionId: number | null;
  model?: string | null;
  contact?: string | null;
  phone?: string | null;
  disabled?: boolean;
  attributes?: Record<string, unknown>;
}

export interface TraccarPosition {
  id: number;
  deviceId: number;
  protocol: string;
  serverTime: string;
  deviceTime: string;
  fixTime: string;
  valid: boolean;
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number; // knots
  course: number;
  address: string | null;
  attributes: Record<string, unknown>;
}

export const traccar = {
  /** Warm admin-managed credentials before any sync getter is used. */
  ensureReady: async () => { await ensureProviderConfig("traccar"); },
  configSource: () => providerConfigSource("traccar"),
  isConfigured: () => !!creds(),
  baseUrl: () => creds()?.base ?? null,
  ping: () => call<{ id: number; name: string }>("/server"),
  listDevices: () => call<TraccarDevice[]>("/devices"),
  getDevice: (id: number) => call<TraccarDevice>(`/devices/${id}`),
  latestPositions: () => call<TraccarPosition[]>("/positions"),
  positionsFor: (deviceId: number, fromISO: string, toISO: string) =>
    call<TraccarPosition[]>(
      `/positions?deviceId=${deviceId}&from=${encodeURIComponent(fromISO)}&to=${encodeURIComponent(toISO)}`,
    ),
  sendCommand: (deviceId: number, type: string, attributes: Record<string, unknown> = {}) =>
    call(`/commands/send`, {
      method: "POST",
      body: JSON.stringify({ deviceId, type, attributes }),
    }),
};
