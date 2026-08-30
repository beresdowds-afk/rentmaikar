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
 * Optional verified-sender override. While the branded sender domain is still
 * pending DNS verification, `RESEND_FALLBACK_FROM` keeps sends deliverable.
 */
export function resendFrom(from: string): string {
  return Deno.env.get("RESEND_FALLBACK_FROM") || from;
}
