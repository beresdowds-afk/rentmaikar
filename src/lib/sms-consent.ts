import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { SMS_KEYWORDS, SMS_OPT_IN_TIMING } from "@/components/registration/sms-program";

/**
 * A2P 10DLC (Twilio / TCR) compliant SMS consent handling.
 *
 * Consent is captured with two separate, optional, unchecked-by-default
 * checkboxes (service vs. marketing), each recorded with the exact disclosure
 * text and version shown to the user so the opt-in path is auditable.
 */

export const SMS_DISCLOSURE_VERSION = "2026-08-14.v1";

/** Version of the keyword + timing program disclosure snapshot stored per consent row. */
export const SMS_PROGRAM_VERSION = "2026-08-14.program.v1";

export type SmsConsentType = "service" | "marketing";


export const SMS_SERVICE_DISCLOSURE =
  "SMS Communications (Optional): I agree to receive text messages from Rentmaikar regarding my account, vehicle rentals, applications, reservations, payments, customer support and service updates. Message frequency varies. Message and data rates may apply. Reply STOP to opt out or HELP for help. Consent is not a condition of purchasing or using Rentmaikar services. See our Terms and Privacy Policy.";

export const SMS_MARKETING_DISCLOSURE =
  "Promotional SMS (Optional): I would like to receive optional promotional text messages from Rentmaikar, including special offers, vehicle availability and rental opportunities. Message frequency varies. Message and data rates may apply. Reply STOP to opt out or HELP for help. Consent is not a condition of purchasing or using Rentmaikar services.";

export function disclosureFor(type: SmsConsentType): string {
  return type === "marketing" ? SMS_MARKETING_DISCLOSURE : SMS_SERVICE_DISCLOSURE;
}

export interface SmsConsentRecordInput {
  userId?: string | null;
  phoneNumber?: string | null;
  consentType: SmsConsentType;
  granted: boolean;
  /** Page or component the consent was captured from, e.g. "driver-registration". */
  source: string;
}

/**
 * Persists a single consent decision. Never throws — consent logging must not
 * break the surrounding registration or settings flow.
 */
export async function recordSmsConsent(input: SmsConsentRecordInput): Promise<boolean> {
  try {
    let userId = input.userId ?? null;
    if (!userId) {
      const { data } = await supabase.auth.getUser();
      userId = data.user?.id ?? null;
    }
    if (!userId) return false;

    const { error } = await supabase.from("sms_consent_records").insert({
      user_id: userId,
      phone_number: input.phoneNumber ?? null,
      consent_type: input.consentType,
      granted: input.granted,
      disclosure_version: SMS_DISCLOSURE_VERSION,
      disclosure_text: disclosureFor(input.consentType),
      source: input.source,
      program_version: SMS_PROGRAM_VERSION,
      keywords_shown: SMS_KEYWORDS as unknown as Json,
      timing_shown: SMS_OPT_IN_TIMING as unknown as Json,
      page_url: typeof window !== "undefined" ? window.location.href : null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });

    if (error) {
      console.warn("[sms-consent] failed to record consent", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[sms-consent] unexpected error", err);
    return false;
  }
}

/** Records both service and marketing decisions captured on one screen. */
export async function recordSmsConsentPair(params: {
  userId?: string | null;
  phoneNumber?: string | null;
  serviceConsent: boolean;
  marketingConsent: boolean;
  source: string;
}): Promise<void> {
  await recordSmsConsent({
    userId: params.userId,
    phoneNumber: params.phoneNumber,
    consentType: "service",
    granted: params.serviceConsent,
    source: params.source,
  });
  await recordSmsConsent({
    userId: params.userId,
    phoneNumber: params.phoneNumber,
    consentType: "marketing",
    granted: params.marketingConsent,
    source: params.source,
  });
}

export interface SmsConsentRecord {
  id: string;
  phone_number: string | null;
  consent_type: SmsConsentType;
  granted: boolean;
  disclosure_version: string;
  disclosure_text: string;
  source: string;
  created_at: string;
  program_version?: string | null;
  page_url?: string | null;
  keywords_shown?: Json | null;
  timing_shown?: Json | null;
  user_id?: string | null;
  user_agent?: string | null;
}

const AUDIT_COLUMNS =
  "id, user_id, phone_number, consent_type, granted, disclosure_version, disclosure_text, source, created_at, program_version, page_url, keywords_shown, timing_shown, user_agent";

/** Latest decision per consent type for the signed-in user. */
export async function fetchSmsConsentState(userId: string): Promise<{
  service: SmsConsentRecord | null;
  marketing: SmsConsentRecord | null;
  history: SmsConsentRecord[];
}> {
  const { data, error } = await supabase
    .from("sms_consent_records")
    .select(AUDIT_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);


  if (error || !data) return { service: null, marketing: null, history: [] };

  const history = data as unknown as SmsConsentRecord[];
  return {
    service: history.find((r) => r.consent_type === "service") ?? null,
    marketing: history.find((r) => r.consent_type === "marketing") ?? null,
    history,
  };
}
