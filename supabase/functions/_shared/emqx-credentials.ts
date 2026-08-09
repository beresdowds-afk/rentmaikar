// Resolves EMQX API credentials.
// Priority: active vault-backed rotation version -> environment secrets.
// Keeps every existing EMQX_* env deployment working unchanged.

export interface EmqxCredentials {
  url: string;
  key: string;
  secret: string;
  source: "vault" | "env";
  versionId: string | null;
}

const DEFAULT_URL = "https://broker.rentmaikar.com:18083/api/v5";

export async function readCredentialVersion(
  versionId: string | null = null,
): Promise<{ id: string; api_key: string; api_secret: string; status: string } | null> {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return null;
  try {
    const res = await fetch(`${url}/rest/v1/rpc/emqx_read_credentials`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ _version_id: versionId }),
    });
    if (!res.ok) return null;
    const rows = await res.json();
    const row = Array.isArray(rows) ? rows[0] : rows;
    if (!row?.api_key || !row?.api_secret) return null;
    return row;
  } catch {
    return null;
  }
}

export async function getEmqxCredentials(): Promise<EmqxCredentials | null> {
  const url = Deno.env.get("EMQX_API_URL") || DEFAULT_URL;
  const active = await readCredentialVersion(null);
  if (active) {
    return { url, key: active.api_key, secret: active.api_secret, source: "vault", versionId: active.id };
  }
  const key = Deno.env.get("EMQX_API_KEY");
  const secret = Deno.env.get("EMQX_API_SECRET");
  if (!key || !secret) return null;
  return { url, key, secret, source: "env", versionId: null };
}

/** Live probe against the EMQX management API. */
export async function probeEmqx(
  url: string,
  key: string,
  secret: string,
): Promise<{ ok: boolean; status: number | null; detail: string; stats?: unknown }> {
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/stats`, {
      headers: { Authorization: "Basic " + btoa(`${key}:${secret}`) },
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, status: res.status, detail: text.slice(0, 300) };
    }
    return { ok: true, status: res.status, detail: "EMQX management API reachable", stats: await res.json() };
  } catch (e) {
    return { ok: false, status: null, detail: String(e).slice(0, 300) };
  }
}
