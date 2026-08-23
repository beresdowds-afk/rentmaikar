# Rentmaikar — A2P 10DLC Campaign Resubmission Packet

Last updated: 2026-08-23 (v2 — refreshed after site routing and contact-page changes)

## 1. Brand / campaign basics

| Field | Value |
|---|---|
| Campaign use case | **MIXED** |
| Sub-use cases | Customer Care, Account Notification, Delivery/Service Notification |
| Website | https://www.rentmaikar.com |
| Privacy Policy URL | https://www.rentmaikar.com/privacy |
| Terms & Conditions URL | https://www.rentmaikar.com/terms |
| SMS opt-in / program page | https://www.rentmaikar.com/sms-opt-in |
| Customer support / contact page | https://www.rentmaikar.com/contact |
| Embedded links | **YES** (links to rentmaikar.com pages/receipts) |
| Embedded phone numbers | **NO** (HELP replies point to email and rentmaikar.com/contact only) |
| Age-gated content | NO |
| Direct lending / loan arrangement | NO |
| Affiliate marketing | NO |
| Number pooling | NO (unless >49 numbers) |
| Opt-in type | **Web form (digital opt-in)** |
| Help/Stop handling | Twilio Advanced Opt-Out (keywords left blank) |

## 2. Campaign description (paste as-is)

> Rentmaikar is a vehicle rental platform connecting rideshare drivers with vehicle
> owners in the United States and Nigeria. This campaign sends text messages only to
> users who created an account on rentmaikar.com and explicitly checked an optional
> SMS consent checkbox. Messages cover account and identity verification, rental
> application and approval status, vehicle pickup and inspection scheduling, payment
> reminders and receipts, agreement renewals, and customer support replies. A separate
> optional checkbox covers promotional messages about vehicle availability and offers.
> SMS consent is never a condition of creating an account, renting a vehicle, or using
> any Rentmaikar service.

## 3. Opt-in mechanism description (paste as-is)

> End users opt in on the Rentmaikar website at https://www.rentmaikar.com/auth,
> https://www.rentmaikar.com/driver/register and
> https://www.rentmaikar.com/owner/register (the legacy URLs
> /driver-registration and /owner-registration redirect to these), and on the
> standalone public opt-in page https://www.rentmaikar.com/sms-opt-in. During
> account creation and registration the user sees a dedicated "Text message (SMS)
> consent — optional" block containing two separate checkboxes, both unchecked by
> default and both independent of Terms acceptance: one for service/transactional
> SMS and one for promotional SMS. The same block embeds a collapsible "Program
> keywords & when messages are sent" panel listing the START/STOP/HELP keywords and
> the exact message-timing disclosures. Consent is not a condition of purchase or
> service. Users can also opt in or out at any time from Settings > Profile > SMS
> consent & preferences at https://www.rentmaikar.com/settings/profile. Every opt-in
> and opt-out is stored with the phone number, the exact disclosure text and version
> shown, the program keywords and timing snapshot shown, the source page, the full
> page URL, the timestamp and the user agent.

## 4. Exact on-site checkbox wording (matches production)

Header shown above both checkboxes:

> Text message (SMS) consent — optional. SMS consent is optional and is not required
> to create an account, rent a vehicle, submit an application or use Rentmaikar services.

Service SMS (optional, unchecked by default):

> I agree to receive text messages from Rentmaikar regarding my account, vehicle
> rentals, applications, reservations, payments, customer support and service
> updates. Message frequency varies. Message and data rates may apply. Reply STOP
> to opt out or HELP for help. Consent is not a condition of purchasing or using
> Rentmaikar services. See our Terms and Privacy Policy.

Promotional SMS (optional, unchecked by default):

> I would like to receive optional promotional text messages from Rentmaikar,
> including special offers, vehicle availability and rental opportunities. Message
> frequency varies. Message and data rates may apply. Reply STOP to opt out or
> HELP for help.

The identical component (same wording, same defaults) renders on `/auth`,
`/driver/register`, `/owner/register` and `/sms-opt-in`.

## 5. Sample messages (use 3–5)

1. `Rentmaikar: Your verification code is 481920. It expires in 10 minutes. Reply STOP to opt out, HELP for help.`
2. `Rentmaikar: Your driver application has been approved. Sign in at rentmaikar.com to complete your documents and pickup details. Reply STOP to opt out.`
3. `Rentmaikar: Your rental payment of $210.00 is due on Fri Aug 21. Pay at rentmaikar.com/payments. Msg&data rates may apply. Reply STOP to opt out.`
4. `Rentmaikar: Vehicle pickup confirmed for Sat Aug 22, 10:00 AM. Details: rentmaikar.com/dashboard. Reply STOP to opt out, HELP for help.`
5. `Rentmaikar: New vehicles are available in your city this week. See them at rentmaikar.com/catalogue. Reply STOP to opt out.` (promotional — sent only to promotional opt-ins)

## 6. Program keywords (published on /sms-opt-in and in the consent block)

| Keyword | Meaning | Reply |
|---|---|---|
| START | Re-subscribe after opting out | `Rentmaikar: You are re-subscribed to Rentmaikar text messages. Msg frequency varies. Msg & data rates may apply. Reply STOP to opt out, HELP for help.` |
| STOP | Opt out of all Rentmaikar text messages | `Rentmaikar: You have been unsubscribed and will receive no further messages. Reply START to re-subscribe.` |
| HELP | Get support contact details | `Rentmaikar: For help email support@rentmaikar.com or visit rentmaikar.com/contact. Msg frequency varies. Msg & data rates may apply. Reply STOP to opt out.` |

