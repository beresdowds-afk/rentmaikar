
## Scope

Four integrations, each behind secrets so nothing breaks until credentials are added.

---

### 1. Traccar — parallel with EMQX + admin flip switch

- `telemetry_providers` already supports multiple rows with `is_active` + `priority`. Add UI in **Admin → Telemetry Providers** with a single "Active provider" radio (EMQX / Traccar) that flips `is_active` atomically (a DB transaction so only one row is active at a time).
- Keep both adapters registered. Every telemetry-consuming edge function routes through `getTelemetryAdapter()` (already exists in `_shared/telemetry-client.ts`). Migrate the direct EMQX callers (`emqx-monitoring`, `telemetry-health-monitor`, `iot-accident-detection`, `enforce-call-in-geofence`, `vehicle-shutdown-warning`, `process-payment-unlock`) to the adapter so the flip actually takes effect.
- Add a "shadow read" mode: when Traccar is inactive, still hit its `getDeviceState` in `telemetry-health-monitor` and log divergence to a new `telemetry_shadow_log` table. Lets us validate Traccar with real vehicles before flipping.
- Secrets needed (request via `add_secret`): `TRACCAR_BASE_URL`, `TRACCAR_API_TOKEN`.

### 2. Hologram — stubbed behind secrets

- New file `supabase/functions/_shared/hologram-client.ts` with `activateSim`, `suspendSim`, `getSimUsage`, `listSims`. All methods check `HOLOGRAM_API_KEY` / `HOLOGRAM_ORG_ID`; if missing, return `{ ok: false, reason: "not_configured" }` — no throws.
- New table `iot_sim_cards` (iccid, msisdn, device_id FK, status, data_usage_mb, activated_at, provider defaults to `'hologram'`).
- New edge function `hologram-sync` (cron-authenticated) that walks `iot_sim_cards` and refreshes usage/status. No-op when unconfigured.
- Admin panel section "SIM Cards" showing the table read-only for now, with a "Configure Hologram" banner when secrets are absent.
- Secrets (requested only when user confirms rollout): `HOLOGRAM_API_KEY`, `HOLOGRAM_ORG_ID`.

### 3. Whatchimp — third WhatsApp provider (global)

- Extend `communication_providers` rows with a `whatchimp` entry alongside `twilio` and `termii`.
- New `_shared/whatchimp-client.ts` with `sendMessage({ to, body, templateName?, mediaUrl? })` calling the Whatchimp/Meta Business Cloud API. Auth via `WHATCHIMP_API_KEY` + `WHATCHIMP_PHONE_NUMBER_ID`.
- Update `send-inbox-reply` and `send-sms-notification` region router: if the destination region's `communication_providers.preferred_whatsapp_provider = 'whatchimp'`, route WhatsApp through Whatchimp; otherwise keep current Twilio(US)/Termii(NG) behavior. Global fallback for regions with no local provider = Whatchimp.
- New webhook `supabase/functions/whatchimp-webhook/index.ts` (verify_jwt=false, HMAC signature check with `WHATCHIMP_WEBHOOK_SECRET`) that normalizes inbound messages into `inbox_conversations` / `inbox_messages` — same shape as Twilio/Termii webhooks.
- Admin Communication Providers UI: add per-region WhatsApp provider dropdown (Twilio / Termii / Whatchimp).
- Secrets: `WHATCHIMP_API_KEY`, `WHATCHIMP_PHONE_NUMBER_ID`, `WHATCHIMP_WEBHOOK_SECRET`.

### 4. ManyChat — Instagram/Facebook DMs + campaign automation

- New `_shared/manychat-client.ts`: `sendContent(subscriberId, flowNs)`, `sendMessage(subscriberId, text)`, `tagSubscriber`, `triggerFlow`. Auth via `MANYCHAT_API_TOKEN`.
- New webhook `supabase/functions/manychat-webhook/index.ts` receives Instagram/FB DM events → writes to `inbox_conversations` with `channel='instagram'` / `'facebook_messenger'` (values already reserved in the social messaging channels doc).
- `send-inbox-reply` gains IG/FB routing: when conversation channel is Instagram/Facebook, dispatch via ManyChat.
- Outbound campaigns: extend `social_media_campaigns` execution to call `manychat.triggerFlow` for `platform in ('instagram','facebook_messenger')`. Existing campaigns table already has the columns.
- Admin "Social Messaging" tab: connection status + flow ID mapping (`social_messaging_configs`).
- Secrets: `MANYCHAT_API_TOKEN`, `MANYCHAT_WEBHOOK_SECRET`.

---

## Rollout order

1. Traccar parallel + flip switch (adapter already exists, biggest safety upside).
2. Whatchimp WhatsApp router + webhook (unblocks global rollout).
3. ManyChat webhook + inbox routing.
4. Hologram stub + `iot_sim_cards` table.

Each phase ships behind secrets so nothing activates until you provide credentials. I'll request secrets with `add_secret` only when we reach each phase and you confirm.

## Technical notes

- No changes to existing EMQX behavior — Traccar runs alongside, and the flip is an admin action.
- All new webhooks: `verify_jwt = false` + HMAC signature check in code (same pattern as `termii-webhook`).
- RLS + GRANTs added for `iot_sim_cards` (admin-only), `telemetry_shadow_log` (admin-only).
- Frontend admin UI additions kept minimal: one radio switch (Traccar flip), one dropdown per region (WhatsApp provider), one read-only table (SIM cards), one status card (ManyChat).

Confirm and I'll start with Phase 1 (Traccar).
