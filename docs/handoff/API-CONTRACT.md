# Rentmaikar API Contract

Generated 2026-09-03. Authoritative description of every server-side endpoint the backend team takes ownership of: the Express API gateway and all 160 Supabase Edge Functions.

## 1. Hosts

| Role | Host |
| --- | --- |
| Frontend (browser app) | `https://rentmaikar.com`, `https://www.rentmaikar.com` |
| Backend API gateway | `https://staging.rentmaikar.com` |
| Edge function base | `https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1` |
| Inbound mail domain | `backend.rentmaikar.com` |
| Outbound mail domain | `notify.rentmaikar.com` |

## 2. Authentication modes

| Mode | Transport | Used by |
| --- | --- | --- |
| Supabase user JWT | `Authorization: Bearer <access_token>` | All user-facing endpoints; validated in-code because platform `verify_jwt` is disabled for most functions |
| Service role | `SUPABASE_SERVICE_ROLE_KEY` (server-only) | Functions that bypass RLS for admin/system writes |
| Cron token | `CRON_SECRET` in header/body, checked via `verify_cron_token` | pg_cron-triggered workers |
| Provider signature | Provider-specific HMAC header (Sent, Resend, Termii, Persona, Paystack, PayPal, OPay, Twilio) | Inbound webhooks; raw body required |
| Public | none | Config probes (`get-psp-config`, `get-vapid-public-key`), tracking pixels, IVR TwiML |

Every function answers `OPTIONS` with shared CORS headers and accepts `POST` with a JSON body unless noted.

## 3. API gateway (Express)

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/health` | public | Liveness: status, service, version, uptime, environment |
| GET | `/api/health/diagnostics` | public | Configured-provider matrix (CPaaS, payments, IoT) and domain topology; booleans only, never values |
| GET | `/api/domains` | public | Active domain topology (frontend, backend, inbound/outbound mail) |
| POST | `/api/cpaas/send` | JWT | Send an SMS/WhatsApp/RCS message via Sent.dm with Twilio/Termii fallback |
| POST | `/api/webhooks/sent` | Sent HMAC | Inbound Sent.dm messages |
| POST | `/api/webhooks/sent/status` | Sent HMAC | Sent.dm delivery-status callbacks |
| POST | `/api/webhooks/twilio` | Twilio signature | Twilio voice/status callbacks |
| POST | `/api/webhooks/termii` | Termii secret | Termii delivery callbacks |

Webhook routes are mounted before `express.json()` and receive the raw body so signatures verify correctly. CORS is restricted to `ALLOWED_ORIGINS` (defaults to the two frontend origins).

## 4. Edge functions

Invoke as `POST {base}/{function-name}` where base is the edge function base above, or via `supabase.functions.invoke()` from the frontend. `Secrets read` lists the environment variables each function requires at runtime.

### Auth, Identity & Verification

#### `admin-create-user`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/admin-create-user`
- Auth: platform default; in-code JWT check; service-role DB access
- Secrets read: `SITE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`

#### `admin-delete-users`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/admin-delete-users`
- Auth: platform default; in-code JWT check; service-role DB access
- Secrets read: `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/cors.ts`

#### `admin-set-user-active`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/admin-set-user-active`
- Auth: platform default; in-code JWT check; service-role DB access
- Secrets read: `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `TEST_ADMIN_JWT`, `TEST_USER_A_ID`, `TEST_USER_B_ID`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL`

#### `auth-email-hook`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/auth-email-hook`
- Auth: public edge (verify_jwt=false); provider signature; in-code JWT check; service-role DB access
- Secrets read: `LOVABLE_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`

#### `export-user-documents`

Server-side document export. Builds a ZIP of all documents for a target user (optionally scoped to a vehicle), uploads it to the private `document-exports` bucket, records the export in `document_export_audit`, and returns a short-lived signed URL for download. Authorization: - Signed-in users may export ONLY their...

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/export-user-documents`
- Auth: platform default; in-code JWT check; service-role DB access
- Secrets read: `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/cors.ts`, `_shared/rate-limit.ts`

#### `generate-api-key`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/generate-api-key`
- Auth: public edge (verify_jwt=false); in-code JWT check; service-role DB access
- Secrets read: `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`

#### `notify-referees`

Sends confidential attestation invitations to every referee on an application, via Email + SMS + WhatsApp. Hardened with: - Idempotency: repeated calls within IDEMPOTENCY_WINDOW_MIN reuse the last successful send per (application_id, referee_id, channel) and return the cached delivery results without re-sending. -...

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/notify-referees`
- Auth: platform default; in-code JWT check; service-role DB access
- Secrets read: `LOVABLE_API_KEY`, `PUBLIC_APP_URL`, `RESEND_API_KEY`, `RESEND_FALLBACK_FROM`, `RESEND_SENDING_DOMAIN`, `SB_FUNCTION_NAME`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `TERMII_API_KEY`, `TERMII_SENDER_ID`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `TWILIO_WHATSAPP_FROM`
- Shared modules: `_shared/cors.ts`, `_shared/opt-out.ts`, `_shared/pipeline-events.ts`, `_shared/resend-gateway.ts`, `_shared/twilio-messaging-guard.ts`

#### `phone-otp-custom`

Custom phone OTP sign-up / sign-in. SMS is delivered via Termii for Nigerian numbers (+234) and Twilio elsewhere. The verify step returns a one-time `token_hash` the browser exchanges for a real Supabase session — no password is created or overwritten.

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/phone-otp-custom`
- Auth: public edge (verify_jwt=false); in-code JWT check; service-role DB access
- Secrets read: `LOVABLE_API_KEY`, `SENT_API_BASE_URL`, `SENT_API_KEY`, `SENT_CHANNELS`, `SENT_ENABLED`, `SENT_SANDBOX_MODE`, `SENT_SENDER_ID`, `SENT_SMS_NUMBER`, `SENT_WHATSAPP_NUMBER`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `TERMII_API_KEY`, `TERMII_SENDER_ID`, `TWILIO_API_KEY`, `TWILIO_FROM`, `TWILIO_MESSAGING_SERVICE_SID`, `TWILIO_PHONE_NUMBER`, `TWILIO_WHATSAPP_NUMBER`
- Shared modules: `_shared/sent-client.ts`, `_shared/twilio-messaging-guard.ts`

#### `proxy-consent-manager`

Driver-facing proxy billing manager. Actions: create, resend, mark_identity (admin), tokenize_card (proxy) Security: rate-limit per identifier+action, idempotency table, masked card storage

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/proxy-consent-manager`
- Auth: platform default; in-code JWT check; service-role DB access
- Secrets read: `APP_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/cors.ts`, `_shared/rate-limit.ts`

#### `referee-attestation`

Public endpoint. GET: returns minimal context for the attestation page from a token. POST: records the referee's attested response and, on negative, notifies admins and admin assistants for manual review. verify_jwt is off; auth is by opaque token.

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/referee-attestation` (also handles GET, OPTIONS)
- Auth: public edge (verify_jwt=false); service-role DB access
- Secrets read: `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/cors.ts`

#### `refresh-export-download-url`

Returns a fresh 1-hour signed URL for an existing ZIP in `document-exports`. Used by the client to auto-recover when a previous URL has expired. Rate-limited (20/min) since it's cheap but must not be exploitable to enumerate paths.

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/refresh-export-download-url`
- Auth: platform default; in-code JWT check; service-role DB access
- Secrets read: `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/cors.ts`, `_shared/rate-limit.ts`

#### `send-2fa-code`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/send-2fa-code`
- Auth: public edge (verify_jwt=false); in-code JWT check; service-role DB access
- Secrets read: `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/rate-limit.ts`

#### `send-password-reset`

Self-service password reset that does NOT depend on Supabase's built-in auth mailer. It mints a recovery link with the service role and delivers it through our own branded Resend pipeline (send-outbound-email), which is the same path every other transactional email uses. Always responds `{ ok: true }` so it can...

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/send-password-reset`
- Auth: platform default; in-code JWT check; service-role DB access
- Secrets read: `SITE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/email-idempotency.ts`

#### `send-verification-email`

Sends a branded email-verification link through Resend (via send-outbound-email). Auth: caller must present their own JWT; the link is always minted for that user's own email address, so it cannot be used to spam arbitrary inboxes.

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/send-verification-email`
- Auth: platform default; in-code JWT check; service-role DB access
- Secrets read: `SITE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/cors.ts`, `_shared/email-idempotency.ts`

#### `sync-auth-identity`