(Leave the opt-in keyword / opt-in message fields blank — opt-in is web-based. STOP/HELP/START are handled by Twilio Advanced Opt-Out.)

Every inbound keyword event (STOP / START / HELP, via SMS or WhatsApp) is also
written to the consent audit log with the raw keyword and channel, so carrier-level
opt-outs are part of the same audit trail as web-form decisions.

## 6b. Opt-in timing disclosure (published verbatim on /sms-opt-in)

- Consent takes effect immediately when you check the box and submit the form on this page.
- Verification codes are sent within seconds of you requesting one.
- Account, application, payment and rental service messages start as soon as the related event happens on your account — typically within minutes.
- Payment reminders are sent up to 72 hours before a due date, then at 12-hour intervals until the payment clears.
- Optional promotional messages, if you opted in to them, are sent no more than a few times per month.
- Messages are only sent during 9:00 AM – 9:00 PM ET (United States) or 8:00 AM – 8:00 PM WAT (Nigeria), except for security and verification codes you request.
- Opting out takes effect immediately: reply STOP, or uncheck the box in Profile Settings, and no further messages of that type are sent.

## 7. Privacy Policy / Terms language already published

Both `/privacy` and `/terms` (USA and Nigeria variants) contain an "SMS / Text Message Program" section including:

> Rentmaikar does not sell, rent, or share mobile phone numbers or SMS consent
> information with third parties or affiliates for their own marketing or promotional
> purposes.

plus message frequency, message and data rates, STOP/HELP instructions, and how to withdraw consent.

Organization contact details on `/terms`, `/privacy` and `/contact` are
region-aware: each page renders the phone number and address of the published
regional office (United States: +1 608 384 3932; Nigeria: +234 916 307 2576),
sourced live from the admin-managed published regional contact records rather than
hardcoded text. No phone numbers are embedded inside outgoing SMS message bodies.

## 8. Evidence to attach to the review

- Screenshot of the SMS consent block on `/driver/register` (both checkboxes unchecked), including the expanded "Program keywords & when messages are sent" panel.
- Screenshot of `https://www.rentmaikar.com/sms-opt-in` showing the optional form, keywords and timing.
- Screenshot of `/settings/profile` SMS consent & preferences panel with consent history and the Export CSV button.
- Screenshot of the SMS section on `/privacy` and `/terms` (USA and Nigeria tabs).
- Screenshot of `https://www.rentmaikar.com/contact` (referenced in the HELP reply).
- Admin consent audit: `/admin/sms-consent-audit` (searchable, filterable audit trail; admin-only via RLS).
- Optional: a consent-log CSV export (self-service from Profile Settings, or admin-side) with columns: `opted_at_utc, user_id, phone_number, consent_type, decision, source_page, page_url, disclosure_version, disclosure_text, program_version, keywords_shown, timing_shown, user_agent`.

## 9. Where this lives in the codebase

- Public opt-in page: `src/pages/SmsOptIn.tsx` (route `/sms-opt-in`, linked in the site footer)
- Public contact page (HELP reply target): `src/pages/Contact.tsx` (route `/contact`)
- Keywords + timing copy (single source of truth): `src/components/registration/sms-program.ts`
- Keywords + timing block UI: `src/components/registration/SmsProgramDetails.tsx`
- Disclosure text + audit writer: `src/lib/sms-consent.ts`
- Registration/signup checkboxes: `src/components/registration/SmsConsentCheckboxes.tsx`
- Profile management + history + CSV export: `src/components/profile/SmsConsentPanel.tsx`
- Admin audit UI: `src/pages/admin/AdminSmsConsentAuditPage.tsx` (route `/admin/sms-consent-audit`)
- Inbound keyword audit writer (edge): `supabase/functions/_shared/sms-consent-audit.ts`
- Region-aware published contact numbers: `src/hooks/usePublishedCompanyInfo.ts` backed by the admin-managed `platform_company_info` table
- Audit table: `public.sms_consent_records`
- Disclosure version currently in production: `2026-08-14.v1`
- Program (keywords + timing) snapshot version: `2026-08-14.program.v1`

## 10. Changelog since the previous packet (2026-08-14 → 2026-08-23)

- Registration routes renamed: `/driver-registration` → `/driver/register`, `/owner-registration` → `/owner/register` (legacy URLs redirect permanently; the same consent component and wording render on the new routes).
- Profile settings moved: `/profile-settings` → `/settings/profile` (legacy URL redirects).
- New public `/contact` page created — the URL referenced by the HELP keyword reply now resolves to a live page with region-aware phone, WhatsApp, email and SMS program help.
- Organization phone numbers on `/terms` and `/privacy` are now region-aware and sourced from the published regional contact records instead of hardcoded strings.
- Consent audit records now additionally snapshot the program version, the exact keywords/timing disclosures shown, and the full page URL at capture time; CSV export of the consent trail is available to the user and to admins.
- Inbound carrier keyword events (STOP / START / HELP) are written into the same consent audit table.
- The disclosure wording itself is unchanged — `disclosure_version` remains `2026-08-14.v1`.
