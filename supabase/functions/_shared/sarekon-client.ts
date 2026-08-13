// GPSANDTRACK telemetry API client.
//
// Server address + path prefix: https://api.sarekon.com/v1
// Authentication: POST /session/create.json with a user id + password, which
// returns a session token reused by every later call.
//
// Credentials resolve admin-managed values first (provider_write_credentials
// vault entries / platform_kv_settings), then env secrets:
//   SAREKON_BASE_URL (optional, defaults to https://api.sarekon.com/v1)
//   SAREKON_USER_ID
//   SAREKON_PASSWORD
//
// Nothing throws: unconfigured or failing calls return a structured result so
// the rest of the platform degrades gracefully.

import { ensureProviderConfig, providerConfigSource, providerOverride } from "./provider-config.ts";

type OkResult<T = unknown> = { ok: true; body: T };
type ErrResult =
  | { ok: false; reason: "not_configured"; missing?: string[] }
  | { ok: false; reason: "network_error"; message: string }
  | { ok: false; reason: "auth_error"; status: number; body: unknown }
  | { ok: false; reason: "provider_error"; status: number; body: unknown };
export type GPSANDTRACKResult<T = unknown> = OkResult<T> | ErrResult;

const DEFAULT_BASE = "https://api.sarekon.com/v1";

function creds() {
  const base = (providerOverride("sarekon", "base_url") || Deno.env.get("SAREKON_BASE_URL") || DEFAULT_BASE)
    .replace(/\/$/, "");
  const userId = providerOverride("sarekon", "user_id") || Deno.env.get("SAREKON_USER_ID") || "";
  const password = providerOverride("sarekon", "password") || Deno.env.get("SAREKON_PASSWORD") || "";
  if (!userId || !password) return null;
  return { base, userId, password };
}

export function missingCredentials(): string[] {
  const missing: string[] = [];
  if (!(providerOverride("sarekon", "user_id") || Deno.env.get("SAREKON_USER_ID"))) missing.push("user_id");
  if (!(providerOverride("sarekon", "password") || Deno.env.get("SAREKON_PASSWORD"))) missing.push("password");
  return missing;
}

// ---- session cache -------------------------------------------------------
let session: { token: string; issuedAt: number } | null = null;
const SESSION_TTL_MS = 20 * 60_000;

function pick(obj: unknown, keys: string[]): unknown {
  if (!obj || typeof obj !== "object") return undefined;
  const rec = obj as Record<string, unknown>;
  for (const k of keys) {
    if (rec[k] !== undefined && rec[k] !== null && rec[k] !== "") return rec[k];
  }
  return undefined;
}

/** GPSANDTRACK nests payloads inconsistently — dig out the first array we find. */
function extractList(body: unknown, keys: string[]): Record<string, unknown>[] {
  if (Array.isArray(body)) return body as Record<string, unknown>[];
  if (!body || typeof body !== "object") return [];
  const rec = body as Record<string, unknown>;
  for (const k of keys) {
    const v = rec[k];
    if (Array.isArray(v)) return v as Record<string, unknown>[];
  }
  for (const v of Object.values(rec)) {
    if (Array.isArray(v)) return v as Record<string, unknown>[];
  }
  return [];
}

