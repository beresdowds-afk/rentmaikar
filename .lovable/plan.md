## Scope

Four related additions across the platform. All region-aware via `RegionContext`.

---

### 1. Meta Pixel integration

- Add Meta Pixel base script to `index.html` (loaded async, uses `VITE_META_PIXEL_ID`).
- Include `<noscript><img/></noscript>` fallback in `<body>` (per HTML rules).
- Create `src/lib/meta-pixel.ts` helper exporting `trackEvent(name, params)` and `trackPageView()`.
- Wire `trackPageView()` into the router (listen to route changes in `App.tsx`).
- Fire standard events at key moments: `Lead` (registration start), `CompleteRegistration`, `SubmitApplication`, `Purchase` (payment success), `Contact` (support open).
- Consent-aware: gated by existing `rentmaikar_message_consent` / cookie consent — no pixel until user consents.
- Ask user to add `VITE_META_PIXEL_ID` (build-time public var, safe in codebase once provided). For now, script no-ops when the ID is missing.

### 2. TRACCAR alternative to EMQX

Prep only — do not remove EMQX. Add a switchable telemetry backend.

- New table `telemetry_providers` (id, name enum: `emqx`|`traccar`, is_active, base_url, api_key_secret_name, region_scope, priority).
- Migration seeds current EMQX as active default.
- New shared module `supabase/functions/_shared/telemetry-client.ts` with `getActiveProvider()` and adapters `emqxAdapter` / `traccarAdapter` exposing a common interface: `publish`, `subscribeStatus`, `getDeviceState`, `sendCommand`.
- Traccar adapter uses REST API (`/api/positions`, `/api/commands/send`, `/api/devices`) — reads `TRACCAR_BASE_URL` + `TRACCAR_API_TOKEN` secrets (added via `add_secret` when user is ready to activate).
- Update `iot_devices` table: add `provider` column (default `emqx`).
- Admin UI: new "Telemetry Providers" card in IoT settings to toggle active provider and set per-region priority.
- Existing edge functions (`emqx-monitoring`, MQTT publishers) call `telemetry-client` instead of hitting EMQX directly. Behavior unchanged while EMQX remains active.

### 3. PayPal (USA default) and Opay (NG default) as default PSPs

- Extend `region_definitions.payment_gateways` semantics: first array item = default PSP.
- Migration: update USA row → `payment_gateways = ['paypal', ...existing]`; NG row → `payment_gateways = ['opay', ...existing]`.
- New `src/lib/payment-providers.ts`: `getDefaultPSP(country)` reads from `RegionContext.regionDefinition.payment_gateways[0]`, with fallback map (`US→paypal`, `NG→opay`, `GH→paystack`, default → `paypal`).
- Checkout components (`PaymentMethodSelector`, `RentalCheckout`, `SubscriptionCheckout`) call `getDefaultPSP()` to pre-select provider, but still show other options if configured.
- Edge functions:
  - `supabase/functions/create-paypal-order/index.ts` — creates PayPal order (uses `PAYPAL_CLIENT_ID` + `PAYPAL_SECRET`, requested via `add_secret`).
  - `supabase/functions/create-opay-payment/index.ts` — creates Opay checkout session (uses `OPAY_PUBLIC_KEY`, `OPAY_SECRET_KEY`, `OPAY_MERCHANT_ID`, requested via `add_secret`).
  - Both write to `payments` table with `provider` field.
- Admin `RegionAutoBuildWorker` default-provider dropdown updated to show PayPal/Opay first.

### 4. Persona identity verification + automated referee verification

**Persona as primary KYC**

