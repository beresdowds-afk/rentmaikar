# Unified GPS Location Architecture — Findings & Implementation Plan

## 1. What already exists (inspection results)

**Providers / server clients**
- `_shared/sarekon-client.ts` (787 lines) — already spec-accurate for SareKon v0.7.0: `sid` session auth with cross-instance session cache (`provider_api_sessions`), credential fingerprinting, `pagekey`/`nextkey` pagination, 429 + `-2200` rate-limit and `-1600` session-expiry handling, `device_id`-based addressing, `normaliseBaseUrl`. It already calls `/location/list.json` (per-device, `locations()`), but **has no fleet-wide batched `device_ids[]` current-location method**.
- `_shared/traccar-client.ts` + `traccar-admin` (`action: "sync"`) — pulls devices + `latestPositions()` and writes into `iot_devices`.
- `_shared/emqx-client.ts` — EMQX v5 management API incl. `publish()` / `publishBulk()`. `mqtt-ingestion-worker` (1-min cron) pulls retained messages on `rentmaikar/vehicle/{vehicleId}/{telemetry|location|status}`.

**Normalisation pipeline (already unified, partially)**
- `_shared/orchestrator-core.ts` → `normalizeEvent` / `reduceState` / `runAnalytics`.
- `_shared/telemetry-ingest-core.ts` → `ingestRecords()` writes `vehicle_telemetry_state` (latest), `mqtt_telemetry_logs` (history), `vehicle_analytics_events`, and `telemetry_ingest_runs` (run log).
- Used by `telemetry-ingest` and `mqtt-ingestion-worker` — **but not by the Traccar or SareKon sync paths**, which write `iot_devices` directly. That is the core architectural gap.

**Database**
- `iot_devices` — serial_number (unique), provider, vehicle_id, latitude, longitude, last_ping, health_details JSON. Acts as the de-facto device↔vehicle map, but keyed on **serial**, with the SareKon system `device_id` buried in `health_details.sarekon_dvd_id`.
- `vehicle_telemetry_state` — latest state per vehicle (realtime-published). No `provider_device_id`, no separate `gps_timestamp` vs `received_at`, no `is_historic`, no `address`/`heading`/`altitude`.
- `mqtt_telemetry_logs` — history (payload JSON).
- `device_identities` — cross-provider identity registry (has `telemetry_provider`, `serial_number`, `imei`, `vehicle_id`).
- Cron: `iot-scheduled-sync` every minute (dispatches hologram/traccar/sarekon per `iot_sync_schedule.interval_minutes`), `mqtt-ingestion-worker` every minute.

**Maps (important conflict)**
- `src/components/tracking/VehicleTrackingMap.tsx` (react-leaflet) — used by AdminDashboard and AdminAssistantDashboard; reads `useFleetDeviceLocations()` → `iot_devices`.
- `src/components/admin/TraccarLiveMap.tsx` (leaflet) — used inside `IoTMonitoringHub`.
- `src/integrations/traccar/map/*` — vendored MapLibre code, not mounted in the app.

## 2. Conflicts with the specification

1. **"Do not create a third map" — two maps already exist.** I will not add one; I propose consolidating both onto the same normalized data source, and (optionally, on your say-so) retiring `TraccarLiveMap` in favour of the shared map. No new map either way.
2. **MQTT topic mismatch.** Existing topic is `rentmaikar/vehicle/{id}/location` (singular); the spec asks for `rentmaikar/vehicles/{id}/location` (plural). Renaming would break the ingestion worker, device firmware topics, `vehicle_mqtt_credentials` ACL prefixes and the frontend subscriptions. **Proposal: keep singular as canonical**, and treat the spec topic as an alias published in parallel behind a flag if you want the documented form.
3. **15-second polling vs pg_cron.** pg_cron minimum granularity is 1 minute. Proposal: the worker runs once per minute and performs an internal 4×15s loop (interval read from `iot_sync_schedule`/settings), keeping the interval configurable without new infrastructure.
4. **Provider device ID.** SareKon's system `device_id` is currently not a first-class column; sync keys on serial. Needs a proper mapping column/table.
5. **`vehicle_analytics_events.vehicle_id` is a UUID FK** — unmapped provider devices are dropped from analytics today. Locations for unmapped devices will be persisted at device level only, never invented against a vehicle.

## 3. Proposed implementation

