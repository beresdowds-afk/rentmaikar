import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router-dom";
import { Smartphone } from "lucide-react";

interface SmsConsentCheckboxesProps {
  smsServiceConsent: boolean;
  smsMarketingConsent: boolean;
  onSmsServiceConsentChange: (value: boolean) => void;
  onSmsMarketingConsentChange: (value: boolean) => void;
}

/**
 * A2P 10DLC compliant SMS opt-in.
 *
 * Both checkboxes are optional, unchecked by default, separate from Terms
 * acceptance and separate from each other. Consent is never a condition of
 * creating an account, renting a vehicle or using Rentmaikar services.
 */
export function SmsConsentCheckboxes({
  smsServiceConsent,
  smsMarketingConsent,
  onSmsServiceConsentChange,
  onSmsMarketingConsentChange,
}: SmsConsentCheckboxesProps) {
  return (
    <div className="p-4 bg-muted/50 rounded-lg space-y-4" data-testid="sms-consent-block">
      <div className="flex items-start gap-3">
        <Smartphone className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-medium text-foreground">Text message (SMS) consent — optional</p>
          <p className="text-sm text-muted-foreground">
            SMS consent is optional and is not required to create an account, rent a
            vehicle, submit an application or use Rentmaikar services.
          </p>
        </div>
      </div>

      <div className="flex items-start space-x-3 pl-8">
        <Checkbox
          id="smsServiceConsent"
          checked={smsServiceConsent}
          onCheckedChange={(checked) => onSmsServiceConsentChange(checked as boolean)}
        />
        <label htmlFor="smsServiceConsent" className="text-sm text-foreground cursor-pointer leading-relaxed">
          I agree to receive text messages from Rentmaikar regarding my account, vehicle
          rentals, applications, reservations, payments, customer support and service
          updates. Message frequency varies. Message and data rates may apply. Reply STOP
          to opt out or HELP for help. Consent is not a condition of purchasing or using
          Rentmaikar services. See our{" "}
          <Link to="/terms" className="text-primary hover:underline" target="_blank">
            Terms
          </Link>{" "}
          and{" "}
          <Link to="/privacy" className="text-primary hover:underline" target="_blank">
            Privacy Policy
          </Link>
          .
        </label>
      </div>

      <div className="flex items-start space-x-3 pl-8">
        <Checkbox
          id="smsMarketingConsent"
          checked={smsMarketingConsent}
          onCheckedChange={(checked) => onSmsMarketingConsentChange(checked as boolean)}
        />
        <label htmlFor="smsMarketingConsent" className="text-sm text-foreground cursor-pointer leading-relaxed">
          I would like to receive optional promotional text messages from Rentmaikar,
          including special offers, vehicle availability and rental opportunities. Message
          frequency varies. Message and data rates may apply. Reply STOP to opt out or
          HELP for help.
        </label>
      </div>
    </div>
  );
}

export default SmsConsentCheckboxes;