- Add `persona_inquiries` table: `id, user_id, subject_type (self|referee), subject_ref (referee_id), inquiry_id, template_id, status (created|pending|approved|declined|needs_review), verified_at, mismatch_fields jsonb, raw_payload jsonb`.
- Edge function `persona-create-inquiry`: server-side creates an inquiry using `PERSONA_API_KEY` + `PERSONA_TEMPLATE_ID` (requested via `add_secret`), returns hosted-flow URL + inquiry id. Region-aware template selection (`PERSONA_TEMPLATE_ID_US`, `_NG`).
- Edge function `persona-webhook` (public, HMAC-verified with `PERSONA_WEBHOOK_SECRET`): updates `persona_inquiries.status` and triggers referee reconciliation.
- Client component `src/components/verification/PersonaVerification.tsx`: opens Persona hosted flow, polls status. Replaces existing KYC entrypoints in registration + document verification screens (feature-flagged; existing flows remain until Persona keys are configured).

**Referee verification (new)**

- Applications already collect referees. Add table `referee_verifications` (`id, application_id, referee_index, full_name, phone, email, id_type, id_number, persona_inquiry_id, status, mismatch_reason, verified_at`).
- On application submit (or admin trigger), edge function `verify-referees` iterates each referee and creates a Persona inquiry using the credentials the user submitted for that referee (name, DOB, ID number, phone). Uses Persona's "government ID + selfie" template for full check, or "database" template for name/phone/ID cross-check when no selfie possible.
- Persona webhook updates `referee_verifications.status`. On `declined` or field mismatch:
  - Insert row into `expiry_notifications` / trigger `send-inbox-message` edge function to notify the user via inbox + email + SMS (Twilio for US, Termii for NG — via RegionContext).
  - Message: "Referee #N could not be verified: <reason>. Please update your referee details."
  - Mark `applications.referees_verification_status = 'action_required'`.
- Admin UI: new "Referee Verification" panel in the application review screen shows per-referee status, mismatches, and a "Re-run verification" button.
- User UI: `RefereeSection` in profile shows verification badge per referee and inline edit form when action required.

---

## Secrets to request (in order, after confirmation)

1. `VITE_META_PIXEL_ID` (build-time; add via Workspace → Build Secrets, OR paste value to hardcode as public config).
2. `PAYPAL_CLIENT_ID`, `PAYPAL_SECRET`, `PAYPAL_MODE` (`sandbox`/`live`).
3. `OPAY_PUBLIC_KEY`, `OPAY_SECRET_KEY`, `OPAY_MERCHANT_ID`.
4. `PERSONA_API_KEY`, `PERSONA_TEMPLATE_ID_US`, `PERSONA_TEMPLATE_ID_NG`, `PERSONA_WEBHOOK_SECRET`.
5. (Later, when activating) `TRACCAR_BASE_URL`, `TRACCAR_API_TOKEN`.

All edge functions will fail gracefully with a clear "provider not configured" response if secrets are missing, so the UI can be shipped before keys arrive.

---

## Technical notes

- All new tables include `GRANT`s per public-schema rule and RLS policies scoped to `auth.uid()` / `has_role(_,'admin')`.
- Region context drives: default PSP, Persona template, referee-notification channel, Meta Pixel event locale.
- New tests: `src/lib/__tests__/payment-providers.test.ts`, `src/lib/__tests__/meta-pixel.test.ts`, `supabase/functions/_shared/telemetry-client.test.ts` (adapter contract), referee-verification unit test.
- No breaking changes to existing checkout, IoT, or KYC flows — new paths are additive and feature-flagged on secret presence.

---

## Deliverables checklist

- [ ] Meta Pixel: index.html, `meta-pixel.ts`, route + event hooks
- [ ] Telemetry: migration, adapters, `telemetry-client`, admin toggle
- [ ] PSPs: migration, `payment-providers.ts`, PayPal + Opay edge functions, checkout wiring
- [ ] Persona: migration, `persona-create-inquiry` + `persona-webhook` functions, client component, KYC wiring
- [ ] Referee verification: migration, `verify-referees` function, notification hook, admin + user UI
- [ ] Tests for each area
- [ ] Request secrets in follow-up messages as each block is ready