Syncs auth-layer identity (email / phone) into public.profiles. Direct triggers on the `auth` schema are not permitted, so this function is the UPDATE-side counterpart to the on_auth_user_created INSERT trigger. It is caller-scoped: the JWT identifies the user, and only that user's profile row is touched. Admins...

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/sync-auth-identity`
- Auth: platform default; in-code JWT check; service-role DB access
- Secrets read: `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/cors.ts`

#### `verify-credentials`

Live credential verification for every third-party provider the platform depends on. Admins call this straight after saving a secret so they get an immediate pass/fail instead of discovering a bad key when a job runs. Every check performs a real, read-only API call with the stored credentials. Nothing sensitive is...

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/verify-credentials`
- Auth: platform default; in-code JWT check
- Secrets read: `HOLOGRAM_API_KEY`, `HOLOGRAM_ORG_ID`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENV`, `PAYPAL_MODE`, `SAREKON_BASE_URL`, `SAREKON_PASSWORD`, `SAREKON_USERNAME`, `SAREKON_USER_ID`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `TRACCAR_API_TOKEN`, `TRACCAR_BASE_URL`, `TRACCAR_EMAIL`, `TRACCAR_PASSWORD`, `TRACCAR_TOKEN`
- Shared modules: `_shared/admin-auth.ts`, `_shared/cors.ts`, `_shared/emqx-client.ts`, `_shared/hologram-client.ts`, `_shared/paypal-client.ts`, `_shared/sarekon-client.ts`, `_shared/traccar-client.ts`

#### `verify-phone`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/verify-phone`
- Auth: public edge (verify_jwt=false); in-code JWT check; service-role DB access
- Secrets read: `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `TWILIO_VOICE_FROM`
- Shared modules: `_shared/rate-limit.ts`

#### `verify-referees`

Verifies every referee on an application through Persona, using the credentials the driver submitted for that referee. Creates one Persona inquiry per referee and stores the linkage in referee_verifications. Called on application submit and from the admin re-run action.

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/verify-referees`
- Auth: platform default; in-code JWT check; service-role DB access
- Secrets read: `PERSONA_API_KEY`, `PERSONA_MASTER_TEMPLATE_ID`, `PERSONA_TEMPLATE_ID`, `PERSONA_TEMPLATE_ID_NG`, `PERSONA_TEMPLATE_ID_US`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/cors.ts`, `_shared/pipeline-events.ts`


### Persona KYC

#### `persona-config`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/persona-config` (also handles GET, OPTIONS, PUT)
- Auth: platform default; in-code JWT check; service-role DB access
- Secrets read: `PERSONA_ENVIRONMENT_ID`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/cors.ts`, `_shared/persona-templates.ts`

#### `persona-create-inquiry`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/persona-create-inquiry`
- Auth: platform default; in-code JWT check; service-role DB access
- Secrets read: `PERSONA_API_KEY`, `PERSONA_ENVIRONMENT_ID`, `PERSONA_MASTER_TEMPLATE_ID`, `PERSONA_TEMPLATE_ID`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/cors.ts`, `_shared/government-id.ts`, `_shared/persona-templates.ts`

#### `persona-expiry-scan`

Daily: for user documents expiring in <=14 days, queue Persona re-verification.

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/persona-expiry-scan`
- Auth: platform default; cron token; service-role DB access
- Schedule: pg_cron `0 7 * * *`
- Secrets read: `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/cors.ts`

#### `persona-provision-template`

Clones the master Persona inquiry template for a region's country code. Admin-only. Idempotent — safe to re-run.

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/persona-provision-template`
- Auth: platform default; in-code JWT check; service-role DB access
- Secrets read: `PERSONA_API_KEY`, `PERSONA_ENVIRONMENT_ID`, `PERSONA_MASTER_TEMPLATE_ID`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/cors.ts`

#### `persona-reconcile`

Reconciliation worker — recovers from missed / failed Persona webhooks. Polls Persona for every inquiry that is still non-terminal (or was recently updated) and re-applies the authoritative status to our database. Safe to run on a schedule (pg_cron) and idempotent: identical statuses are no-ops.

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/persona-reconcile`
- Auth: platform default; in-code JWT check; service-role DB access
- Schedule: pg_cron `*/15 * * * *`
- Secrets read: `CRON_SECRET`, `PERSONA_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/cors.ts`, `_shared/guard.ts`

#### `persona-retry-verification`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/persona-retry-verification`
- Auth: platform default; in-code JWT check; service-role DB access
- Secrets read: `PERSONA_API_KEY`, `PERSONA_ENVIRONMENT_ID`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/cors.ts`, `_shared/government-id.ts`, `_shared/persona-templates.ts`

#### `persona-send-reverification`

Admin-triggered re-verification: creates a fresh Persona inquiry and emails/SMS the hosted link.

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/persona-send-reverification`
- Auth: platform default; in-code JWT check; service-role DB access
- Secrets read: `PERSONA_API_KEY`, `PERSONA_ENVIRONMENT_ID`, `PERSONA_TEMPLATE_ID`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/cors.ts`, `_shared/persona-templates.ts`

#### `persona-webhook`

Public webhook — signature-verified with PERSONA_WEBHOOK_SECRET.

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/persona-webhook`
- Auth: platform default; provider signature; service-role DB access
- Secrets read: `APP_URL`, `PERSONA_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/cors.ts`


### Payments & Payouts

#### `activate-subscription`

Verifies a subscription payment with the PSP and activates the subscription. Auth required. User can only activate their own subscription.

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/activate-subscription`
- Auth: platform default; in-code JWT check; service-role DB access
- Secrets read: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_MODE`, `PAYSTACK_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/cors.ts`

#### `billing-portal`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/billing-portal`
- Auth: public edge (verify_jwt=false); cron token; in-code JWT check; service-role DB access
- Secrets read: `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/cors.ts`

#### `capture-paypal-order`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/capture-paypal-order`
- Auth: platform default; service-role DB access
- Secrets read: `CRON_SECRET`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENV`, `PAYPAL_MODE`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/auth-guards.ts`, `_shared/cors.ts`, `_shared/payment-status-sync.ts`, `_shared/paypal-client.ts`

#### `create-opay-order`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/create-opay-order`
- Auth: platform default; in-code JWT check; service-role DB access
- Secrets read: `OPAY_ENV`, `OPAY_ENVIRONMENT`, `OPAY_MERCHANT_ID`, `OPAY_PUBLIC_KEY`, `OPAY_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/cors.ts`, `_shared/opay-client.ts`, `_shared/resolve-payment-context.ts`

#### `create-paypal-order`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/create-paypal-order`
- Auth: platform default; service-role DB access
- Secrets read: `APP_URL`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENV`, `PAYPAL_MODE`, `PUBLIC_APP_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/app-url.ts`, `_shared/auth-guards.ts`, `_shared/cors.ts`, `_shared/payment-idempotency.ts`, `_shared/paypal-client.ts`, `_shared/resolve-payment-context.ts`

#### `create-paystack-recipient`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/create-paystack-recipient`
- Auth: platform default; in-code JWT check; service-role DB access
- Secrets read: `PAYSTACK_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/cors.ts`

#### `create-paystack-transaction`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/create-paystack-transaction`
- Auth: platform default; in-code JWT check; service-role DB access
- Secrets read: `PAYSTACK_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/cors.ts`, `_shared/payment-idempotency.ts`, `_shared/resolve-payment-context.ts`

#### `get-paypal-config`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/get-paypal-config`
- Auth: platform default
- Secrets read: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENV`, `PAYPAL_MODE`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/auth-guards.ts`, `_shared/cors.ts`, `_shared/paypal-client.ts`

#### `get-psp-config`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/get-psp-config`
- Auth: platform default
- Secrets read: `OPAY_ENV`, `OPAY_ENVIRONMENT`, `OPAY_MERCHANT_ID`, `OPAY_PUBLIC_KEY`, `OPAY_SECRET_KEY`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENV`, `PAYPAL_MODE`, `PAYPAL_WEBHOOK_ID`, `PAYSTACK_PUBLIC_KEY`, `PAYSTACK_SECRET_KEY`
- Shared modules: `_shared/cors.ts`, `_shared/opay-client.ts`, `_shared/paypal-client.ts`

#### `initiate-paypal-payout`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/initiate-paypal-payout`
- Auth: platform default; in-code JWT check; service-role DB access
- Secrets read: `CRON_SECRET`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENV`, `PAYPAL_MODE`, `PUBLIC_APP_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/cors.ts`, `_shared/payment-idempotency.ts`, `_shared/paypal-client.ts`, `_shared/verified-phone.ts`, `_shared/wallet-ledger.ts`, `_shared/withdrawal-authorization.ts`, `_shared/withdrawal-notify.ts`

#### `initiate-paystack-transfer`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/initiate-paystack-transfer`
- Auth: platform default; in-code JWT check; service-role DB access
- Secrets read: `CRON_SECRET`, `PAYSTACK_SECRET_KEY`, `PUBLIC_APP_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/cors.ts`, `_shared/payment-idempotency.ts`, `_shared/verified-phone.ts`, `_shared/wallet-ledger.ts`, `_shared/withdrawal-authorization.ts`, `_shared/withdrawal-notify.ts`

#### `opay-webhook`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/opay-webhook`
- Auth: platform default; provider signature; cron token; service-role DB access
- Secrets read: `CRON_SECRET`, `OPAY_ENV`, `OPAY_ENVIRONMENT`, `OPAY_MERCHANT_ID`, `OPAY_PUBLIC_KEY`, `OPAY_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/cors.ts`, `_shared/opay-client.ts`, `_shared/wallet-ledger.ts`, `_shared/webhook-idempotency.ts`, `_shared/webhook-logger.ts`

#### `paypal-webhook`

