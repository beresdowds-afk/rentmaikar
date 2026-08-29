/**
 * Twilio is approved for VoIP voice calls ONLY — SMS/WhatsApp messaging is not
 * approved. All messaging must route via Sent.dm (Termii for Nigeria).
 *
 * Call this before any Twilio Messages API request. Throws unless
 * TWILIO_MESSAGING_ENABLED=true is explicitly set.
 */
export function assertTwilioMessagingEnabled(): void {
  const enabled =
    (Deno.env.get("TWILIO_MESSAGING_ENABLED") ?? "false").toLowerCase() === "true";
  if (!enabled) {
    throw new Error(
      "Twilio messaging is disabled (voice-only approval). Route SMS/WhatsApp via Sent.dm instead.",
    );
  }
}

/** Non-throwing variant for paths that should skip instead of failing. */
export function twilioMessagingEnabled(): boolean {
  return (Deno.env.get("TWILIO_MESSAGING_ENABLED") ?? "false").toLowerCase() === "true";
}
