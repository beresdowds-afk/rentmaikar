# Recover and fix the recently identified issues

Four monitoring findings are open. All four are confirmed against the live database and current code.

## 1. Messaging Center can't start new threads outside the USA (high)

New conversations are created with region `NGN`, but the conversations table only accepts `USA` or `Nigeria`, so every new (non-existing-thread) send from a Nigeria-region admin fails with "Could not send the message" — including every recipient of a bulk blast.

Fix: map the region to the accepted value (`USA` / `Nigeria`) when creating the conversation, and surface the real database error text instead of the generic toast so future mismatches are visible.

## 2. Messaging Center reports success when delivery fails (medium)

When the email/SMS/WhatsApp send function returns an error, the composer still counts the recipient as sent, so a bulk blast can report "Sent to N recipients" while nothing was delivered.

Fix: distinguish "saved to thread" from "delivered". Return a delivery outcome instead of a blanket success, count provider failures in the bulk progress counters, and show a per-recipient failure list in the final summary.

## 3. WhatsApp car browsing is broken (high)

The WhatsApp bot queries `daily_rate`, `category`, `currency`, `region` and `city` from the vehicles table; none of those columns exist, so the CARS list, list-selection and vehicle-detail replies all fail with a Postgres error.

Fix: rebuild those three queries against columns that exist (make, model, year, pickup_city, status, photo_urls) and derive pricing the same way the web app does:
- year + region to tier via the category-year specs table
- tier + region to price/currency via the category price table

Region is derived from the vehicle's pickup city / owner profile, falling back to the messaging region. Vehicles with no resolvable tier show "Price on request" rather than erroring.

## 4. Nigerian SMS OTP failing — Termii sender ID rejected (high)

Termii rejects the deployed sender ID with `SENDER_ID_NOT_APPROVED`, so +234 phone sign-in codes never arrive. The same sender ID is used by referee notifications, expiry notifications and VoIP.

Fix: move the sender ID to a single shared resolver with an approved default, and update the stored secret to the approved value. I need you to confirm which sender ID Termii has actually approved for the workspace (e.g. `Rentmaikar`) — I'll ask before changing the secret.

## Technical notes

- Files: `src/hooks/useMessageComposer.ts`, `src/components/admin/MessageComposer.tsx`, `supabase/functions/whatsapp-commands/index.ts`, `supabase/functions/_shared/sms-config.ts`, `supabase/functions/phone-otp-custom/index.ts`.
- No schema migration needed: pricing tables (`vehicle_category_prices`, `vehicle_category_year_specs`) are already populated for USA and Nigeria.
- `whatsapp-commands` and `phone-otp-custom` get redeployed after the edits.
- Verification: build + typecheck, a Nigeria-region compose dry run, and a WhatsApp CARS command against the live function.