PayPal webhook — verifies via PayPal /v1/notifications/verify-webhook-signature, updates payments/paypal_transactions, marks linked invoice paid (via DB trigger), and asynchronously fires the receipt email via billing-portal. Hardened for duplicate-delivery idempotency via payment_webhook_events unique index.

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/paypal-webhook`
- Auth: public edge (verify_jwt=false); provider signature; cron token; service-role DB access
- Secrets read: `CRON_SECRET`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENV`, `PAYPAL_MODE`, `PAYPAL_WEBHOOK_ID`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/cors.ts`, `_shared/paypal-client.ts`, `_shared/wallet-ledger.ts`, `_shared/webhook-idempotency.ts`, `_shared/webhook-logger.ts`

#### `paystack-webhook`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/paystack-webhook`
- Auth: platform default; provider signature; cron token; service-role DB access
- Secrets read: `CRON_SECRET`, `OPAY_SECRET_KEY`, `PAYSTACK_SECRET_KEY`, `PUBLIC_APP_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL`
- Shared modules: `_shared/cors.ts`, `_shared/timing-safe.ts`, `_shared/wallet-ledger.ts`, `_shared/webhook-idempotency.ts`, `_shared/webhook-logger.ts`, `_shared/withdrawal-notify.ts`

#### `process-daily-debits`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/process-daily-debits`
- Auth: public edge (verify_jwt=false); in-code JWT check; service-role DB access
- Schedule: pg_cron `1 0 * * *`
- Secrets read: `CRON_SECRET`, `LOVABLE_API_KEY`, `RESEND_API_KEY`, `RESEND_FALLBACK_FROM`, `RESEND_SENDING_DOMAIN`, `SB_FUNCTION_NAME`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/cron-auth.ts`, `_shared/resend-gateway.ts`

#### `process-owner-payouts`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/process-owner-payouts`
- Auth: public edge (verify_jwt=false); in-code JWT check; service-role DB access
- Schedule: pg_cron `0 9 * * 5`
- Secrets read: `CRON_SECRET`, `LOVABLE_API_KEY`, `RESEND_API_KEY`, `RESEND_FALLBACK_FROM`, `RESEND_SENDING_DOMAIN`, `SB_FUNCTION_NAME`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/cron-auth.ts`, `_shared/resend-gateway.ts`

#### `process-payment-defaults`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/process-payment-defaults`
- Auth: public edge (verify_jwt=false); in-code JWT check; service-role DB access
- Schedule: pg_cron `0 */6 * * *`, `0 * * * *`
- Secrets read: `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `TERMII_API_KEY`, `TERMII_SENDER_ID`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- Shared modules: `_shared/cron-auth.ts`

#### `process-payment-unlock`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/process-payment-unlock`
- Auth: public edge (verify_jwt=false); service-role DB access
- Schedule: pg_cron `*/10 * * * *`
- Secrets read: `CRON_SECRET`, `LOVABLE_API_KEY`, `RESEND_API_KEY`, `RESEND_FALLBACK_FROM`, `RESEND_SENDING_DOMAIN`, `SB_FUNCTION_NAME`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- Shared modules: `_shared/cron-auth.ts`, `_shared/email-templates.ts`, `_shared/opt-out.ts`, `_shared/resend-gateway.ts`, `_shared/twilio-messaging-guard.ts`, `_shared/whatsapp-templates.ts`

#### `provider-billing-sync`

Pulls third-party billing data (Hologram today; Traccar/EMQX/others recorded as scheduled subscription charges from their billing account config) into public.provider_billing_events so provider costs can be reconciled against platform revenue independently of the providers' own dashboards. Invoked by admins from...

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/provider-billing-sync`
- Auth: platform default; cron token; in-code JWT check; service-role DB access
- Schedule: pg_cron `20 2 * * *`
- Secrets read: `CRON_SECRET`, `HOLOGRAM_API_KEY`, `HOLOGRAM_ORG_ID`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/cors.ts`, `_shared/hologram-client.ts`

#### `reconcile-payments`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/reconcile-payments`
- Auth: platform default; provider signature; cron token; in-code JWT check; service-role DB access
- Schedule: pg_cron `*/15 * * * *`
- Secrets read: `CRON_SECRET`, `OPAY_ENVIRONMENT`, `OPAY_MERCHANT_ID`, `OPAY_PUBLIC_KEY`, `OPAY_SECRET_KEY`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_MODE`, `PAYSTACK_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/cors.ts`, `_shared/payment-status-sync.ts`, `_shared/resolve-payment-context.ts`

#### `reconcile-rental-terms`

Rental terms reconciliation. Cross-checks rentals ↔ invoices ↔ security deposits ↔ receipts for a date range and reports every row where the totals or terms do not match. Auth: caller must be an admin (checked via has_role RPC). Method: POST { start_date: ISO, end_date: ISO }

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/reconcile-rental-terms`
- Auth: platform default; in-code JWT check; service-role DB access
- Secrets read: `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/cors.ts`

#### `reconcile-settlements`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/reconcile-settlements`
- Auth: platform default; cron token; in-code JWT check; service-role DB access
- Secrets read: `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/cors.ts`

#### `send-order-notification`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/send-order-notification`
- Auth: platform default
- Secrets read: `LOVABLE_API_KEY`, `RESEND_API_KEY`, `RESEND_FALLBACK_FROM`, `RESEND_SENDING_DOMAIN`, `SB_FUNCTION_NAME`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/auth-guards.ts`, `_shared/resend-gateway.ts`

#### `send-payment-notification`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/send-payment-notification`
- Auth: platform default; cron token; service-role DB access
- Secrets read: `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `VAPID_PRIVATE_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_SUBJECT`
- Shared modules: `_shared/cors.ts`

#### `send-price-notification`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/send-price-notification`
- Auth: platform default
- Secrets read: `LOVABLE_API_KEY`, `RESEND_API_KEY`, `RESEND_FALLBACK_FROM`, `RESEND_SENDING_DOMAIN`, `SB_FUNCTION_NAME`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/auth-guards.ts`, `_shared/resend-gateway.ts`

#### `send-shipping-notification`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/send-shipping-notification`
- Auth: platform default
- Secrets read: `LOVABLE_API_KEY`, `RESEND_API_KEY`, `RESEND_FALLBACK_FROM`, `RESEND_SENDING_DOMAIN`, `SB_FUNCTION_NAME`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- Shared modules: `_shared/auth-guards.ts`, `_shared/email-config.ts`, `_shared/opt-out.ts`, `_shared/resend-gateway.ts`, `_shared/twilio-messaging-guard.ts`

#### `subscribe-to-plan`

Initiates a subscription checkout for a plan (Paystack for NGN, PayPal for USD). Driver/user identity is ALWAYS derived from JWT. Enforces eligibility & insurance-requires-training rule.

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/subscribe-to-plan`
- Auth: platform default; in-code JWT check; service-role DB access
- Secrets read: `APP_URL`, `OPAY_ENV`, `OPAY_ENVIRONMENT`, `OPAY_MERCHANT_ID`, `OPAY_PUBLIC_KEY`, `OPAY_SECRET_KEY`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_MODE`, `PAYSTACK_SECRET_KEY`, `PUBLIC_APP_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/app-url.ts`, `_shared/cors.ts`, `_shared/opay-client.ts`

#### `verify-opay-order`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/verify-opay-order`
- Auth: platform default; service-role DB access
- Secrets read: `CRON_SECRET`, `OPAY_ENV`, `OPAY_ENVIRONMENT`, `OPAY_MERCHANT_ID`, `OPAY_PUBLIC_KEY`, `OPAY_SECRET_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/auth-guards.ts`, `_shared/cors.ts`, `_shared/opay-client.ts`, `_shared/payment-status-sync.ts`

#### `verify-paystack-transaction`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/verify-paystack-transaction`
- Auth: platform default; in-code JWT check; service-role DB access
- Secrets read: `CRON_SECRET`, `PAYSTACK_SECRET_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/auth-guards.ts`, `_shared/cors.ts`, `_shared/payment-status-sync.ts`


### Messaging: SMS / WhatsApp / CPaaS

#### `auto-reply-simulate`

Dry-run simulator for inbox auto-reply rules. Evaluates a hypothetical inbound message against the live rule set exactly like the webhook engine does — but never sends or logs anything.

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/auto-reply-simulate`
- Auth: platform default; in-code JWT check; service-role DB access
- Secrets read: `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/cors.ts`, `_shared/reply-placeholders.ts`

#### `comms-test-console`

════════════════════════════════════════════════════════════ Admin communications test console Resolves the exact routing RentMaikar would use for a given channel + destination (public sender / caller ID, region, forwarding switch, master endpoint) and — when asked — actually dispatches a single test message or...

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/comms-test-console`
- Auth: platform default; in-code JWT check; service-role DB access
- Secrets read: `RESEND_API_KEY`, `SENT_API_BASE_URL`, `SENT_API_KEY`, `SENT_CHANNELS`, `SENT_ENABLED`, `SENT_SANDBOX_MODE`, `SENT_SENDER_ID`, `SENT_SMS_NUMBER`, `SENT_WHATSAPP_NUMBER`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `TWILIO_ACCOUNT_SID`, `TWILIO_API_KEY`, `TWILIO_API_KEY_SECRET`, `TWILIO_API_KEY_SID`, `TWILIO_API_SECRET`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `TWILIO_VOICE_FROM`, `TWILIO_WHATSAPP_NUMBER`
- Shared modules: `_shared/comms-endpoints.ts`, `_shared/forwarding.ts`, `_shared/messaging-events.ts`, `_shared/sent-client.ts`, `_shared/twilio-auth.ts`

