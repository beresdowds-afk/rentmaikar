/**
 * Shared SMS / WhatsApp message template resolver.
 *
 * Templates live in public.twilio_message_templates and are editable by admins
 * from the dashboard. Resolution order (most specific wins):
 *   1. exact channel + country + language
 *   2. exact channel + global (country_code IS NULL) + language
 *   3. channel 'both' + country + language
 *   4. channel 'both' + global + language
 *
 * If no active template matches, callers fall back to their hardcoded copy so
 * sending never breaks because a template was deleted or deactivated.
 */

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type TemplateChannel = "sms" | "whatsapp";

interface TemplateRow {
  template_key: string;
  channel: string;
  country_code: string | null;
  language: string;
  body: string;
  is_active: boolean;
}

const PLACEHOLDER_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

/** Replace {{tokens}} with values; unknown/empty tokens collapse to ''. */
export function renderTemplate(
  body: string,
  values: Record<string, string | number | undefined | null>,
): string {
  return body
    .replace(PLACEHOLDER_RE, (_m, key: string) => {
      const v = values[key];
      return v === undefined || v === null ? "" : String(v);
    })
    // Tidy up gaps left by empty optional placeholders.
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([.,!?])/g, "$1")
    .trim();
}

/** Map an E.164 phone number to the template country code we seed with. */
export function countryCodeForPhone(phone?: string | null): string | null {
  if (!phone) return null;
  if (phone.startsWith("+234")) return "NG";
  if (phone.startsWith("+1")) return "US";
  return null;
}

// Small in-memory cache; edge function instances are short lived.
const CACHE_TTL_MS = 60_000;
let cache: { at: number; rows: TemplateRow[] } | null = null;

async function loadTemplates(supabase: SupabaseClient): Promise<TemplateRow[]> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.rows;
  const { data, error } = await supabase
    .from("twilio_message_templates")
    .select("template_key, channel, country_code, language, body, is_active")
    .eq("is_active", true);
  if (error) {
    console.error("template load failed:", error.message);
    return cache?.rows ?? [];
  }
  cache = { at: Date.now(), rows: (data ?? []) as TemplateRow[] };
  return cache.rows;
}

export function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

export interface ResolveOptions {
  key: string;
  channel: TemplateChannel;
  countryCode?: string | null;
  language?: string;
  values?: Record<string, string | number | undefined | null>;
  /** Used when no active template matches. */
  fallback: string;
  supabase?: SupabaseClient;
}

/**
 * Resolve and render a message body, falling back to the caller's hardcoded
 * copy when no active template exists.
 */
export async function resolveMessage(opts: ResolveOptions): Promise<string> {
  const { key, channel, countryCode = null, language = "en", values = {}, fallback } = opts;
  try {
    const supabase = opts.supabase ?? serviceClient();
    const rows = await loadTemplates(supabase);
    const candidates = rows.filter(
      (r) => r.template_key === key && (r.channel === channel || r.channel === "both"),
    );
    if (!candidates.length) return fallback;

    const pick =
      candidates.find(
        (r) => r.channel === channel && r.country_code === countryCode && r.language === language,
      ) ??
      candidates.find(
        (r) => r.channel === channel && r.country_code === null && r.language === language,
      ) ??
      candidates.find(
        (r) => r.channel === "both" && r.country_code === countryCode && r.language === language,
      ) ??
      candidates.find((r) => r.channel === "both" && r.country_code === null) ??
      candidates[0];

    if (!pick?.body) return fallback;
    const rendered = renderTemplate(pick.body, values);
    return rendered || fallback;
  } catch (e) {
    console.error("resolveMessage error:", (e as Error)?.message ?? e);
    return fallback;
  }
}
