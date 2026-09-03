# Rentmaikar Credentials Inventory & Rotation Plan

Generated 2026-09-03. **No secret values appear in this document.** It lists what exists, who owns it, where the backend team obtains or rotates it, and in what order to hand it over.

Total distinct server-side environment variables in use: **108**.

## 1. Inventory

### Supabase

| Variable | Purpose | Obtain / rotate at | Sensitivity | Cadence | Consumers |
| --- | --- | --- | --- | --- | --- |
| `SB_FUNCTION_NAME` | Runtime-injected function name | Platform-injected | Low | N/A | 16 |
| `SUPABASE_ANON_KEY` | Publishable client key | Platform-injected | Low (publishable) | On project key rotation | 52 |
| `SUPABASE_SERVICE_ROLE_KEY` | Full DB bypass key for server code | Platform-injected; not retrievable on Lovable Cloud | Critical | Immediately on suspected exposure | 155 |
| `SUPABASE_URL` | Project API base URL | Platform-injected | Low | N/A (rotates with project) | 157 |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Client publishable key (frontend) | Platform-injected | Low (publishable) | With key rotation | 2 |
| `VITE_SUPABASE_URL` | Client build-time URL (frontend) | Platform-injected | Low | N/A | 3 |

### Rentmaikar internal

| Variable | Purpose | Obtain / rotate at | Sensitivity | Cadence | Consumers |
| --- | --- | --- | --- | --- | --- |
| `CRON_SECRET` | Shared token authorising pg_cron -> edge worker calls | Self-issued random 32+ chars | High | Quarterly | 52 |
| `EMAIL_E2E_RECIPIENT` | Test-only email recipient | Config value (non-production) | Low | N/A | 1 |
| `TEST_ADMIN_JWT` | Test-only admin token | Test fixture (never in production) | High | Per test run | 1 |
| `TEST_USER_A_ID` | Test fixture user id | Test fixture | Low | N/A | 1 |
| `TEST_USER_B_ID` | Test fixture user id | Test fixture | Low | N/A | 1 |

### Rentmaikar

| Variable | Purpose | Obtain / rotate at | Sensitivity | Cadence | Consumers |
| --- | --- | --- | --- | --- | --- |
| `ALLOWED_ORIGINS` | CORS allowlist for the gateway | Config value | Low | N/A | 1 |
| `APP_URL` | Legacy alias of PUBLIC_APP_URL | Config value | Low | N/A | 6 |
| `NODE_ENV` | Gateway runtime mode | Config value | Low | N/A | 1 |
| `PORT` | Gateway listen port | Config value | Low | N/A | 1 |
| `PUBLIC_APP_URL` | Canonical frontend URL used in links | Config value | Low | N/A | 7 |
| `PUBLIC_BACKEND_URL` | Canonical backend/API URL | Config value | Low | N/A | 2 |
| `SITE_URL` | Auth redirect base | Config value | Low | N/A | 3 |

### Sent.dm

| Variable | Purpose | Obtain / rotate at | Sensitivity | Cadence | Consumers |
| --- | --- | --- | --- | --- | --- |
| `SENT_API_BASE_URL` | API base override (staging only) | Config value | Low | N/A | 8 |
| `SENT_API_KEY` | Primary global SMS/WhatsApp/RCS API key (x-api-key header) | Sent.dm dashboard > API keys | Critical | Quarterly / on staff change | 8 |
| `SENT_CHANNELS` | Channels Sent may serve | Config value | Low | N/A | 7 |
| `SENT_ENABLED` | Master switch for Sent as primary CPaaS | Config value | Low | N/A | 7 |
| `SENT_SANDBOX_MODE` | Routes traffic to sandbox when true | Config value | Low | N/A | 8 |
| `SENT_SENDER_ID` | Approved alphanumeric sender ID (RENTMAIKAR) | Sent.dm sender registration | Low | N/A | 8 |
| `SENT_SMS_NUMBER` | Numeric US 10DLC SMS sender | Sent.dm dashboard | Low | N/A | 8 |
| `SENT_STATUS_WEBHOOK_URL` | Delivery-status callback URL | Config value | Low | On domain change | 1 |
| `SENT_WEBHOOK_SECRET` | HMAC secret verifying inbound/status callbacks | Shared value; set in Sent dashboard and here | High | Semi-annual; rotate before endpoint cutover | 4 |
| `SENT_WEBHOOK_URL` | Inbound callback URL | Config value | Low | On domain change | 2 |
| `SENT_WHATSAPP_NUMBER` | WhatsApp business sender | Sent.dm dashboard | Low | N/A | 8 |