#### `manychat-webhook`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/manychat-webhook`
- Auth: public edge (verify_jwt=false); provider signature; service-role DB access
- Secrets read: `MANYCHAT_API_TOKEN`, `MANYCHAT_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/manychat-client.ts`

#### `reprocess-sms-dlq`

Stuck-SMS reprocessor. 1. Sweep: outbound SMS/WhatsApp `messaging_events` rows that were queued more than STUCK_MINUTES ago and never reached a terminal state, plus any hard provider failure, are dead-lettered into `sms_dlq_retry_state`. 2. Retry: pending DLQ entries whose backoff has elapsed are re-sent through...

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/reprocess-sms-dlq`
- Auth: platform default; service-role DB access
- Schedule: pg_cron `*/15 * * * *`
- Secrets read: `CRON_SECRET`, `SENT_API_BASE_URL`, `SENT_API_KEY`, `SENT_CHANNELS`, `SENT_ENABLED`, `SENT_SANDBOX_MODE`, `SENT_SENDER_ID`, `SENT_SMS_NUMBER`, `SENT_WHATSAPP_NUMBER`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `TWILIO_WHATSAPP_NUMBER`
- Shared modules: `_shared/cors.ts`, `_shared/guard.ts`, `_shared/messaging-events.ts`, `_shared/sent-client.ts`

#### `send-in-app-message`

In-app messaging dispatcher. Complements SMS / WhatsApp / email: the message is stored in `in_app_messages` (read inside the web app or PWA) and a web-push notification is delivered to every browser/PWA the user has opted in from. Callable by admin/admin_assistant staff, or internally (cron / other edge functions)...

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/send-in-app-message`
- Auth: platform default; service-role DB access
- Secrets read: `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `VAPID_PRIVATE_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_SUBJECT`
- Shared modules: `_shared/cors.ts`, `_shared/guard.ts`, `_shared/messaging-events.ts`, `_shared/otp-guard.ts`, `_shared/web-push.ts`

#### `send-sms-notification`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/send-sms-notification`
- Auth: platform default; in-code JWT check; service-role DB access
- Secrets read: `SENT_API_BASE_URL`, `SENT_API_KEY`, `SENT_CHANNELS`, `SENT_ENABLED`, `SENT_SANDBOX_MODE`, `SENT_SENDER_ID`, `SENT_SMS_NUMBER`, `SENT_WHATSAPP_NUMBER`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `TERMII_API_KEY`, `TERMII_SENDER_ID`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_MS_NG`, `TWILIO_MS_USA`, `TWILIO_WHATSAPP_NUMBER`
- Shared modules: `_shared/channel-guard.ts`, `_shared/message-templates.ts`, `_shared/messaging-events.ts`, `_shared/opt-out.ts`, `_shared/outbound-audit.ts`, `_shared/sent-client.ts`, `_shared/sms-config.ts`, `_shared/twilio-messaging-guard.ts`

#### `sent-health`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/sent-health`
- Auth: platform default; in-code JWT check
- Secrets read: `SENT_API_BASE_URL`, `SENT_API_KEY`, `SENT_CHANNELS`, `SENT_ENABLED`, `SENT_SANDBOX_MODE`, `SENT_SENDER_ID`, `SENT_SMS_NUMBER`, `SENT_WHATSAPP_NUMBER`, `SUPABASE_ANON_KEY`, `SUPABASE_URL`, `TWILIO_WHATSAPP_NUMBER`
- Shared modules: `_shared/sent-client.ts`

#### `sent-inbound`

════════════════════════════════════════════════════════════ Sent.dm inbound receiver — RentMaikar routing layer Customer → +1 608 548 9220 (public messaging/WhatsApp alias) → Sent.dm → this function (RentMaikar backend) → outbound leg → Master Communications Endpoint Nothing is carrier-forwarded: the backend owns...

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/sent-inbound`
- Auth: platform default; provider signature; service-role DB access
- Secrets read: `RESEND_API_KEY`, `SENT_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `TWILIO_WHATSAPP_NUMBER`
- Shared modules: `_shared/comms-correlation.ts`, `_shared/forwarding.ts`, `_shared/messaging-events.ts`

#### `sent-status`

════════════════════════════════════════════════════════════ Sent.dm delivery-status receiver Sent.dm status callback → this function → messaging_events Mirrors `resend-events` for email: every provider status update for an outbound SMS/WhatsApp message is persisted as an outbound `messaging_events` row so the...

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/sent-status`
- Auth: platform default; provider signature; service-role DB access
- Secrets read: `RESEND_API_KEY`, `SENT_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `TWILIO_WHATSAPP_NUMBER`
- Shared modules: `_shared/forwarding.ts`, `_shared/messaging-events.ts`

#### `sent-webhook-config`

