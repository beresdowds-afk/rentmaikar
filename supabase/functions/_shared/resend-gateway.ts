/**
 * Shared Resend transport.
 *
 * The project's `RESEND_API_KEY` is managed by the Lovable Resend connector, so
 * it is a *connection* key — not a raw `re_...` Resend API key. Posting it
 * straight to api.resend.com fails with `401 API key is invalid`, which is what
 * silently killed every outbound email.
 *
 * Use `RESEND_ENDPOINT` + `resendHeaders(key)` for every send: when the key is a
 * real Resend key we talk to Resend directly, otherwise we route through the
 * Lovable connector gateway (same path `process-email-queue` already uses).
 */

const RESEND_DIRECT_URL = "https://api.resend.com";
const RESEND_GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

/** True when the configured key is a raw Resend API key (`re_...`). */
export function isDirectResendKey(key?: string | null): boolean {
  return !!key && key.startsWith("re_");
}

/** Base URL to use for Resend calls, given the configured key. */
export function resendBaseUrl(key?: string | null): string {
  return isDirectResendKey(key) ? RESEND_DIRECT_URL : RESEND_GATEWAY_URL;
}

/** Full endpoint for sending an email with the configured key. */
export function resendEmailsUrl(key?: string | null): string {
  return `${resendBaseUrl(key)}/emails`;
}

/** Endpoint resolved from the ambient RESEND_API_KEY secret. */
export const RESEND_ENDPOINT = resendEmailsUrl(Deno.env.get("RESEND_API_KEY"));

/**
 * Headers for a Resend send. Direct keys use `Authorization: Bearer <re_...>`;
 * connector keys authenticate with the Lovable API key and pass the connection
 * key through `X-Connection-Api-Key`.
 */
export function resendHeaders(key?: string | null): Record<string, string> {
  const resendKey = key ?? Deno.env.get("RESEND_API_KEY") ?? "";
  if (isDirectResendKey(resendKey)) {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendKey}`,
    };
  }
  const lovableKey = Deno.env.get("LOVABLE_API_KEY") ?? "";
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": resendKey,
  };
}

/**
 * The only domain verified for sending in Resend. Anything sent from an
 * unverified domain (e.g. `@rentmaikar.com`, `@mail.rentmaikar.com`) is
 * rejected with `403 domain is not verified`, which is why outbound email was
 * failing. Overridable with `RESEND_SENDING_DOMAIN`.
 */
export function resendSendingDomain(): string {
  return Deno.env.get("RESEND_SENDING_DOMAIN") || "notify.rentmaikar.com";
}

/** Split `Name <local@domain>` (or a bare address) into its parts. */
function parseAddress(value: string): { name?: string; local: string; domain: string } | null {
  const match = value.match(/^\s*(?:"?([^"<]*?)"?\s*)?<?([^<>@\s]+)@([^<>@\s]+?)>?\s*$/);
  if (!match) return null;
  return { name: match[1]?.trim() || undefined, local: match[2], domain: match[3] };
}

/**
 * Rewrites a sender onto the verified sending domain, preserving the display
 * name and mailbox. `RESEND_FALLBACK_FROM` still wins when explicitly set.
 */
export function resendFrom(from: string): string {
  const override = Deno.env.get("RESEND_FALLBACK_FROM");
  const candidate = override || from;
  const parsed = parseAddress(candidate);
  if (!parsed) return candidate;
  const domain = resendSendingDomain();
  if (parsed.domain.toLowerCase() === domain.toLowerCase()) return candidate;
  const address = `${parsed.local}@${domain}`;
  return parsed.name ? `${parsed.name} <${address}>` : address;
}

type ResendBody = Record<string, unknown> & { from?: string; reply_to?: string | string[] };

/**
 * Single transport for every outbound Resend email. Normalises the sender onto
 * the verified domain and keeps the original address as `reply_to` so replies
 * still reach the human mailbox.
 */
export function resendSendEmail(body: ResendBody, key?: string | null): Promise<Response> {
  const apiKey = key ?? Deno.env.get("RESEND_API_KEY") ?? "";
  const originalFrom = typeof body.from === "string" ? body.from : "";
  const from = originalFrom ? resendFrom(originalFrom) : originalFrom;
  const replyTo = body.reply_to ??
    (originalFrom && from !== originalFrom ? originalFrom : undefined);

  return fetch(resendEmailsUrl(apiKey), {
    method: "POST",
    headers: resendHeaders(apiKey),
    body: JSON.stringify({
      ...body,
      ...(from ? { from } : {}),
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });
}