### Termii

| Variable | Purpose | Obtain / rotate at | Sensitivity | Cadence | Consumers |
| --- | --- | --- | --- | --- | --- |
| `TERMII_API_KEY` | Nigeria SMS/OTP fallback key | Termii dashboard > API | Critical | Quarterly | 12 |
| `TERMII_SENDER_ID` | Approved NG sender ID | Termii dashboard | Low | N/A | 8 |
| `TERMII_WEBHOOK_SECRET` | Verifies Termii delivery callbacks | Shared value set in both places | High | Semi-annual | 1 |

### Twilio

| Variable | Purpose | Obtain / rotate at | Sensitivity | Cadence | Consumers |
| --- | --- | --- | --- | --- | --- |
| `TWILIO_ACCOUNT_SID` | Account identifier (voice only) | Twilio console | Medium | N/A | 27 |
| `TWILIO_API_KEY` | Alias accepted for API key SID | Twilio console | High | Quarterly | 6 |
| `TWILIO_API_KEY_SECRET` | API key secret | Twilio console > API keys (shown once) | Critical | Quarterly | 5 |
| `TWILIO_API_KEY_SID` | API key SID used for REST auth | Twilio console > API keys | High | Quarterly | 5 |
| `TWILIO_API_SECRET` | Alias accepted for API key secret | Twilio console | Critical | Quarterly | 5 |
| `TWILIO_AUTH_TOKEN` | Legacy account token (API key preferred) | Twilio console > Auth tokens | Critical | Quarterly | 30 |
| `TWILIO_CUSTOMER_PROFILE_SID` | Trust Hub customer profile | Twilio console > Trust Hub | Low | N/A | 1 |
| `TWILIO_FROM` | Legacy from-number alias | Config value | Low | N/A | 1 |
| `TWILIO_MESSAGING_SERVICE_SID` | Messaging service (not approved; kept disabled) | Twilio console | Low | N/A | 2 |
| `TWILIO_MS_NG` | Per-region messaging service override | Twilio console | Low | N/A | 2 |
| `TWILIO_MS_USA` | Per-region messaging service override | Twilio console | Low | N/A | 2 |
| `TWILIO_PHONE_NUMBER` | Primary US voice number | Twilio console > Phone numbers | Low | N/A | 24 |
| `TWILIO_PHONE_NUMBER_NG` | Optional NG long code | Twilio console | Low | N/A | 1 |
| `TWILIO_TWIML_APP_SID` | TwiML app backing the browser softphone | Twilio console > TwiML apps | Medium | N/A | 2 |
| `TWILIO_VOICE_FROM` | Outbound voice caller ID override | Config value | Low | N/A | 3 |
| `TWILIO_WHATSAPP_FROM` | Legacy WhatsApp from alias (disabled) | Config value | Low | N/A | 1 |
| `TWILIO_WHATSAPP_NUMBER` | Legacy WhatsApp sender (disabled) | Twilio console | Low | N/A | 13 |

### Resend

| Variable | Purpose | Obtain / rotate at | Sensitivity | Cadence | Consumers |
| --- | --- | --- | --- | --- | --- |
| `RESEND_API_KEY` | Outbound transactional email key | Resend dashboard > API keys | Critical | Quarterly | 25 |
| `RESEND_FALLBACK_FROM` | Fallback sender address | Config value | Low | N/A | 16 |
| `RESEND_SENDING_DOMAIN` | Verified sending domain (notify.rentmaikar.com) | Resend dashboard > Domains | Low | N/A | 16 |
| `RESEND_WEBHOOK_SECRET` | Verifies delivery/bounce/spam webhooks | Resend dashboard > Webhooks | High | Semi-annual | 2 |

### PayPal

| Variable | Purpose | Obtain / rotate at | Sensitivity | Cadence | Consumers |
| --- | --- | --- | --- | --- | --- |
| `PAYPAL_CLIENT_ID` | REST app client ID | PayPal developer dashboard | Medium | Annual | 11 |
| `PAYPAL_CLIENT_SECRET` | REST app secret | PayPal developer dashboard | Critical | Quarterly | 10 |
| `PAYPAL_ENV` | Alias of PAYPAL_MODE | Config value | Low | N/A | 7 |
| `PAYPAL_MODE` | sandbox | live | Config value | Low | N/A | 10 |
| `PAYPAL_WEBHOOK_ID` | Webhook ID used to verify IPN signatures | PayPal developer dashboard > Webhooks | High | On webhook re-creation | 2 |

### Paystack

