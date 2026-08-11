// ════════════════════════════════════════════════════════════
// Outbound channel kill-switches
//
// Admin-controlled per channel (call / sms / whatsapp / email) and per
// region (USA / Nigeria). Stored in `platform_kv_settings` under the
// `outbound_channel_config` key so a provider can be paused at runtime
// without redeploying any edge function.
//
// Fail-open: if the setting is missing or unreadable, sending continues.
// ════════════════════════════════════════════════════════════

// deno-lint-ignore no-explicit-any
type Supa = any;

export type OutboundChannel = "call" | "sms" | "whatsapp" | "email";
export type OutboundRegion = "USA" | "Nigeria";

export const OUTBOUND_CONFIG_KEY = "outbound_channel_config";

export type OutboundChannelFlags = Record<OutboundChannel, boolean>;
export type OutboundConfig = Record<OutboundRegion, OutboundChannelFlags>;

const ALL_ON: OutboundChannelFlags = { call: true, sms: true, whatsapp: true, email: true };

export const DEFAULT_OUTBOUND_CONFIG: OutboundConfig = {
  USA: { ...ALL_ON },
  Nigeria: { ...ALL_ON },
};

/** Normalise the many region spellings used across the platform. */
export function normaliseOutboundRegion(region?: string | null): OutboundRegion {
  const r = (region || "").trim().toLowerCase();
  if (r.startsWith("ng") || r.includes("nigeria")) return "Nigeria";
  return "USA";
}

/** Region inferred from an E.164 phone number. */
export function outboundRegionFromPhone(...numbers: (string | null | undefined)[]): OutboundRegion {
  for (const n of numbers) {
    const clean = (n || "").replace("whatsapp:", "").replace(/[\s-()]/g, "");
    if (clean.startsWith("+234") || clean.startsWith("234")) return "Nigeria";
  }
  return "USA";
}

export async function getOutboundConfig(supabase: Supa): Promise<OutboundConfig> {
  try {
    const { data } = await supabase
      .from("platform_kv_settings")
      .select("value")
      .eq("key", OUTBOUND_CONFIG_KEY)
      .maybeSingle();
    const value = (data?.value ?? {}) as Partial<Record<OutboundRegion, Partial<OutboundChannelFlags>>>;
    return {
      USA: { ...ALL_ON, ...(value.USA ?? {}) },
      Nigeria: { ...ALL_ON, ...(value.Nigeria ?? {}) },
    };
  } catch (e) {
    console.error("[channel-guard] failed to read outbound config:", e);
    return DEFAULT_OUTBOUND_CONFIG;
  }
}

/** True when the channel is live for that region. */
export async function isOutboundEnabled(
  supabase: Supa,
  channel: OutboundChannel,
  region?: string | null,
): Promise<boolean> {
  const cfg = await getOutboundConfig(supabase);
  return cfg[normaliseOutboundRegion(region)][channel] !== false;
}

export interface PausedResult {
  paused: true;
  channel: OutboundChannel;
  region: OutboundRegion;
}

/**
 * Returns a ready-to-send 200 response when the channel is paused, else null.
 * Callers short-circuit on a non-null value.
 */
export async function outboundPausedResponse(
  supabase: Supa,
  channel: OutboundChannel,
  region: string | null | undefined,
  corsHeaders: Record<string, string>,
): Promise<Response | null> {
  const enabled = await isOutboundEnabled(supabase, channel, region);
  if (enabled) return null;
  const target = normaliseOutboundRegion(region);
  console.log(`[channel-guard] outbound ${channel} paused for ${target} — send skipped`);
  return new Response(
    JSON.stringify({
      success: false,
      paused: true,
      channel,
      region: target,
      reason: "channel_paused_by_admin",
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}