Admin-only helper that inspects and configures Sent.dm webhook endpoints so SMS/WhatsApp delivery receipts reach the platform delivery log. Canonical receiver: `${SENT_WEBHOOK_URL}` (default https://staging.rentmaikar.com/api/webhooks/sent) which relays verified events to the `sent-status` / `sent-inbound` edge...

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/sent-webhook-config`
- Auth: platform default
- Secrets read: `CRON_SECRET`, `PUBLIC_BACKEND_URL`, `SENT_API_BASE_URL`, `SENT_API_KEY`, `SENT_CHANNELS`, `SENT_ENABLED`, `SENT_SANDBOX_MODE`, `SENT_SENDER_ID`, `SENT_SMS_NUMBER`, `SENT_WEBHOOK_SECRET`, `SENT_WEBHOOK_URL`, `SENT_WHATSAPP_NUMBER`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `TWILIO_WHATSAPP_NUMBER`
- Shared modules: `_shared/cors.ts`, `_shared/guard.ts`, `_shared/sent-client.ts`

#### `sms-commands`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/sms-commands`
- Auth: public edge (verify_jwt=false); in-code JWT check; service-role DB access
- Secrets read: `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `TERMII_API_KEY`, `TERMII_SENDER_ID`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_MS_NG`, `TWILIO_MS_USA`
- Shared modules: `_shared/auth-guards.ts`, `_shared/message-templates.ts`, `_shared/opt-out.ts`, `_shared/sms-config.ts`, `_shared/sms-consent-audit.ts`, `_shared/twilio-messaging-guard.ts`

#### `social-inbox-webhook`

Unified social inbox webhook. Accepts inbound messages from Meta (Facebook / Instagram), LinkedIn and Google channels and threads them into the unified inbox. URL: /functions/v1/social-inbox-webhook?platform=facebook|instagram|linkedin|google

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/social-inbox-webhook` (also handles GET, OPTIONS)
- Auth: platform default; service-role DB access
- Secrets read: `META_WEBHOOK_VERIFY_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/cors.ts`

#### `termii-webhook`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/termii-webhook`
- Auth: public edge (verify_jwt=false); in-code JWT check; service-role DB access
- Secrets read: `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `TERMII_WEBHOOK_SECRET`
- Shared modules: `_shared/auto-reply.ts`, `_shared/opt-out.ts`

#### `twilio-test-send`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/twilio-test-send` (also handles GET, OPTIONS)
- Auth: platform default; provider signature; in-code JWT check; service-role DB access
- Secrets read: `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `TWILIO_ACCOUNT_SID`, `TWILIO_API_KEY`, `TWILIO_API_KEY_SECRET`, `TWILIO_API_KEY_SID`, `TWILIO_API_SECRET`, `TWILIO_AUTH_TOKEN`, `TWILIO_CUSTOMER_PROFILE_SID`, `TWILIO_MESSAGING_SERVICE_SID`, `TWILIO_PHONE_NUMBER`, `TWILIO_WHATSAPP_NUMBER`

#### `twilio-webhook`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/twilio-webhook` (also handles GET, OPTIONS)
- Auth: public edge (verify_jwt=false); provider signature; in-code JWT check; service-role DB access
- Secrets read: `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `TWILIO_WHATSAPP_NUMBER`, `WA_VERIFY_TOKEN`
- Shared modules: `_shared/auto-reply.ts`, `_shared/comms-correlation.ts`, `_shared/forwarding.ts`, `_shared/messaging-events.ts`, `_shared/opt-out.ts`, `_shared/twilio-signature.ts`

#### `whatchimp-webhook`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/whatchimp-webhook` (also handles GET, OPTIONS)
- Auth: public edge (verify_jwt=false); provider signature; service-role DB access
- Secrets read: `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `WHATCHIMP_API_BASE`, `WHATCHIMP_API_KEY`, `WHATCHIMP_PHONE_NUMBER_ID`, `WHATCHIMP_VERIFY_TOKEN`, `WHATCHIMP_WEBHOOK_SECRET`
- Shared modules: `_shared/whatchimp-client.ts`

#### `whatsapp-commands`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/whatsapp-commands`
- Auth: public edge (verify_jwt=false); provider signature; service-role DB access
- Secrets read: `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `TERMII_API_KEY`, `TERMII_SENDER_ID`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `TWILIO_PHONE_NUMBER_NG`
- Shared modules: `_shared/auth-guards.ts`, `_shared/message-templates.ts`, `_shared/opt-out.ts`, `_shared/sms-consent-audit.ts`, `_shared/twilio-messaging-guard.ts`, `_shared/twilio-signature.ts`, `_shared/whatsapp-templates.ts`


### Email

#### `booking-email-trigger`

Sends the booking-confirmation transactional email for a booking request that just transitioned to "accepted". Called by the database trigger trg_booking_accepted_email via pg_net (x-cron-secret) — never by the browser.

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/booking-email-trigger`
- Auth: public edge (verify_jwt=false); service-role DB access
- Secrets read: `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`

#### `email-domain-status-check`

email-domain-status-check — watches notify.rentmaikar.com DNS delegation and confirms the branded auth email templates are actively sending. Runs every 30 minutes via pg_cron (x-cron-secret) and can be triggered manually by an admin JWT. State transitions are recorded in platform_kv_settings and pushed to...

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/email-domain-status-check`
- Auth: platform default; in-code JWT check; service-role DB access
- Schedule: pg_cron `*/30 * * * *`
- Secrets read: `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`

#### `email-tracking`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/email-tracking` (also handles GET, OPTIONS)
- Auth: public edge (verify_jwt=false); service-role DB access
- Secrets read: `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/messaging-events.ts`

#### `email-webhook`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/email-webhook`
- Auth: public edge (verify_jwt=false); provider signature; service-role DB access
- Secrets read: `LOVABLE_API_KEY`, `RESEND_API_KEY`, `RESEND_FALLBACK_FROM`, `RESEND_SENDING_DOMAIN`, `RESEND_WEBHOOK_SECRET`, `SB_FUNCTION_NAME`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `TWILIO_WHATSAPP_NUMBER`
- Shared modules: `_shared/auto-reply.ts`, `_shared/email-config.ts`, `_shared/forwarding.ts`, `_shared/messaging-events.ts`, `_shared/resend-gateway.ts`, `_shared/svix-verify.ts`

#### `handle-email-suppression`

Suppression event payload sent by the Go API when Mailgun reports a bounce, complaint, or unsubscribe.

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/handle-email-suppression`
- Auth: public edge (verify_jwt=false); provider signature; service-role DB access
- Secrets read: `LOVABLE_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`

#### `handle-email-unsubscribe`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/handle-email-unsubscribe`
- Auth: public edge (verify_jwt=false); service-role DB access
- Secrets read: `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`

#### `inbox-attachment-ocr`

Extracts text (OCR) from inbox image/PDF attachments using Lovable AI. Admin / admin_assistant only. Results are cached in inbox_attachment_ocr.

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/inbox-attachment-ocr`
- Auth: platform default; in-code JWT check; service-role DB access
- Secrets read: `LOVABLE_API_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/cors.ts`

#### `preview-transactional-email`

Renders all registered templates with their previewData. Gated by LOVABLE_API_KEY — only the Go API calls this.

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/preview-transactional-email`
- Auth: public edge (verify_jwt=false); in-code JWT check
- Secrets read: `LOVABLE_API_KEY`

#### `process-email-queue`

Loaded lazily: a module-resolution or init failure here must not crash the isolate at boot (that surfaces as a 502 on every scheduled run).

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/process-email-queue`
- Auth: public edge (verify_jwt=false); in-code JWT check; service-role DB access
- Schedule: pg_cron `* * * * *`
- Secrets read: `EMAIL_E2E_RECIPIENT`, `LOVABLE_API_KEY`, `LOVABLE_SEND_URL`, `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `VITE_SUPABASE_URL`

#### `reprocess-email-dlq`

Automatic dead-letter reprocessor for the email queues. Runs on a schedule (and can be triggered manually by an admin from the email delivery monitor). Each run is bounded, single-flighted through a lease row, records per-message progress in `email_dlq_retry_state`, and backs off exponentially. After MAX_ATTEMPTS...

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/reprocess-email-dlq`
- Auth: platform default; in-code JWT check; service-role DB access
- Schedule: pg_cron `*/15 * * * *`
- Secrets read: `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`

#### `resend-events`

Resend delivery-event webhook. Receives email.delivered / email.bounced / email.complained / email.opened / email.clicked / email.delivery_delayed events and records the FINAL outcome for each message in email_send_log (the monitoring source of truth), so the admin email delivery page reflects reality beyond the...

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/resend-events`
- Auth: public edge (verify_jwt=false); provider signature; service-role DB access
- Secrets read: `RESEND_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/svix-verify.ts`

#### `send-agreement-email`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/send-agreement-email`
- Auth: platform default; service-role DB access
- Secrets read: `RESEND_API_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/auth-guards.ts`

#### `send-email-reply`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/send-email-reply`
- Auth: platform default; service-role DB access
- Secrets read: `LOVABLE_API_KEY`, `RESEND_API_KEY`, `RESEND_FALLBACK_FROM`, `RESEND_SENDING_DOMAIN`, `SB_FUNCTION_NAME`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/auth-guards.ts`, `_shared/channel-guard.ts`, `_shared/outbound-audit.ts`, `_shared/reply-placeholders.ts`, `_shared/resend-gateway.ts`

#### `send-inbox-reply`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/send-inbox-reply`
- Auth: platform default; service-role DB access
- Secrets read: `MANYCHAT_API_TOKEN`, `MANYCHAT_WEBHOOK_SECRET`, `SENT_API_BASE_URL`, `SENT_API_KEY`, `SENT_CHANNELS`, `SENT_ENABLED`, `SENT_SANDBOX_MODE`, `SENT_SENDER_ID`, `SENT_SMS_NUMBER`, `SENT_WHATSAPP_NUMBER`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `TERMII_API_KEY`, `TERMII_SENDER_ID`, `TWILIO_ACCOUNT_SID`, `TWILIO_API_KEY`, `TWILIO_API_KEY_SECRET`, `TWILIO_API_KEY_SID`, `TWILIO_API_SECRET`, `TWILIO_PHONE_NUMBER`, `TWILIO_WHATSAPP_NUMBER`, `WHATCHIMP_API_BASE`, `WHATCHIMP_API_KEY`, `WHATCHIMP_PHONE_NUMBER_ID`, `WHATCHIMP_WEBHOOK_SECRET`
- Shared modules: `_shared/auth-guards.ts`, `_shared/channel-guard.ts`, `_shared/manychat-client.ts`, `_shared/opt-out.ts`, `_shared/reply-placeholders.ts`, `_shared/sent-client.ts`, `_shared/twilio-auth.ts`, `_shared/twilio-messaging-guard.ts`, `_shared/whatchimp-client.ts`

#### `send-outbound-email`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/send-outbound-email`
- Auth: public edge (verify_jwt=false); service-role DB access
- Secrets read: `LOVABLE_API_KEY`, `RESEND_API_KEY`, `RESEND_FALLBACK_FROM`, `RESEND_SENDING_DOMAIN`, `SB_FUNCTION_NAME`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/auth-guards.ts`, `_shared/channel-guard.ts`, `_shared/email-config.ts`, `_shared/email-templates.ts`, `_shared/messaging-events.ts`, `_shared/outbound-audit.ts`, `_shared/resend-gateway.ts`

#### `send-transactional-email`

Configuration baked in at scaffold time — do NOT change these manually. To update, re-run the email domain setup flow.

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/send-transactional-email`
- Auth: platform JWT enforced; service-role DB access
- Secrets read: `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`


### VoIP, IVR & Call Center

#### `check-repeat-call-ins`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/check-repeat-call-ins`
- Auth: public edge (verify_jwt=false); service-role DB access
- Secrets read: `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/guard.ts`

#### `create-call-in`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/create-call-in`
- Auth: platform default; in-code JWT check; service-role DB access
- Secrets read: `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`

#### `end-voip-call`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/end-voip-call`
- Auth: platform default; in-code JWT check; service-role DB access
- Secrets read: `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`

#### `enforce-call-in-geofence`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/enforce-call-in-geofence`
- Auth: public edge (verify_jwt=false); cron token; service-role DB access
- Schedule: pg_cron `* * * * *`
- Secrets read: `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`

#### `expire-call-ins`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/expire-call-ins`
- Auth: public edge (verify_jwt=false); cron token; service-role DB access
- Schedule: pg_cron `*/5 * * * *`
- Secrets read: `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`

#### `expiry-notification-ivr`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/expiry-notification-ivr`
- Auth: public edge (verify_jwt=false); provider signature; in-code JWT check; service-role DB access
- Secrets read: `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `TWILIO_AUTH_TOKEN`
- Shared modules: `_shared/twilio-signature.ts`

#### `get-recording-url`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/get-recording-url`
- Auth: public edge (verify_jwt=false); in-code JWT check; service-role DB access
- Secrets read: `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`

#### `incoming-call-forward`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/incoming-call-forward`
- Auth: platform default; provider signature; service-role DB access
- Secrets read: `RESEND_API_KEY`, `SENT_SMS_NUMBER`, `SENT_WHATSAPP_NUMBER`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `TWILIO_VOICE_FROM`, `TWILIO_WHATSAPP_NUMBER`
- Shared modules: `_shared/comms-endpoints.ts`, `_shared/forwarding.ts`, `_shared/messaging-events.ts`, `_shared/twilio-callback-auth.ts`

#### `initiate-voip-call`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/initiate-voip-call`
- Auth: platform default; in-code JWT check; service-role DB access
- Secrets read: `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`

#### `payment-default-ivr`

This endpoint handles Twilio <Gather> callbacks from payment default IVR calls. When a driver presses a key during the automated call, Twilio POSTs to this URL. Press 1 = Payment link via SMS Press 2 = Connect to support agent

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/payment-default-ivr`
- Auth: public edge (verify_jwt=false); provider signature; in-code JWT check; service-role DB access
- Secrets read: `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- Shared modules: `_shared/twilio-signature.ts`

#### `process-call-recording`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/process-call-recording`
- Auth: public edge (verify_jwt=false); service-role DB access
- Secrets read: `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`
- Shared modules: `_shared/auth-guards.ts`

#### `recording-status-callback`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/recording-status-callback`
- Auth: public edge (verify_jwt=false); provider signature; in-code JWT check; service-role DB access
- Secrets read: `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `TWILIO_AUTH_TOKEN`
- Shared modules: `_shared/messaging-events.ts`, `_shared/twilio-signature.ts`

#### `shutdown-warning-ivr`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/shutdown-warning-ivr`
- Auth: public edge (verify_jwt=false); provider signature; service-role DB access
- Secrets read: `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `TWILIO_AUTH_TOKEN`
- Shared modules: `_shared/twilio-signature.ts`

#### `vehicle-return-ivr`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/vehicle-return-ivr`
- Auth: public edge (verify_jwt=false); provider signature; in-code JWT check; service-role DB access
- Secrets read: `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `TWILIO_AUTH_TOKEN`
- Shared modules: `_shared/twilio-signature.ts`

#### `voice-access-token`

Mints a short-lived Twilio Voice access token so the browser (or PWA) can register as a WebRTC client and place / receive in-app calls. Without this endpoint the Twilio Voice SDK has no identity and every in-app call fails before it reaches the network.

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/voice-access-token`
- Auth: platform default; in-code JWT check; service-role DB access
- Secrets read: `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `TWILIO_ACCOUNT_SID`, `TWILIO_API_KEY`, `TWILIO_API_KEY_SECRET`, `TWILIO_API_KEY_SID`, `TWILIO_API_SECRET`, `TWILIO_TWIML_APP_SID`

#### `voice-call-request`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/voice-call-request`
- Auth: public edge (verify_jwt=false); in-code JWT check; service-role DB access
- Secrets read: `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`

#### `voice-twiml-config`

Admin-only helper that reports the exact URLs the Twilio TwiML App must use for in-app (WebRTC) calling, and verifies the live TwiML App configuration.

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/voice-twiml-config`
- Auth: platform default; in-code JWT check; service-role DB access
- Secrets read: `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `TWILIO_ACCOUNT_SID`, `TWILIO_API_KEY`, `TWILIO_API_KEY_SECRET`, `TWILIO_API_KEY_SID`, `TWILIO_API_SECRET`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `TWILIO_TWIML_APP_SID`

#### `voice-twiml-dial`

TwiML App voice URL for in-app (WebRTC) calls. Twilio POSTs here whenever a browser client placed through the Voice SDK connects, and whenever an inbound leg is bridged to a client identity. It answers with TwiML that bridges the browser leg to its destination.

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/voice-twiml-dial`
- Auth: platform default; service-role DB access
- Secrets read: `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `TWILIO_PHONE_NUMBER`
- Shared modules: `_shared/twilio-callback-auth.ts`

#### `voip-call-transcript-log`

Live per-call STT segment logger. Multipart form fields: audio: File (WAV/MP3/OGG) — required callId: string (voip_calls.id) — required segmentIndex: number speaker?: string language_code?: string segmentStartedAt?: ISO string segmentEndedAt?: ISO string saveAudio?: "true" | "false" (default false) — when true,...

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/voip-call-transcript-log`
- Auth: platform default; service-role DB access
- Secrets read: `ELEVENLABS_API_KEY`, `ELEVEN_LABS_API_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/auth-guards.ts`

#### `voip-status-callback`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/voip-status-callback`
- Auth: public edge (verify_jwt=false); provider signature; in-code JWT check; service-role DB access
- Secrets read: `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `TWILIO_AUTH_TOKEN`
- Shared modules: `_shared/call-strategy.ts`, `_shared/messaging-events.ts`, `_shared/twilio-signature.ts`, `_shared/voicemail-system.ts`


### IoT, Telemetry & Tracking

#### `accident-emergency-dispatch`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/accident-emergency-dispatch`
- Auth: public edge (verify_jwt=false); in-code JWT check; service-role DB access
- Secrets read: `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/auth-guards.ts`

#### `emqx-monitoring`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/emqx-monitoring`
- Auth: public edge (verify_jwt=false); in-code JWT check; service-role DB access
- Secrets read: `CRON_SECRET`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/cron-auth.ts`, `_shared/emqx-client.ts`

#### `emqx-secret-rotation`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/emqx-secret-rotation`
- Auth: platform default; in-code JWT check; service-role DB access
- Secrets read: `EMQX_API_KEY`, `EMQX_API_SECRET`, `EMQX_API_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/emqx-credentials.ts`

#### `generate-vehicle-mqtt-token`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/generate-vehicle-mqtt-token`
- Auth: public edge (verify_jwt=false); provider signature; in-code JWT check; service-role DB access
- Secrets read: `MQTT_JWT_SECRET`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`

#### `gps-worker-watchdog`

gps-worker-watchdog — detects stalled GPS/telemetry ingestion workers and raises admin_notifications. Runs on a 5-minute pg_cron schedule (x-cron-secret) and can also be triggered manually by an admin JWT.

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/gps-worker-watchdog`
- Auth: platform default; in-code JWT check; service-role DB access
- Schedule: pg_cron `*/5 * * * *`
- Secrets read: `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`

#### `hologram-admin`

Admin-only Hologram operations: config check, list SIMs, bulk import, activate/suspend, usage sync, connection test and SIM→vehicle linking. Every state-changing action is logged to iot_audit_log for traceability.

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/hologram-admin`
- Auth: platform default; in-code JWT check; service-role DB access
- Secrets read: `HOLOGRAM_API_KEY`, `HOLOGRAM_ORG_ID`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/cors.ts`, `_shared/hologram-client.ts`

#### `hologram-sync`

Scheduled Hologram SIM refresh. Pulls the org SIM inventory from Hologram, upserts new SIMs, refreshes state and usage for known SIMs, and records every run (success or failure) in iot_sync_activity_log + iot_sync_state so admins can see it in the dashboard.

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/hologram-sync`
- Auth: public edge (verify_jwt=false); cron token; in-code JWT check; service-role DB access
- Schedule: pg_cron `0 * * * *`
- Secrets read: `CRON_SECRET`, `HOLOGRAM_API_KEY`, `HOLOGRAM_ORG_ID`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/hologram-client.ts`

#### `iot-accident-detection`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/iot-accident-detection`
- Auth: public edge (verify_jwt=false); in-code JWT check; service-role DB access
- Secrets read: `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/auth-guards.ts`

#### `iot-admin`

Unified IoT admin edge function. Actions (POST { action, ... }): - list_plans - purchase_sim { plan_id?, notes? } - list_available_sims - list_devices - register_device { serial_number, imei, device_model, firmware_version?, notes? } - link_sim_to_device { device_imei, sim_id } - activate_pair { device_id } -...

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/iot-admin`
- Auth: platform default; in-code JWT check; service-role DB access
- Secrets read: `HOLOGRAM_API_KEY`, `HOLOGRAM_ORG_ID`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/hologram-client.ts`

#### `iot-auto-provision`

Automatic IoT provisioning worker. Pipeline (bounded, idempotent, single-flight): 1. Link provisioned/available SIM cards to unlinked tracking devices -> enables the device 2. Activate devices that now have a SIM -> telemetry enabled 3. Link enabled devices to published vehicles -> vehicle provisioned 4. Run a...

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/iot-auto-provision`
- Auth: platform default; cron token; in-code JWT check; service-role DB access
- Schedule: pg_cron `0 * * * *`
- Secrets read: `CRON_SECRET`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/cors.ts`

#### `iot-offline-alerts`

Offline / last-seen telemetry alerts. Scans iot_devices for trackers that have not reported telemetry within a configurable threshold and raises admin notifications + an entry in the IoT sync activity feed. Callable from the admin UI or from cron.

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/iot-offline-alerts`
- Auth: platform default; cron token; in-code JWT check; service-role DB access
- Schedule: pg_cron `*/15 * * * *`
- Secrets read: `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/cors.ts`

#### `iot-scheduled-sync`

Cron-triggered runner: reads iot_sync_schedule and dispatches Hologram usage sync and Traccar position sync when the configured interval has elapsed. Protected by CRON_SECRET (x-cron-secret header) or service-role Bearer token.

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/iot-scheduled-sync`
- Auth: public edge (verify_jwt=false); cron token; in-code JWT check; service-role DB access
- Schedule: pg_cron `* * * * *`
- Secrets read: `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/cors.ts`

#### `mqtt-ingestion-worker`

mqtt-ingestion-worker — scheduled server-side MQTT ingestion. Runs every minute (pg_cron). Because EMQX Serverless offers no persistent subscriber slot for an edge runtime, the worker pulls the latest retained telemetry message per active vehicle topic through the management API and feeds it into the server-side...

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/mqtt-ingestion-worker`
- Auth: platform default
- Schedule: pg_cron `* * * * *`
- Secrets read: `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/cors.ts`, `_shared/cron-auth.ts`, `_shared/emqx-client.ts`, `_shared/telemetry-ingest-core.ts`

#### `sarekon-admin`

Admin-only GPSANDTRACK operations: connection status, device list, pull sync (writes to iot_devices + mqtt_telemetry_logs so the existing live map and telemetry feed pick the data up), remote commands via the GPSANDTRACK command queue, device→vehicle linking, and iot_sync_state for the ingestion monitor.

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/sarekon-admin`
- Auth: platform default; cron token; in-code JWT check; service-role DB access
- Secrets read: `CRON_SECRET`, `SAREKON_BASE_URL`, `SAREKON_PASSWORD`, `SAREKON_USERNAME`, `SAREKON_USER_ID`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/cors.ts`, `_shared/provider-config.ts`, `_shared/rate-limit.ts`, `_shared/sarekon-client.ts`, `_shared/telemetry-ingest-core.ts`, `_shared/unified-location-service.ts`

#### `sarekon-location-worker`

sarekon-location-worker — high-frequency GPS polling. pg_cron can only fire once a minute, so a single invocation performs an internal loop (default 4 × 15s, configurable through iot_sync_schedule) to reach the 15-second freshness target from the spec. Every pass funnels the provider payload through the SareKon...

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/sarekon-location-worker`
- Auth: platform default
- Schedule: pg_cron `* * * * *`
- Secrets read: `CRON_SECRET`, `SAREKON_BASE_URL`, `SAREKON_PASSWORD`, `SAREKON_USERNAME`, `SAREKON_USER_ID`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/cors.ts`, `_shared/cron-auth.ts`, `_shared/sarekon-client.ts`, `_shared/telemetry-ingest-core.ts`, `_shared/unified-location-service.ts`

#### `telemetry-dispatch`

Provider-agnostic telemetry dispatcher. Resolves the ACTIVE provider from telemetry_providers (admin toggle) and routes state reads + commands through the matching adapter, so flipping the switch in the Admin dashboard actually changes which backend drives vehicles.

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/telemetry-dispatch`
- Auth: platform default; in-code JWT check; service-role DB access
- Secrets read: `EMQX_API_KEY`, `EMQX_API_SECRET`, `EMQX_API_URL`, `SAREKON_BASE_URL`, `SAREKON_PASSWORD`, `SAREKON_USERNAME`, `SAREKON_USER_ID`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `TRACCAR_API_TOKEN`, `TRACCAR_BASE_URL`, `TRACCAR_EMAIL`, `TRACCAR_PASSWORD`, `TRACCAR_TOKEN`
- Shared modules: `_shared/cors.ts`, `_shared/rate-limit.ts`, `_shared/sarekon-client.ts`, `_shared/telemetry-client.ts`, `_shared/traccar-client.ts`

#### `telemetry-health-monitor`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/telemetry-health-monitor`
- Auth: public edge (verify_jwt=false); in-code JWT check; service-role DB access
- Schedule: pg_cron `*/15 * * * *`
- Secrets read: `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/cron-auth.ts`

#### `telemetry-ingest`

telemetry-ingest — server-side Resident Orchestrator entry point. Accepts one or more raw telemetry records (MQTT topic payloads, Traccar positions, or already-normalised events), reduces them into canonical vehicle state, derives analytics, and persists everything server-side so orchestration no longer depends on...

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/telemetry-ingest`
- Auth: platform default; cron token; in-code JWT check; service-role DB access
- Secrets read: `CRON_SECRET`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/cors.ts`, `_shared/telemetry-ingest-core.ts`

#### `traccar-admin`

Admin-only Traccar operations: config check, list, pull sync (writes to iot_devices + mqtt_telemetry_logs enriched with vehicle_id), remote commands (engineStop/engineResume/custom), device→vehicle linking, and a persistent iot_sync_state row for the ingestion monitor. All lifecycle commands are logged to...

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/traccar-admin`
- Auth: platform default; cron token; in-code JWT check; service-role DB access
- Secrets read: `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `TRACCAR_API_TOKEN`, `TRACCAR_BASE_URL`, `TRACCAR_EMAIL`, `TRACCAR_PASSWORD`, `TRACCAR_TOKEN`
- Shared modules: `_shared/cors.ts`, `_shared/rate-limit.ts`, `_shared/traccar-client.ts`, `_shared/unified-location-service.ts`

#### `vehicle-shutdown-warning`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/vehicle-shutdown-warning`
- Auth: public edge (verify_jwt=false); in-code JWT check; service-role DB access
- Secrets read: `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `TERMII_API_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- Shared modules: `_shared/cron-auth.ts`


### Notifications, Tasks & Scheduling

#### `dispatch-event-notifications`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/dispatch-event-notifications`
- Auth: platform default; provider signature; in-code JWT check; service-role DB access
- Schedule: pg_cron `*/2 * * * *`
- Secrets read: `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/cron-auth.ts`, `_shared/event-template-map.ts`

#### `generate-daily-tasks`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/generate-daily-tasks`
- Auth: public edge (verify_jwt=false); provider signature; cron token; in-code JWT check; service-role DB access
- Schedule: pg_cron `0 6 * * *`
- Secrets read: `CRON_SECRET`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/admin-auth.ts`, `_shared/cron-auth.ts`

#### `get-vapid-public-key`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/get-vapid-public-key`
- Auth: platform default
- Secrets read: `VAPID_PUBLIC_KEY`
- Shared modules: `_shared/cors.ts`

#### `notify-training-review`

Deploys as `notify-training-review`. Called by admins after reviewing a compliance training completion; pushes the outcome to the driver's devices and records an in-app notification trail.

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/notify-training-review`
- Auth: platform default; in-code JWT check; service-role DB access
- Secrets read: `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/cors.ts`, `_shared/guard.ts`

#### `notify-withdrawal`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/notify-withdrawal`
- Auth: platform default; service-role DB access
- Secrets read: `CRON_SECRET`, `PUBLIC_APP_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/cors.ts`, `_shared/guard.ts`, `_shared/withdrawal-notify.ts`

#### `process-agreement-renewals`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/process-agreement-renewals`
- Auth: public edge (verify_jwt=false); provider signature; service-role DB access
- Schedule: pg_cron `10 6 * * *`
- Secrets read: `CRON_SECRET`, `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/cron-auth.ts`

#### `process-expiry-notifications`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/process-expiry-notifications`
- Auth: public edge (verify_jwt=false); in-code JWT check; service-role DB access
- Schedule: pg_cron `daily-expiry-notifications 0 8 * * *`, `process-expiry-notifications 0 8 * * *`
- Secrets read: `CRON_SECRET`, `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `TERMII_API_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- Shared modules: `_shared/cron-auth.ts`

#### `process-inspection-reminders`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/process-inspection-reminders`
- Auth: public edge (verify_jwt=false); provider signature; in-code JWT check; service-role DB access
- Schedule: pg_cron `0 9 1 1,4,7,10 *`
- Secrets read: `CRON_SECRET`, `LOVABLE_API_KEY`, `RESEND_API_KEY`, `RESEND_FALLBACK_FROM`, `RESEND_SENDING_DOMAIN`, `SB_FUNCTION_NAME`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/cron-auth.ts`, `_shared/resend-gateway.ts`

#### `process-predue-reminders`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/process-predue-reminders`
- Auth: public edge (verify_jwt=false); service-role DB access
- Schedule: pg_cron `0 7 * * *`
- Secrets read: `CRON_SECRET`, `LOVABLE_API_KEY`, `RESEND_API_KEY`, `RESEND_FALLBACK_FROM`, `RESEND_SENDING_DOMAIN`, `SB_FUNCTION_NAME`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- Shared modules: `_shared/cron-auth.ts`, `_shared/email-templates.ts`, `_shared/opt-out.ts`, `_shared/resend-gateway.ts`, `_shared/whatsapp-templates.ts`

#### `retry-event-notifications`

Admin-triggered retry of failed notification deliveries. Resets the selected outbox rows back to `pending` (attempts = 0) and then invokes `dispatch-event-notifications` so the retry happens immediately.

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/retry-event-notifications`
- Auth: platform default; in-code JWT check; service-role DB access
- Secrets read: `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/admin-auth.ts`, `_shared/cors.ts`

#### `save-push-subscription`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/save-push-subscription`
- Auth: platform default; in-code JWT check; service-role DB access
- Secrets read: `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/cors.ts`

#### `send-approval-notification`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/send-approval-notification`
- Auth: platform default
- Secrets read: `LOVABLE_API_KEY`, `RESEND_API_KEY`, `RESEND_FALLBACK_FROM`, `RESEND_SENDING_DOMAIN`, `SB_FUNCTION_NAME`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/auth-guards.ts`, `_shared/resend-gateway.ts`

#### `send-booking-reminders`

Hourly cron: emails a start-reminder to drivers whose accepted booking begins within the next 24 hours. Idempotent per booking + start date via the idempotency key passed to send-transactional-email.

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/send-booking-reminders`
- Auth: public edge (verify_jwt=false); service-role DB access
- Schedule: pg_cron `15 * * * *`
- Secrets read: `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`

#### `send-incident-notification`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/send-incident-notification`
- Auth: platform default; in-code JWT check; service-role DB access
- Secrets read: `LOVABLE_API_KEY`, `RESEND_API_KEY`, `RESEND_FALLBACK_FROM`, `RESEND_SENDING_DOMAIN`, `SB_FUNCTION_NAME`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/auth-guards.ts`, `_shared/email-config.ts`, `_shared/resend-gateway.ts`

#### `send-meta-capi`

Meta Conversions API (CAPI) — server-side companion to the browser Pixel. The client sends the same event with a shared event_id; Meta deduplicates. Public endpoint (verify_jwt = false in config.toml) because it must be callable from unauthenticated visitors. The function requires the Meta-issued CAPI access token,...

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/send-meta-capi`
- Auth: public edge (verify_jwt=false)
- Secrets read: `META_CAPI_ACCESS_TOKEN`, `META_PIXEL_ID`, `META_TEST_EVENT_CODE`

#### `send-persona-digest`

Scheduled worker: sends one summary email per user with all their pending Persona identity verification status changes buffered since the last run. Users opt in by setting profiles.persona_notification_frequency = 'daily_digest'. Intended to be invoked once per day via pg_cron.

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/send-persona-digest`
- Auth: platform default; service-role DB access
- Schedule: pg_cron `0 8 * * *`
- Secrets read: `APP_URL`, `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/cors.ts`, `_shared/guard.ts`

#### `send-push-notification`

Deploys as `send-push-notification`. Callable from other edge functions or authenticated admin clients to fan out a push message to a user's registered iOS/Android/web devices, respecting each device's notification_prefs. Delivery uses FCM HTTP v1 (for both Android and web) and APNs via HTTP/2 for iOS. Missing...

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/send-push-notification`
- Auth: platform default; service-role DB access
- Secrets read: `CRON_SECRET`, `FCM_SERVER_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/cors.ts`, `_shared/guard.ts`

#### `send-reconciliation-alert`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/send-reconciliation-alert`
- Auth: platform default; service-role DB access
- Secrets read: `CRON_SECRET`, `LOVABLE_API_KEY`, `RESEND_API_KEY`, `RESEND_FALLBACK_FROM`, `RESEND_SENDING_DOMAIN`, `SB_FUNCTION_NAME`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `TERMII_API_KEY`, `TERMII_SENDER_ID`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- Shared modules: `_shared/cors.ts`, `_shared/guard.ts`, `_shared/opt-out.ts`, `_shared/resend-gateway.ts`, `_shared/twilio-messaging-guard.ts`

#### `send-task-notification`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/send-task-notification`
- Auth: platform default
- Secrets read: `LOVABLE_API_KEY`, `RESEND_API_KEY`, `RESEND_FALLBACK_FROM`, `RESEND_SENDING_DOMAIN`, `SB_FUNCTION_NAME`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- Shared modules: `_shared/auth-guards.ts`, `_shared/email-config.ts`, `_shared/opt-out.ts`, `_shared/resend-gateway.ts`

#### `training-compliance-reminders`

Deploys as `training-compliance-reminders`. Scheduled job that pushes a reminder to every driver whose compliance training is not fully verified, and to drivers whose 6-month refresh is due.

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/training-compliance-reminders`
- Auth: platform default; in-code JWT check; service-role DB access
- Schedule: pg_cron `0 8 * * *`
- Secrets read: `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/cors.ts`, `_shared/guard.ts`

#### `vehicle-return-reminder`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/vehicle-return-reminder`
- Auth: public edge (verify_jwt=false); in-code JWT check; service-role DB access
- Schedule: pg_cron `0 10 * * *`
- Secrets read: `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `TERMII_API_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- Shared modules: `_shared/cron-auth.ts`


### AI & Media (ElevenLabs, Lovable AI)

#### `elevenlabs-agent-token`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/elevenlabs-agent-token`
- Auth: platform default
- Secrets read: `ELEVENLABS_AGENT_ID`, `ELEVENLABS_API_KEY`, `ELEVEN_LABS_API_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/auth-guards.ts`

#### `elevenlabs-stt`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/elevenlabs-stt`
- Auth: platform default; service-role DB access
- Secrets read: `ELEVENLABS_API_KEY`, `ELEVEN_LABS_API_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/auth-guards.ts`

#### `elevenlabs-test-audio-url`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/elevenlabs-test-audio-url`
- Auth: platform default; service-role DB access
- Secrets read: `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/auth-guards.ts`

#### `elevenlabs-tts`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/elevenlabs-tts`
- Auth: public edge (verify_jwt=false); service-role DB access
- Secrets read: `ELEVENLABS_API_KEY`, `ELEVEN_LABS_API_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/auth-guards.ts`

#### `elevenlabs-tts-stream`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/elevenlabs-tts-stream`
- Auth: public edge (verify_jwt=false)
- Secrets read: `ELEVENLABS_API_KEY`, `ELEVEN_LABS_API_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/auth-guards.ts`

#### `elevenlabs-voices`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/elevenlabs-voices`
- Auth: public edge (verify_jwt=false)
- Secrets read: `ELEVENLABS_API_KEY`, `ELEVEN_LABS_API_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/auth-guards.ts`


### Admin & Platform Operations

#### `auto-submit-for-review`

Auto-submit an application for admin review once all required documents are uploaded. - Called by the driver client when their document completion hits 100%. - Idempotent: only transitions `pending` -> `under_review` once. - Triggers notify-referees + verify-referees + persona-create-inquiry as best-effort.

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/auto-submit-for-review`
- Auth: platform default; in-code JWT check; service-role DB access
- Secrets read: `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/cors.ts`, `_shared/pipeline-events.ts`

#### `generate-inspection-pdf`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/generate-inspection-pdf`
- Auth: platform default; service-role DB access
- Secrets read: `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/auth-guards.ts`

#### `region-autobuild`

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/region-autobuild`
- Auth: platform default; in-code JWT check; service-role DB access
- Secrets read: `LOVABLE_API_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`

#### `sync-approved-vehicles`

Scheduled sync: pulls approved owner vehicle details into the vehicle registry. Idempotent — plates already present are skipped and reported.

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/sync-approved-vehicles`
- Auth: public edge (verify_jwt=false); service-role DB access
- Schedule: pg_cron `17 * * * *`
- Secrets read: `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/cron-auth.ts`


### Other / Uncategorised

#### `provider-health-alerts`

════════════════════════════════════════════════════════════ Scheduled provider health watchdog. Looks at the last N hours (1–6, admin configurable) of communication traffic and raises an alert when a provider's delivery/bounce error rate spikes or when webhook deliveries start failing. Sources: messaging_events...

- Endpoint: `POST https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/provider-health-alerts`
- Auth: public edge (verify_jwt=false); cron token; service-role DB access
- Schedule: pg_cron `7 * * * *`
- Secrets read: `APP_URL`, `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Shared modules: `_shared/cors.ts`, `_shared/guard.ts`


## 5. Scheduled workers (pg_cron)

| Schedule (UTC) | Function |
| --- | --- |
| `*/2 * * * *` | `dispatch-event-notifications` |
| `*/30 * * * *` | `email-domain-status-check` |
| `* * * * *` | `enforce-call-in-geofence` |
| `*/5 * * * *` | `expire-call-ins` |
| `0 6 * * *` | `generate-daily-tasks` |
| `*/5 * * * *` | `gps-worker-watchdog` |
| `0 * * * *` | `hologram-sync` |
| `0 * * * *` | `iot-auto-provision` |
| `*/15 * * * *` | `iot-offline-alerts` |
| `* * * * *` | `iot-scheduled-sync` |
| `* * * * *` | `mqtt-ingestion-worker` |
| `0 7 * * *` | `persona-expiry-scan` |
| `*/15 * * * *` | `persona-reconcile` |
| `10 6 * * *` | `process-agreement-renewals` |
| `1 0 * * *` | `process-daily-debits` |
| `* * * * *` | `process-email-queue` |
| `daily-expiry-notifications 0 8 * * *` | `process-expiry-notifications` |
| `0 8 * * *` | `process-expiry-notifications` |
| `0 9 1 1,4,7,10 *` | `process-inspection-reminders` |
| `0 9 * * 5` | `process-owner-payouts` |
| `0 */6 * * *` | `process-payment-defaults` |
| `0 * * * *` | `process-payment-defaults` |
| `*/10 * * * *` | `process-payment-unlock` |
| `0 7 * * *` | `process-predue-reminders` |
| `20 2 * * *` | `provider-billing-sync` |
| `7 * * * *` | `provider-health-alerts` |
| `*/15 * * * *` | `reconcile-payments` |
| `*/15 * * * *` | `reprocess-email-dlq` |
| `*/15 * * * *` | `reprocess-sms-dlq` |
| `* * * * *` | `sarekon-location-worker` |
| `15 * * * *` | `send-booking-reminders` |
| `0 8 * * *` | `send-persona-digest` |
| `17 * * * *` | `sync-approved-vehicles` |
| `*/15 * * * *` | `telemetry-health-monitor` |
| `0 8 * * *` | `training-compliance-reminders` |
| `0 10 * * *` | `vehicle-return-reminder` |

All cron jobs call the function URL with the `CRON_SECRET` token. `purge-elevenlabs-test-logs` (03:15 daily) runs pure SQL and calls no function.

## 6. Frontend integration seam

The frontend calls the gateway only through `src/lib/backend-client.ts` (`backendRequest`, `backendGet`, `backendPost`) which attaches the Supabase bearer token, enforces a 20s timeout and normalises `{ data, error }`. Edge functions are called through `supabase.functions.invoke()`. Repointing the frontend at a new backend requires changing `VITE_API_BASE_URL` only.

