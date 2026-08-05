// Twilio request signature validation for public IVR / webhook endpoints.
//
// Twilio signs every request it makes to your endpoint with
// `X-Twilio-Signature`: base64(HMAC-SHA1(authToken, fullUrl + sortedFormParams)).
// Without this check any anonymous caller can POST fake DTMF digits to an IVR
// handler and drive privileged flows (extensions, unlocks, agent transfers).
//
// Usage (form-encoded Twilio callbacks):
//   const form = await req.formData();
//   const denied = await verifyTwilioRequest(req, form);
//   if (denied) return denied;
import { timingSafeEqualHex } from "./timing-safe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-twilio-signature",
  "Content-Type": "application/json",
};

async function hmacSha1Base64(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

function toHex(b64: string): string {
  try {
    return [...atob(b64)].map((c) => c.charCodeAt(0).toString(16).padStart(2, "0")).join("");
  } catch {
    return "";
  }
}

export interface TwilioVerifyOptions {
  /** Allow an internal caller presenting the service-role bearer token. */
  allowServiceRole?: boolean;
}

/**
 * Returns a 403 `Response` when the request is not a genuine Twilio callback,
 * or `null` when the signature is valid.
 *
 * Fails closed: if TWILIO_AUTH_TOKEN is not configured the request is rejected
 * rather than silently trusted.
 */
export async function verifyTwilioRequest(
  req: Request,
  form: FormData,
  opts: TwilioVerifyOptions = {},
): Promise<Response | null> {
  if (opts.allowServiceRole !== false) {
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const auth = req.headers.get("Authorization") ?? "";
    if (serviceKey && auth.startsWith("Bearer ") && auth.slice(7) === serviceKey) {
      return null;
    }
  }

  const token = Deno.env.get("TWILIO_AUTH_TOKEN");
  const provided = req.headers.get("X-Twilio-Signature") ?? "";
  if (!token || !provided) {
    console.error("[twilio-signature] rejected: missing auth token or signature header");
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: corsHeaders,
    });
  }

  // Twilio signs the exact URL it called, including the query string.
  const url = req.url;
  const keys: string[] = [];
  for (const k of form.keys()) keys.push(k);
  keys.sort();
  let payload = url;
  for (const k of keys) payload += k + String(form.get(k) ?? "");

  const expected = await hmacSha1Base64(token, payload);
  if (!timingSafeEqualHex(toHex(expected), toHex(provided))) {
    console.error("[twilio-signature] rejected: signature mismatch");
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: corsHeaders,
    });
  }
  return null;
}
