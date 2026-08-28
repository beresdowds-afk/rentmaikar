/**
 * Sent.dm OpenAPI v3 client — global default CPaaS provider.
 *
 * Sent is attempted FIRST for every outbound SMS/WhatsApp/RCS message.
 * If it is not configured, the channel is disabled, or the dispatch fails,
 * callers fall back to the regional providers (Twilio for USA, Termii for
 * Nigeria, Whatchimp where a region prefers it for WhatsApp).
 *
 * WhatsApp specifics handled here:
 *  - dedicated WhatsApp business sender (`SENT_WHATSAPP_NUMBER`), since
 *    alphanumeric sender IDs are not valid on WhatsApp
 *  - approved template dispatch (required outside the 24h session window)
 *  - media attachments (image/document links)
 *  - per-channel kill switch via `SENT_CHANNELS`
 */

export type SentChannel = "sms" | "whatsapp" | "rcs";

export interface SentTemplateRef {
  /** Approved WhatsApp template name/id registered with Sent.dm */
  id: string;
  /** BCP-47 language code, e.g. "en_US" */
  language?: string;
  parameters?: Record<string, string | number>;
}

export interface SentSendRequest {
  to: string;
  channel: SentChannel;
  /** Free-form session text. Optional when `template` is supplied. */
  text?: string;
  /** WhatsApp approved template (required outside the 24h session window). */
  template?: SentTemplateRef;
  /** Public URLs for media attachments (WhatsApp/RCS only). */
  mediaUrls?: string[];
  senderId?: string;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
}

export interface SentSendResult {
  ok: boolean;
  messageId?: string;
  status?: string;
  channel?: SentChannel;
  sandbox?: boolean;
  error?: string;
  skipped?: boolean; // provider or channel not enabled
}

const DEFAULT_BASE_URL = "https://api.sent.dm";
const ALL_CHANNELS: SentChannel[] = ["sms", "whatsapp", "rcs"];

export function sentApiKey(): string {
  return Deno.env.get("SENT_API_KEY") ?? "";
}

export function sentEnabled(): boolean {
  const key = sentApiKey();
  if (!key || key === "mock" || key.startsWith("demo_")) return false;
  // Explicit kill switch
  return (Deno.env.get("SENT_ENABLED") ?? "true").toLowerCase() !== "false";
}

/** Channels Sent is allowed to serve. Defaults to all three. */
export function sentChannels(): SentChannel[] {
  const raw = (Deno.env.get("SENT_CHANNELS") ?? "").trim();
  if (!raw) return [...ALL_CHANNELS];
  const parsed = raw
    .split(/[,\s]+/)
    .map((c) => c.trim().toLowerCase())
    .filter((c): c is SentChannel => (ALL_CHANNELS as string[]).includes(c));
  return parsed.length ? parsed : [...ALL_CHANNELS];
}

export function sentChannelEnabled(channel: SentChannel): boolean {
  return sentEnabled() && sentChannels().includes(channel);
}

export function sentSenderId(): string {
  return Deno.env.get("SENT_SENDER_ID") || "RENTMAIKAR";
}

/**
 * WhatsApp requires a registered business phone number as the sender —
 * alphanumeric sender IDs are rejected by the channel.
 */
export function sentWhatsappSender(): string {
  return (
    Deno.env.get("SENT_WHATSAPP_NUMBER") ||
    Deno.env.get("TWILIO_WHATSAPP_NUMBER") ||
    ""
  );
}

function senderForChannel(channel: SentChannel, override?: string): string {
  if (override) return override;
  if (channel === "whatsapp") return sentWhatsappSender() || sentSenderId();
  return sentSenderId();
}

function sentBaseUrl(): string {
  return Deno.env.get("SENT_API_BASE_URL") || DEFAULT_BASE_URL;
}

function sandboxMode(): boolean {
  return (Deno.env.get("SENT_SANDBOX_MODE") ?? "false").toLowerCase() === "true";
}

function normalizeRecipient(channel: SentChannel, to: string): string {
  // Sent.dm expects bare E.164 — strip Twilio-style `whatsapp:` prefixes.
  const bare = to.replace(/^whatsapp:/i, "").trim();
  return bare.startsWith("+") ? bare : `+${bare.replace(/[^0-9]/g, "")}`;
}

/** Dispatch a message through Sent.dm v3. Never throws. */
export async function sendViaSent(req: SentSendRequest): Promise<SentSendResult> {
  if (!sentEnabled()) {
    return { ok: false, skipped: true, error: "SENT_API_KEY not configured" };
  }
  if (!sentChannelEnabled(req.channel)) {
    return { ok: false, skipped: true, error: `Sent.dm channel '${req.channel}' disabled` };
  }
  if (!req.text && !req.template) {
    return { ok: false, skipped: true, error: "Either text or template is required" };
  }

  const media = (req.mediaUrls ?? []).filter(Boolean).slice(0, 10);
  if (media.length && req.channel === "sms") {
    // SMS has no native media on Sent.dm — append the links to the body instead.
    req = { ...req, text: [req.text, ...media].filter(Boolean).join("\n"), mediaUrls: [] };
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
        to: [normalizeRecipient(req.channel, req.to)],
        channel: req.channel,
        ...(req.text ? { text: req.text } : {}),
        ...(req.template
          ? {
              template: {
                id: req.template.id,
                language: req.template.language ?? "en_US",
                parameters: req.template.parameters ?? {},
              },
            }
          : {}),
        ...(req.channel !== "sms" && media.length ? { media: media.map((url) => ({ url })) } : {}),
        sender_id: senderForChannel(req.channel, req.senderId),
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
      return { ok: false, error: message, channel: req.channel };
    }

    return {
      ok: true,
      messageId: (data as any).id ?? `sent_${Date.now()}`,
      status: (data as any).status ?? "queued",
      channel: req.channel,
      sandbox: sandboxMode(),
    };
  } catch (e) {
    return {
      ok: false,
      channel: req.channel,
      error: e instanceof Error ? e.message : "Sent.dm request failed",
    };
  }
}

/** Convenience wrapper for WhatsApp dispatch. */
export function sendWhatsappViaSent(
  req: Omit<SentSendRequest, "channel">,
): Promise<SentSendResult> {
  return sendViaSent({ ...req, channel: "whatsapp" });
}

/** Lightweight health probe against GET /v3/account. */
export async function sentHealth(): Promise<{
  configured: boolean;
  healthy: boolean;
  status_code?: number;
  sandbox: boolean;
  base_url: string;
  sender_id: string;
  whatsapp_sender: string | null;
  whatsapp_ready: boolean;
  enabled_channels: SentChannel[];
  latency_ms?: number;
  account?: unknown;
  error?: string;
}> {
  const waSender = sentWhatsappSender();
  const channels = sentChannels();
  const base = {
    configured: sentEnabled(),
    sandbox: sandboxMode(),
    base_url: sentBaseUrl(),
    sender_id: sentSenderId(),
    whatsapp_sender: waSender || null,
    whatsapp_ready: sentChannelEnabled("whatsapp") && Boolean(waSender),
    enabled_channels: channels,
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
