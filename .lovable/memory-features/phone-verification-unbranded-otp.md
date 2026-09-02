---
name: Unbranded Sent OTP template for phone verification
description: Phone verification codes use Sent's unbranded Verify_Code_2 template in twilio_message_templates until the A2P 10DLC campaign is approved
type: feature
---

Phone-number verification (`notification_type: verification_code`, resolved by
`supabase/functions/_shared/message-templates.ts` against `twilio_message_templates`)
is served by the **unbranded** Sent.dm template `Verify_Code_2`:

"{{verification_code}} is your verification code. It expires in 10 minutes. Do not share this code with anyone."

Rows added (channel sms + whatsapp, key `verification_code`) on 2026-09-02.
**Why:** no brand attribution in the body prevents Sent from blocking verification
traffic while the Rentmaikar A2P 10DLC campaign is pending.
**Once A2P is approved:** replace the bodies with branded copy via the CMS
(Admin → Twilio message templates); no code change needed.
