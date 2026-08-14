import { Link } from "react-router-dom";
import { MessageSquareText } from "lucide-react";

/**
 * SMS program keywords + opt-in timing disclosures.
 *
 * Shown wherever SMS consent is collected so the A2P 10DLC reviewer can see the
 * exact keyword set and when messages start/stop after an opt-in.
 */

export const SMS_KEYWORDS: { keyword: string; meaning: string; reply: string }[] = [
  {
    keyword: "START",
    meaning: "Re-subscribe after opting out",
    reply:
      "Rentmaikar: You are re-subscribed to Rentmaikar text messages. Msg frequency varies. Msg & data rates may apply. Reply STOP to opt out, HELP for help.",
  },
  {
    keyword: "STOP",
    meaning: "Opt out of all Rentmaikar text messages",
    reply:
      "Rentmaikar: You have been unsubscribed and will receive no further messages. Reply START to re-subscribe.",
  },
  {
    keyword: "HELP",
    meaning: "Get support contact details",
    reply:
      "Rentmaikar: For help email support@rentmaikar.com or visit rentmaikar.com/contact. Msg frequency varies. Msg & data rates may apply. Reply STOP to opt out.",
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

interface SmsProgramDetailsProps {
  /** Renders without the outer card chrome when embedded in an existing panel. */
  bare?: boolean;
}

export function SmsProgramDetails({ bare = false }: SmsProgramDetailsProps) {
  const body = (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Program keywords</p>
        <ul className="space-y-2">
          {SMS_KEYWORDS.map((k) => (
            <li key={k.keyword} className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{k.keyword}</span> — {k.meaning}
              <br />
              <span className="italic">&ldquo;{k.reply}&rdquo;</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">When messages start and stop</p>
        <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
          {SMS_OPT_IN_TIMING.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>

      <p className="text-sm text-muted-foreground">
        Message frequency varies. Message and data rates may apply. Consent is not a
        condition of purchasing or using Rentmaikar services. See our{" "}
        <Link to="/terms" className="text-primary hover:underline">Terms</Link> and{" "}
        <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
        Rentmaikar does not sell, rent, or share mobile phone numbers or SMS consent
        information with third parties or affiliates for their own marketing or
        promotional purposes.
      </p>
    </div>
  );

  if (bare) return body;

  return (
    <div className="p-4 bg-muted/50 rounded-lg space-y-4" data-testid="sms-program-details">
      <div className="flex items-start gap-3">
        <MessageSquareText className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-medium text-foreground">SMS program details</p>
          <p className="text-sm text-muted-foreground">
            Keywords you can text us at any time, and exactly when messages begin after
            you opt in.
          </p>
        </div>
      </div>
      <div className="pl-8">{body}</div>
    </div>
  );
}

export default SmsProgramDetails;
