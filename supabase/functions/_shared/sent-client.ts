/**
 * Sent.dm OpenAPI v3 client — global default CPaaS provider.
 *
 * Sent is attempted FIRST for every outbound SMS/WhatsApp/RCS message.
 * If it is not configured, or the dispatch fails, callers fall back to the
 * regional providers (Twilio for USA, Termii for Nigeria).
 */

export type SentChannel = "sms" | "whatsapp" | "rcs";

export interface SentSendRequest {
  to: string;
  channel: SentChannel;
  text: string;
  senderId?: string;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
}

export interface SentSendResult {
  ok: boolean;
  messageId?: string;
  status?: string;
  sandbox?: boolean;
  error?: string;
  skipped?: boolean; // provider not configured
}

const DEFAULT_BASE_URL = "https://api.sent.dm";

export function sentApiKey(): string {
  return Deno.env.get("SENT_API_KEY") ?? "";
}

export function sentEnabled(): boolean {
  const key = sentApiKey();
  if (!key || key === "mock" || key.startsWith("demo_")) return false;
  // Explicit kill switch
  return (Deno.env.get("SENT_ENABLED") ?? "true").toLowerCase() !== "false";
}

export function sentSenderId(): string {
  return Deno.env.get("SENT_SENDER_ID") || "RENTMAIKAR";
}

function sentBaseUrl(): string {
  return Deno.env.get("SENT_API_BASE_URL") || DEFAULT_BASE_URL;
}

function sandboxMode(): boolean {
  return (Deno.env.get("SENT_SANDBOX_MODE") ?? "false").toLowerCase() === "true";
}

/** Dispatch a message through Sent.dm v3. Never throws. */
export async function sendViaSent(req: SentSendRequest): Promise<SentSendResult> {
  if (!sentEnabled()) {
    return { ok: false, skipped: true, error: "SENT_API_KEY not configured" };
  }

  const idempotencyKey =
    req.idempotencyKey ||
    `rm_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  try {
    const res = await fetch(`${sentBaseUrl()}/v3/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": sentApiKey(),
        "x-idempotency-key": idempotencyKey,
        ...(sandboxMode() ? { "x-sandbox": "true" } : {}),
      },
      body: JSON.stringify({
        to: [req.to],
        channel: req.channel,
        text: req.text,
        sender_id: req.senderId || sentSenderId(),
        metadata: {
          ...(req.metadata ?? {}),
          platform: "Rentmaikar",
          dispatched_at: new Date().toISOString(),
        },
      }),
      signal: AbortSignal.timeout(15000),
    });

    const data = await res.json().catch(() => ({} as Record<string, unknown>));

    if (!res.ok) {
      const message =
        (data as any)?.error?.message ||
        (data as any)?.message ||
        `Sent.dm HTTP ${res.status}`;
      return { ok: false, error: message };
    }

    return {
      ok: true,
      messageId: (data as any).id ?? `sent_${Date.now()}`,
      status: (data as any).status ?? "queued",
      sandbox: sandboxMode(),
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Sent.dm request failed" };
  }
}

/** Lightweight health probe against GET /v3/account. */
export async function sentHealth(): Promise<{
  configured: boolean;
  healthy: boolean;
  status_code?: number;
  sandbox: boolean;
  base_url: string;
  sender_id: string;
  latency_ms?: number;
  account?: unknown;
  error?: string;
}> {
  const base = {
    configured: sentEnabled(),
    sandbox: sandboxMode(),
    base_url: sentBaseUrl(),
    sender_id: sentSenderId(),
  };

  if (!sentEnabled()) {
    return { ...base, healthy: false, error: "SENT_API_KEY not configured" };
  }

  const started = Date.now();
  try {
    const res = await fetch(`${sentBaseUrl()}/v3/account`, {
      headers: { "x-api-key": sentApiKey() },
      signal: AbortSignal.timeout(10000),
    });
    const account = await res.json().catch(() => null);
    return {
      ...base,
      healthy: res.ok,
      status_code: res.status,
      latency_ms: Date.now() - started,
      account: res.ok ? account : undefined,
      error: res.ok ? undefined : `HTTP ${res.status}`,
    };
  } catch (e) {
    return {
      ...base,
      healthy: false,
      latency_ms: Date.now() - started,
      error: e instanceof Error ? e.message : "probe failed",
    };
  }
}