async function rawPost<T = unknown>(
  path: string,
  payload: Record<string, unknown>,
): Promise<GPSANDTRACKResult<T>> {
  const c = creds();
  if (!c) return { ok: false, reason: "not_configured", missing: missingCredentials() };
  let res: Response;
  try {
    res = await fetch(`${c.base}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (e) {
    return { ok: false, reason: "network_error", message: (e as Error).message || String(e) };
  }
  const raw = await res.text().catch(() => "");
  let body: unknown = {};
  try { body = raw ? JSON.parse(raw) : {}; } catch { body = raw.slice(0, 400); }
  // GPSANDTRACK reports failures in-band: { error: { id, description } } — often
  // with HTTP 400 rather than 401 — so inspect the envelope too.
  const envelope = (body && typeof body === "object" ? (body as Record<string, unknown>).error : null) as
    | Record<string, unknown>
    | null;
  const isAuthFailure = res.status === 401 || res.status === 403 ||
    (envelope ? /username|password|session|login|authenticat/i.test(String(envelope.description ?? envelope.id_description ?? "")) : false);
  if (isAuthFailure) return { ok: false, reason: "auth_error", status: res.status, body: envelope ?? body };
  if (envelope) return { ok: false, reason: "provider_error", status: res.status, body: envelope };
  if (!res.ok) return { ok: false, reason: "provider_error", status: res.status, body };
  return { ok: true, body: body as T };
}

/** Authenticate and cache the session token. */
async function login(force = false): Promise<GPSANDTRACKResult<string>> {
  const c = creds();
  if (!c) return { ok: false, reason: "not_configured", missing: missingCredentials() };
  if (!force && session && Date.now() - session.issuedAt < SESSION_TTL_MS) {
    return { ok: true, body: session.token };
  }
  const r = await rawPost("/session/create.json", {
    user_id: c.userId,
    username: c.userId,
    login: c.userId,
    password: c.password,
  });
  if (!r.ok) return r;
  const body = r.body as Record<string, unknown>;
  const inner = (body?.session ?? body?.data ?? body) as Record<string, unknown>;
  const token = pick(inner, ["session_id", "sessionId", "id", "token", "session_token", "key"]) ??
    pick(body, ["session_id", "sessionId", "token"]);
  if (!token) {
    return { ok: false, reason: "auth_error", status: 200, body };
  }
  session = { token: String(token), issuedAt: Date.now() };
  return { ok: true, body: session.token };
}

/** Authenticated call; transparently re-authenticates once on session expiry. */
async function call<T = unknown>(
  path: string,
  payload: Record<string, unknown> = {},
): Promise<GPSANDTRACKResult<T>> {
  const auth = await login();
  if (!auth.ok) return auth;
  let r = await rawPost<T>(path, { session_id: auth.body, ...payload });
  if (!r.ok && r.reason === "auth_error") {
    const retryAuth = await login(true);
    if (!retryAuth.ok) return retryAuth;
    r = await rawPost<T>(path, { session_id: retryAuth.body, ...payload });
  }
  return r;
}

// ---- normalised shapes ---------------------------------------------------

export interface GPSANDTRACKDevice {
  id: string;
  serial: string;
  name: string | null;
  model: string | null;
  status: string | null;
  lastUpdate: string | null;
  latitude: number | null;
  longitude: number | null;
  speedKmh: number | null;
  course: number | null;
  ignition: boolean | null;
  address: string | null;
  raw: Record<string, unknown>;
}

const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : null;
};

const bool = (v: unknown): boolean | null => {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v === "boolean") return v;
  const s = String(v).toLowerCase();
  if (["1", "true", "on", "yes"].includes(s)) return true;
  if (["0", "false", "off", "no"].includes(s)) return false;
  return null;
};

export function normaliseDevice(row: Record<string, unknown>): GPSANDTRACKDevice {
  const loc = (row.location ?? row.last_location ?? row.position ?? row) as Record<string, unknown>;
  const id = pick(row, ["dvd_id", "dvdId", "device_id", "id", "uid"]);
  const serial = pick(row, ["serial", "serial_number", "imei", "esn", "unique_id", "dvd_id", "id"]);
  return {
    id: String(id ?? serial ?? ""),
    serial: String(serial ?? id ?? ""),
    name: (pick(row, ["name", "label", "asset_name", "description"]) as string) ?? null,
    model: (pick(row, ["model", "device_model", "product", "hardware"]) as string) ?? null,
    status: (pick(row, ["status", "state", "connection_status"]) as string) ?? null,
    lastUpdate: (pick(row, ["last_update", "updated_at", "last_seen", "timestamp", "reported_at"]) as string) ??
      (pick(loc, ["timestamp", "time", "gps_time", "reported_at"]) as string) ?? null,
    latitude: num(pick(loc, ["latitude", "lat"])),
    longitude: num(pick(loc, ["longitude", "lon", "lng", "long"])),
    speedKmh: num(pick(loc, ["speed_kmh", "speed", "velocity"])),
    course: num(pick(loc, ["course", "heading", "bearing", "direction"])),
    ignition: bool(pick(loc, ["ignition", "ign", "engine_on"]) ?? pick(row, ["ignition"])),
    address: (pick(loc, ["address", "location_name", "street"]) as string) ?? null,
    raw: row,
  };
}

export const sarekon = {
  ensureReady: async () => { await ensureProviderConfig("sarekon"); },
  configSource: () => providerConfigSource("sarekon"),
  isConfigured: () => !!creds(),
  baseUrl: () => creds()?.base ?? DEFAULT_BASE,
  resetSession: () => { session = null; },

  /** Verify credentials by creating a fresh session. */
  ping: () => login(true),

  async listDevices(): Promise<GPSANDTRACKResult<GPSANDTRACKDevice[]>> {
    const r = await call("/dvd/enumerate.json", {});
    if (!r.ok) return r;
    const rows = extractList(r.body, ["dvds", "devices", "results", "data", "items"]);
    return { ok: true, body: rows.map(normaliseDevice) };
  },

  async showDevice(dvdId: string): Promise<GPSANDTRACKResult<GPSANDTRACKDevice | null>> {
    const r = await call("/dvd/show.json", { dvd_id: dvdId });
    if (!r.ok) return r;
    const body = r.body as Record<string, unknown>;
    const row = (body?.dvd ?? body?.data ?? body) as Record<string, unknown>;
    return { ok: true, body: row ? normaliseDevice(row) : null };
  },

  async locations(dvdId: string, limit = 50): Promise<GPSANDTRACKResult<Record<string, unknown>[]>> {
    const r = await call("/location/list.json", { dvd_id: dvdId, limit });
    if (!r.ok) return r;
    return { ok: true, body: extractList(r.body, ["locations", "results", "data", "items"]) };
  },

  async messages(dvdId: string, limit = 50): Promise<GPSANDTRACKResult<Record<string, unknown>[]>> {
    const r = await call("/message/list.json", { dvd_id: dvdId, limit });
    if (!r.ok) return r;
    return { ok: true, body: extractList(r.body, ["messages", "results", "data", "items"]) };
  },

  async trips(dvdId: string, limit = 50): Promise<GPSANDTRACKResult<Record<string, unknown>[]>> {
    const r = await call("/trip/list.json", { dvd_id: dvdId, limit });
    if (!r.ok) return r;
    return { ok: true, body: extractList(r.body, ["trips", "results", "data", "items"]) };
  },

  async stops(dvdId: string, limit = 50): Promise<GPSANDTRACKResult<Record<string, unknown>[]>> {
    const r = await call("/stop/list.json", { dvd_id: dvdId, limit });
    if (!r.ok) return r;
    return { ok: true, body: extractList(r.body, ["stops", "results", "data", "items"]) };
  },

  async commandParameters(): Promise<GPSANDTRACKResult<Record<string, unknown>[]>> {
    const r = await call("/command_queue/parameters_enumerate.json", {});
    if (!r.ok) return r;
    return { ok: true, body: extractList(r.body, ["parameters", "commands", "results", "data", "items"]) };
  },

  sendCommand: (dvdId: string, command: string, parameters: Record<string, unknown> = {}) =>
    call("/command_queue/create.json", { dvd_id: dvdId, command, parameters }),

  async commandHistory(dvdId?: string, limit = 50): Promise<GPSANDTRACKResult<Record<string, unknown>[]>> {
    const r = await call("/command_queue/list.json", dvdId ? { dvd_id: dvdId, limit } : { limit });
    if (!r.ok) return r;
    return { ok: true, body: extractList(r.body, ["commands", "command_queue", "results", "data", "items"]) };
  },

  async subscriptions(): Promise<GPSANDTRACKResult<Record<string, unknown>[]>> {
    const r = await call("/subscription/list.json", {});
    if (!r.ok) return r;
    return { ok: true, body: extractList(r.body, ["subscriptions", "results", "data", "items"]) };
  },
};

/** Platform command name -> GPSANDTRACK command name. */
export const SAREKON_COMMAND_MAP: Record<string, string> = {
  immobilize: "engine_disable",
  engineStop: "engine_disable",
  mobilize: "engine_enable",
  engineResume: "engine_enable",
  locate: "locate_now",
  ping: "locate_now",
};