| Variable | Purpose | Obtain / rotate at | Sensitivity | Cadence | Consumers |
| --- | --- | --- | --- | --- | --- |
| `PAYSTACK_PUBLIC_KEY` | Publishable checkout key | Paystack dashboard | Low (publishable) | With secret rotation | 1 |
| `PAYSTACK_SECRET_KEY` | NGN charges, transfers and webhook signing | Paystack dashboard > API keys | Critical | Quarterly | 10 |

### OPay

| Variable | Purpose | Obtain / rotate at | Sensitivity | Cadence | Consumers |
| --- | --- | --- | --- | --- | --- |
| `OPAY_ENV` | Alias of OPAY_ENVIRONMENT | Config value | Low | N/A | 5 |
| `OPAY_ENVIRONMENT` | sandbox | live | Config value / admin panel | Low | N/A | 6 |
| `OPAY_MERCHANT_ID` | Merchant identifier | OPay merchant portal | Medium | N/A | 6 |
| `OPAY_PUBLIC_KEY` | Publishable key | OPay merchant portal | Low | Annual | 6 |
| `OPAY_SECRET_KEY` | Signs charge and payout requests | OPay merchant portal | Critical | Quarterly | 8 |

### Persona

| Variable | Purpose | Obtain / rotate at | Sensitivity | Cadence | Consumers |
| --- | --- | --- | --- | --- | --- |
| `PERSONA_API_KEY` | KYC inquiry creation and reconciliation | Persona dashboard > API keys | Critical | Quarterly | 6 |
| `PERSONA_ENVIRONMENT_ID` | Environment scope | Persona dashboard | Low | N/A | 5 |
| `PERSONA_MASTER_TEMPLATE_ID` | Default inquiry template | Persona dashboard | Low | N/A | 3 |
| `PERSONA_TEMPLATE_ID` | Generic template fallback | Persona dashboard | Low | N/A | 3 |
| `PERSONA_TEMPLATE_ID_NG` | NG template (DB rules override) | Persona dashboard | Low | N/A | 1 |
| `PERSONA_TEMPLATE_ID_US` | US template (DB rules override) | Persona dashboard | Low | N/A | 1 |
| `PERSONA_WEBHOOK_SECRET` | Verifies Persona webhooks | Persona dashboard > Webhooks | High | Semi-annual | 1 |

### Hologram

| Variable | Purpose | Obtain / rotate at | Sensitivity | Cadence | Consumers |
| --- | --- | --- | --- | --- | --- |
| `HOLOGRAM_API_KEY` | SIM/cellular management | Hologram dashboard > API | High | Quarterly | 5 |
| `HOLOGRAM_ORG_ID` | Organisation scope | Hologram dashboard | Low | N/A | 5 |

### Traccar

| Variable | Purpose | Obtain / rotate at | Sensitivity | Cadence | Consumers |
| --- | --- | --- | --- | --- | --- |
| `TRACCAR_API_TOKEN` | Primary API auth | Traccar admin > Tokens | High | Quarterly | 3 |
| `TRACCAR_BASE_URL` | GPS server base URL | Self-hosted config | Low | N/A | 3 |
| `TRACCAR_EMAIL` | Basic-auth fallback user | Traccar admin | Medium | Annual | 3 |
| `TRACCAR_PASSWORD` | Basic-auth fallback password | Traccar admin | Critical | Quarterly | 3 |
| `TRACCAR_TOKEN` | Alias of TRACCAR_API_TOKEN | Traccar admin | High | Quarterly | 3 |

### GPSANDTRACK (Sarekon)

| Variable | Purpose | Obtain / rotate at | Sensitivity | Cadence | Consumers |
| --- | --- | --- | --- | --- | --- |
| `SAREKON_BASE_URL` | API base override | Config value | Low | N/A | 4 |
| `SAREKON_PASSWORD` | Telemetry account password | Provider portal | Critical | Quarterly | 4 |
| `SAREKON_USERNAME` | Alias of SAREKON_USER_ID | Provider portal | Medium | Annual | 4 |
| `SAREKON_USER_ID` | Telemetry account user | Provider portal | Medium | Annual | 4 |

### EMQX

| Variable | Purpose | Obtain / rotate at | Sensitivity | Cadence | Consumers |
| --- | --- | --- | --- | --- | --- |
| `EMQX_API_KEY` | Management API key | EMQX dashboard > API keys | High | Quarterly | 2 |
| `EMQX_API_SECRET` | Management API secret | EMQX dashboard > API keys | Critical | Quarterly | 2 |
| `EMQX_API_URL` | MQTT broker management API | EMQX dashboard | Low | N/A | 2 |
| `MQTT_JWT_SECRET` | Signs per-vehicle MQTT access tokens | Self-issued random | Critical | Quarterly | 1 |

