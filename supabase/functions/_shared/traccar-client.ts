// Traccar API client — reads TRACCAR_BASE_URL and either TRACCAR_TOKEN
// (session bearer / API token) OR TRACCAR_EMAIL + TRACCAR_PASSWORD.
// Returns { ok: false, reason: "not_configured" } until secrets are set,
// so the rest of the app keeps working.
//
// Docs: https://www.traccar.org/api-reference/

type OkResult<T = unknown> = { ok: true; body: T };
type ErrResult =
  | { ok: false; reason: "not_configured" }
  | { ok: false; reason: "provider_error"; status: number; body: unknown };
export type TraccarResult<T = unknown> = OkResult<T> | ErrResult;

function creds() {
  const base = (Deno.env.get("TRACCAR_BASE_URL") || "").replace(/\/$/, "");
  const token = Deno.env.get("TRACCAR_TOKEN") || "";
  const email = Deno.env.get("TRACCAR_EMAIL") || "";
  const password = Deno.env.get("TRACCAR_PASSWORD") || "";
  if (!base) return null;
  if (!token && !(email && password)) return null;
  return { base, token, email, password };
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
  if (!c) return { ok: false, reason: "not_configured" };
  const res = await fetch(`${c.base}/api${path}`, {
    ...init,
    headers: {
      ...authHeader(c),
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, reason: "provider_error", status: res.status, body };
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
