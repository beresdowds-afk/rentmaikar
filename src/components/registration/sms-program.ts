/**
 * SMS program keyword + opt-in timing disclosures (A2P 10DLC).
 *
 * Kept in a component-free module so both UI and the consent audit logger can
 * snapshot the exact wording that was shown to the user.
 */

// Replies must match the A2P 10DLC campaign submission verbatim.
export const SMS_KEYWORDS: { keyword: string; meaning: string; reply: string }[] = [
  {
    keyword: "START",
    meaning: "Re-subscribe after opting out",
    reply:
      "Rentmaikar: You're re-subscribed to SMS notifications. Reply HELP for commands or STOP to opt out again.",
  },
  {
    keyword: "STOP, STOPALL, OPTOUT, CANCEL, END, QUIT, UNSUBSCRIBE, REVOKE",
    meaning: "Opt out of all Rentmaikar text messages",
    reply:
      "You have successfully been unsubscribed. You will not receive any more messages from this number. Reply START to resubscribe.",
  },
  {
    keyword: "HELP, INFO",
    meaning: "Get help and opt-out information",
    reply: "Reply STOP to unsubscribe. Msg&Data Rates May Apply.",
  },
];

export const SMS_OPT_IN_TIMING: string[] = [
  "Consent takes effect immediately when you check the box and submit the form on this page.",
  "Verification codes are sent within seconds of you requesting one.",
  "Account, application, payment and rental service messages start as soon as the related event happens on your account — typically within minutes.",
  "Payment reminders are sent up to 72 hours before a due date, then at 12-hour intervals until the payment clears.",
  "Optional promotional messages, if you opted in to them, are sent no more than a few times per month.",
  "Messages are only sent during 9:00 AM – 9:00 PM ET (United States) or 8:00 AM – 8:00 PM WAT (Nigeria), except for security and verification codes you request.",
  "Opting out takes effect immediately: reply STOP, or uncheck the box in Profile Settings, and no further messages of that type are sent.",
];