### ElevenLabs

| Variable | Purpose | Obtain / rotate at | Sensitivity | Cadence | Consumers |
| --- | --- | --- | --- | --- | --- |
| `ELEVENLABS_AGENT_ID` | Conversational agent identifier | ElevenLabs dashboard > Agents | Low | N/A | 1 |
| `ELEVENLABS_API_KEY` | Alias accepted by code | ElevenLabs dashboard | High | Quarterly | 6 |
| `ELEVEN_LABS_API_KEY` | TTS/STT and accent conversion | ElevenLabs dashboard > API keys | High | Quarterly | 6 |

### Lovable AI Gateway

| Variable | Purpose | Obtain / rotate at | Sensitivity | Cadence | Consumers |
| --- | --- | --- | --- | --- | --- |
| `LOVABLE_API_KEY` | Server-side AI completions | Platform-managed; rotate via platform | High | Platform-managed | 23 |
| `LOVABLE_SEND_URL` | Optional override for the Lovable send endpoint (defaults to https://api.lovable.dev) | Config value | Low | N/A | 1 |

### Web Push

| Variable | Purpose | Obtain / rotate at | Sensitivity | Cadence | Consumers |
| --- | --- | --- | --- | --- | --- |
| `VAPID_PRIVATE_KEY` | Signs push payloads | Self-issued VAPID pair | Critical | Annual (invalidates subscriptions) | 2 |
| `VAPID_PUBLIC_KEY` | Public application server key | Self-issued VAPID pair | Low (public) | Only with private key | 3 |
| `VAPID_SUBJECT` | mailto: contact for push | Config value | Low | N/A | 2 |

### Firebase

| Variable | Purpose | Obtain / rotate at | Sensitivity | Cadence | Consumers |
| --- | --- | --- | --- | --- | --- |
| `FCM_SERVER_KEY` | Native Android push | Firebase console > Cloud Messaging | High | Annual | 1 |

### Meta

| Variable | Purpose | Obtain / rotate at | Sensitivity | Cadence | Consumers |
| --- | --- | --- | --- | --- | --- |
| `META_CAPI_ACCESS_TOKEN` | Conversions API token | Meta Events Manager | High | Annual | 1 |
| `META_PIXEL_ID` | Conversions API pixel | Meta Events Manager | Low | N/A | 1 |
| `META_TEST_EVENT_CODE` | CAPI debugging only | Meta Events Manager | Low | N/A | 1 |
| `META_WEBHOOK_VERIFY_TOKEN` | Webhook subscription handshake | Self-issued; entered in Meta | Medium | Annual | 1 |

### WhatsApp Cloud

| Variable | Purpose | Obtain / rotate at | Sensitivity | Cadence | Consumers |
| --- | --- | --- | --- | --- | --- |
| `WA_VERIFY_TOKEN` | Webhook verification token | Self-issued; entered in Meta | Medium | Annual | 1 |

### WhatChimp

| Variable | Purpose | Obtain / rotate at | Sensitivity | Cadence | Consumers |
| --- | --- | --- | --- | --- | --- |
| `WHATCHIMP_API_BASE` | API base | Config value | Low | N/A | 2 |
| `WHATCHIMP_API_KEY` | Optional WhatsApp route | WhatChimp dashboard | High | Quarterly if enabled | 2 |
| `WHATCHIMP_PHONE_NUMBER_ID` | Sender identifier | WhatChimp dashboard | Low | N/A | 2 |
| `WHATCHIMP_VERIFY_TOKEN` | Webhook handshake | Self-issued | Medium | Annual | 1 |
| `WHATCHIMP_WEBHOOK_SECRET` | Webhook HMAC | Shared value | High | Semi-annual | 2 |

### ManyChat

| Variable | Purpose | Obtain / rotate at | Sensitivity | Cadence | Consumers |
| --- | --- | --- | --- | --- | --- |
| `MANYCHAT_API_TOKEN` | Optional automation route | ManyChat dashboard | High | Quarterly if enabled | 2 |
| `MANYCHAT_WEBHOOK_SECRET` | Webhook HMAC | Shared value | High | Semi-annual | 2 |

Consumer counts are the number of edge functions (plus `gateway`) that read the variable; the per-function list is in `API-CONTRACT.md`.

## 2. Ownership handover

Provider consoles that must change ownership or gain a backend-team member with admin rights, in priority order:

1. **Supabase / Lovable Cloud** — database, edge function secrets, auth. Service role key is platform-managed and not retrievable; the backend team must operate through the platform.
2. **Sent.dm** — primary SMS/WhatsApp. Highest traffic impact if mishandled.
3. **Resend** — all outbound email; also owns DNS verification for `notify.rentmaikar.com`.
4. **Twilio** — voice only (messaging deliberately disabled via `TWILIO_MESSAGING_ENABLED=false`).
5. **Paystack, PayPal, OPay** — money movement; require finance sign-off before key rotation.
6. **Persona** — KYC; rotation invalidates in-flight inquiries, so drain first.
7. **Termii, Hologram, Traccar, GPSANDTRACK, EMQX, ElevenLabs, Meta, Firebase** — secondary providers.

## 3. Rotation order (zero-drop sequence)

Rotate in this order so no inbound callback is rejected and no outbound send fails mid-flight:

| Step | Action | Why this order |
| --- | --- | --- |
| 1 | Rotate internal self-issued secrets: `CRON_SECRET`, `PROVIDER_SESSION_KEY`, `MQTT_JWT_SECRET` | No external party holds them; safe to change any time. MQTT token rotation forces device re-auth — do it in a maintenance window. |
| 2 | Register new webhook secrets **alongside** the old ones where the provider supports dual secrets (Resend, Persona) | Callbacks keep verifying during the switch. |
| 3 | Update webhook URLs at each provider to the new backend host, keeping the old host live | Traffic drains gradually. |
| 4 | Rotate single-secret webhook credentials (`SENT_WEBHOOK_SECRET`, `TERMII_WEBHOOK_SECRET`, `WHATCHIMP_WEBHOOK_SECRET`, `MANYCHAT_WEBHOOK_SECRET`) | Brief verification gap; do in a low-traffic window (before 08:00 WAT / after 21:00 ET). |
| 5 | Rotate outbound messaging keys (`SENT_API_KEY`, `TERMII_API_KEY`, `RESEND_API_KEY`) | Only affects new sends; queued items retry. |
| 6 | Rotate Twilio API key pair (`TWILIO_API_KEY_SID` / `TWILIO_API_KEY_SECRET`), then delete the old key | Active calls are unaffected; new REST calls use the new pair. |
| 7 | Rotate payment secrets (`PAYSTACK_SECRET_KEY`, `PAYPAL_CLIENT_SECRET`, `OPAY_SECRET_KEY`) | Requires finance sign-off and a pause on payout cron jobs; verify webhook signing still validates afterwards. |
| 8 | Rotate KYC and IoT credentials (Persona, Hologram, Traccar, Sarekon, EMQX) | Drain in-flight Persona inquiries first; IoT devices reconnect automatically. |
| 9 | Rotate `VAPID_PRIVATE_KEY` only if compromised | Rotation invalidates every existing web-push subscription and forces re-subscribe. |

## 4. Verification after each rotation

| Provider | Verification |
| --- | --- |
| Sent.dm | `GET {base}/sent-health` returns `whatsapp_ready: true`; send a live test from Admin → Messaging and confirm queued → delivered on `/admin/sms-delivery` |
| Resend | Trigger a transactional email; confirm delivery on `/admin/email-delivery` and that a `resend-events` webhook lands |
| Twilio | Place an inbound test call; confirm it appears in the Call Center queue with ringing status |
| Paystack / PayPal / OPay | `get-psp-config` reports `configured: true` for each; run a sandbox charge and confirm the webhook verifies |
| Persona | Create a test inquiry and confirm `persona-webhook` signature verification passes |
| Hologram / Traccar / Sarekon / EMQX | Admin → Provider Health shows all green; telemetry continues arriving within one cron interval |
| Cron token | Confirm `process-email-queue` and `dispatch-event-notifications` keep logging runs after `CRON_SECRET` changes |

## 5. Rules

- Secret values are never written to the repository, this document, or `.env` files in version control. They live in the platform secret store and are injected at runtime.
- `SUPABASE_SERVICE_ROLE_KEY` and the database password are not retrievable on Lovable Cloud. Do not attempt to export them.
- Publishable keys (`PAYSTACK_PUBLIC_KEY`, `OPAY_PUBLIC_KEY`, `VAPID_PUBLIC_KEY`, Supabase anon/publishable) are safe in client code.
- Test-only variables (`TEST_ADMIN_JWT`, `TEST_USER_A_ID`, `TEST_USER_B_ID`, `EMAIL_E2E_RECIPIENT`) must never be set in production.
- Twilio is approved for **voice only**. `TWILIO_MESSAGING_ENABLED` must remain `false` until A2P messaging approval is granted.

