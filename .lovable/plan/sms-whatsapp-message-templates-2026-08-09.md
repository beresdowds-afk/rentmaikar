# SMS & WhatsApp Message Templates

Auth emails are done. This does the same for SMS/WhatsApp: turn the hardcoded message text into editable, region-aware templates that admins can manage from the dashboard.

## Current state

- The template table and the admin manager UI already exist, but the table is **empty** — zero templates.
- Every outbound SMS/WhatsApp message text is currently hardcoded in a large `switch` inside the SMS sending function, so nothing an admin edits in the UI has any effect yet.

## What gets built

**1. Seed the template library**
Create one template row per notification type already supported (about 35 keys), grouped as:
- Auth: verification code, login alert, password reset, account deactivated
- Payments: reminder, received, failed, overdue, owner payout
- Negotiations: submitted, approved, rejected, counter offer, locked, modification requested/processed
- Vehicle: assigned, listed, lockdown, unlocked, shutdown, return reminder, maintenance
- Documents: verified, rejected, expiry warning
- Bookings: confirmation, cancellation
- Support: ticket created, ticket response, incident alert, accident alert
- Keyword replies: PAY, STATUS, BALANCE, DOC, HELP, STOP, START, human escalation

Each uses `{{placeholder}}` tokens (first_name, vehicle_name, amount, currency, due_date, portal_link, support_phone, etc.), stays within the 160-character SMS window where possible, and is marked for `sms`, `whatsapp`, or `both`.

**2. Region-aware variants**
Where copy differs by market, add US and Nigeria variants (US support number and USD symbol vs Nigeria support number and naira symbol, plus the localized voice/tone already used elsewhere). Everything else falls back to the global default row.

**3. Make sending actually use the templates**
The SMS/WhatsApp sending function resolves the message from the database first — matching on template key, channel, then country, then language — renders the placeholders, and only falls back to the existing hardcoded text if no active template is found. Nothing breaks if a template is missing or deactivated.

**4. Admin experience**
The existing template manager gets the seeded library, so admins can immediately search, preview with sample values, edit copy, toggle templates on/off, and add per-country variants without a code change.

## Technical notes

- Migration inserts into `public.twilio_message_templates`, idempotent via the existing unique index on (template_key, channel, country_code, language); no schema change, existing RLS and grants are unchanged.
- New shared helper `supabase/functions/_shared/message-templates.ts`: `resolveTemplate(key, channel, countryCode, lang)` using the service-role client with a short in-memory cache, plus a placeholder renderer mirroring the client-side `renderTemplate`.
- `send-sms-notification` swaps `getMessageContent()` for template resolution with the current switch kept as fallback; `sms-commands` and `whatsapp-commands` keyword replies use the same resolver.
- Affected functions redeployed after the change.

## Not included

- No new Twilio Content SIDs are registered (the `twilio_content_sid` column stays available for WhatsApp approved templates if you want that later).
- No changes to consent, opt-out, rate limiting, or send scheduling.