**A. Provider→vehicle device mapping (reuse, don't duplicate)**
Extend `iot_devices` with `provider_device_id` (+ unique index on `(provider, provider_device_id)`) rather than creating `vehicle_gps_devices`. Backfill SareKon values from `health_details.sarekon_dvd_id` and Traccar from its numeric device id. Keeps one device registry, one map source.

**B. Normalized location model**
New `_shared/location-types.ts` with `NormalizedVehicleLocation` (vehicleId, provider, providerDeviceId, lat, lng, altitude, speed, heading, address, gpsTimestamp, receivedAt, isHistoric) + `validateCoordinates()`.

**C. Unified Location Service**
New `_shared/unified-location-service.ts`:
- resolve device → vehicle via `iot_devices`;
- validate coordinates (reject NaN/Inf/out-of-range, per-device isolation);
- dedupe against last known (lat/lng/speed/heading/gpsTimestamp) with a configurable heartbeat interval;
- upsert latest into `vehicle_telemetry_state` (extended columns) and `iot_devices` (so both existing maps keep working);
- append history to `mqtt_telemetry_logs`;
- publish normalized payload to EMQX via the existing client;
- update last-seen / stale status; never clear a previous fix on an empty poll.

**D. Adapters** (`_shared/location-adapters/`): `sarekon.ts`, `traccar.ts`, `emqx.ts` — pure functions provider-payload → `NormalizedVehicleLocation[]`. `sarekon-admin`/`traccar-admin` sync paths and `telemetry-ingest-core` route through them, so all three providers converge on one service. Each adapter fails independently.

**E. SareKon batched current-location + worker**
- Add `currentLocations(deviceIds: string[])` to `sarekon-client.ts` — batched `device_ids[]`, bounded pagination, existing 429/session handling reused.
- New edge function `sarekon-location-worker`: cron-authed, resolves active SareKon device ids, loops 4×15s (configurable), adapter → unified service, logs to `telemetry_ingest_runs` and `iot_sync_activity_log`. Never logs credentials or `sid`.
- New pg_cron job at `* * * * *`.

**F. Frontend (no new map)**
- Extend `useFleetDeviceLocations` to read the normalized fields (provider, provider_device_id, gps_timestamp vs received_at, address, heading) and expose LIVE vs "last seen N min ago" using the existing stale threshold.
- `VehicleTrackingMap` and `TraccarLiveMap` render provider-agnostic data; provider becomes a badge/filter only. No provider-specific parsing in either map.
- Extend the existing GPSANDTRACK/telemetry admin panels with safe diagnostics: status, last poll, last location, configured devices, returned count, last safe error.

**G. Tests** (`vitest`, mocks only, no real credentials): adapters, coordinate validation, dedupe/heartbeat, stale + empty-response retention, unknown/inactive device mapping, MQTT payload/topic, provider isolation, multi-vehicle.

## 4. Files to change

**New**
- `supabase/functions/_shared/location-types.ts`
- `supabase/functions/_shared/unified-location-service.ts`
- `supabase/functions/_shared/location-adapters/{sarekon,traccar,emqx}.ts`
- `supabase/functions/sarekon-location-worker/index.ts`
- `src/services/__tests__/unified-location.test.ts` (+ adapter tests)

**Modified**
- `supabase/functions/_shared/sarekon-client.ts` (add batched `currentLocations`)
- `supabase/functions/_shared/telemetry-ingest-core.ts` (route through unified service)
- `supabase/functions/sarekon-admin/index.ts`, `traccar-admin/index.ts` (sync writes via adapters)
- `supabase/functions/mqtt-ingestion-worker/index.ts` (EMQX adapter)
- `src/hooks/useFleetDeviceLocations.ts`, `src/hooks/useVehicleTracking.ts`
- `src/components/tracking/VehicleTrackingMap.tsx`, `src/components/admin/TraccarLiveMap.tsx` (data source + live/stale badge only)
- `src/components/admin/GPSANDTRACKStatusPanel.tsx` / `TelemetryHealthCard.tsx` (diagnostics)

**Untouched:** `mqtt-client.ts` topic scheme, EMQX credentials/ACL, Traccar client transport, existing location rows.

## 5. Database migrations required

One additive migration, no drops, no data loss:
1. `iot_devices`: add `provider_device_id text`; unique index `(provider, provider_device_id)` where not null; backfill from `health_details`.
2. `vehicle_telemetry_state`: add `provider text`, `provider_device_id text`, `altitude numeric`, `heading numeric`, `address text`, `gps_timestamp timestamptz`, `received_at timestamptz`, `is_historic boolean default false`. Existing `latitude/longitude/speed/last_event_at` retained.
3. Indexes on `vehicle_telemetry_state(provider)`, `(provider_device_id)`, `(gps_timestamp desc)`; `mqtt_telemetry_logs(vehicle_id, received_at desc)`.
4. Grants unchanged (`authenticated` SELECT, `service_role` ALL); RLS policies unchanged.
5. Seed `iot_sync_schedule` row for a `sarekon_location` provider entry + new pg_cron job for `sarekon-location-worker`.

## 6. Open decisions for you

1. MQTT topic: keep `rentmaikar/vehicle/...` (recommended) or dual-publish the spec's plural form?
2. `TraccarLiveMap`: keep both maps on unified data, or retire it into the shared map?
3. Do you have SareKon credentials configured in this workspace for the live verification step in §26 of the spec? Without them I can only certify mocked tests.
