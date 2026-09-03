# Rentmaikar Backend Cutover Notes

Generated 2026-09-03.

## 1. Domain topology

| Role | Domain | Notes |
| --- | --- | --- |
| Frontend | `rentmaikar.com` (alias `www.rentmaikar.com`) | React SPA; only consumer of the backend API |
| Backend API | `staging.rentmaikar.com` | Express gateway; canonical `PUBLIC_BACKEND_URL` |
| Inbound mail | `backend.rentmaikar.com` | `support@`, `payments@`, `documents@`, `admin@`, `legal@` route to queues |
| Outbound mail | `notify.rentmaikar.com` | Verified Resend sending domain |

## 2. Webhook endpoints to repoint

| Provider | Current endpoint | Console location |
| --- | --- | --- |
| Sent.dm (inbound) | `https://staging.rentmaikar.com/api/webhooks/sent` | Sent dashboard → Webhooks |
| Sent.dm (status) | `https://staging.rentmaikar.com/api/webhooks/sent/status` | Sent dashboard → Webhooks |
| Twilio voice | `https://staging.rentmaikar.com/api/webhooks/twilio` and `https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/incoming-call-forward` | Twilio console → Phone numbers |
| Termii | `https://staging.rentmaikar.com/api/webhooks/termii` | Termii dashboard |
| Resend events | `https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/resend-events` | Resend dashboard → Webhooks |
| Inbound email | `https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/email-webhook` | Mail routing for `backend.rentmaikar.com` |
| Paystack | `https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/paystack-webhook` | Paystack dashboard → Webhooks |
| PayPal | `https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/paypal-webhook` | PayPal developer → Webhooks |
| OPay | `https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/opay-webhook` | OPay merchant portal |
| Persona | `https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/persona-webhook` | Persona dashboard → Webhooks |
| Twilio call status | `https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/voip-status-callback`, `https://bwvocmhcledbwqlpcswp.supabase.co/functions/v1/recording-status-callback` | Twilio console |

## 3. Cutover sequence

1. Stand up the new backend host and confirm `/api/health` and `/api/domains` respond.
2. Load the environment from `backend.env.template` with values transferred out-of-band.
3. Point `VITE_API_BASE_URL` in the frontend at the new host (single change; see `src/lib/api-config.ts`).
4. Repoint webhooks provider by provider, keeping the old host live until each provider is confirmed.
5. Move pg_cron jobs last — they are the only unattended callers and must carry the current `CRON_SECRET`.
6. Decommission the old host only after 24 hours with zero traffic on it.

## 4. Post-cutover smoke checklist

- [ ] `GET /api/health` returns `status: healthy`
- [ ] `GET /api/health/diagnostics` shows every expected provider as configured
- [ ] Frontend loads and an authenticated request reaches the backend with a valid bearer token
- [ ] Outbound SMS sends and reaches `delivered` on `/admin/sms-delivery`
- [ ] Outbound WhatsApp sends and reaches `delivered`
- [ ] Transactional email sends from `notify.rentmaikar.com` and a delivery webhook lands
- [ ] Inbound email to `support@backend.rentmaikar.com` reaches the inbox
- [ ] Inbound voice call rings the Call Center queue
- [ ] Browser softphone connects with microphone and speaker working
- [ ] A sandbox payment completes and its webhook verifies
- [ ] Persona inquiry creation succeeds
- [ ] Telemetry continues arriving; Provider Health is green
- [ ] Every pg_cron job logs a successful run within its interval

## 5. Reference documents

- `API-CONTRACT.md` — every endpoint, its auth mode and the secrets it reads
- `openapi.yaml` — machine-readable spec of the same surface
- `backend.env.template` — empty env skeleton
- `CREDENTIALS.md` — credential inventory and rotation plan

