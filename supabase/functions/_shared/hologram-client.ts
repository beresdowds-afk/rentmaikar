// Hologram eSIM management client — stubbed behind secrets.
// Returns { ok: false, reason: "not_configured" } when HOLOGRAM_API_KEY or
// HOLOGRAM_ORG_ID is missing, so nothing breaks until an admin adds them.
//
// Docs: https://www.hologram.io/docs/reference

const BASE = "https://dashboard.hologram.io/api/1";

function creds() {
  const apiKey = Deno.env.get("HOLOGRAM_API_KEY");
  const orgId = Deno.env.get("HOLOGRAM_ORG_ID");
  if (!apiKey || !orgId) return null;
  return { apiKey, orgId };
}

async function call(path: string, init: RequestInit = {}) {
  const c = creds();
  if (!c) return { ok: false as const, reason: "not_configured" as const };
  const auth = "Basic " + btoa(`apikey:${c.apiKey}`);
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false as const, reason: "provider_error" as const, status: res.status, body };
  return { ok: true as const, body };
}

export const hologram = {
  isConfigured: () => !!creds(),
  listSims: (limit = 50) => call(`/links/cellular?limit=${limit}`),
  getSim: (simId: string) => call(`/links/cellular/${simId}`),
  activateSim: (simId: string, planId: number) =>
    call(`/links/cellular/${simId}/state`, {
      method: "POST",
      body: JSON.stringify({ state: "live", plan: planId }),
    }),
  suspendSim: (simId: string) =>
    call(`/links/cellular/${simId}/state`, {
      method: "POST",
      body: JSON.stringify({ state: "pause" }),
    }),
  getSimUsage: (simId: string) => call(`/links/cellular/${simId}/usage`),
};
