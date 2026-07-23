# Orchestrator hardening, telemetry health, audit viewer, hero refresh

## 1. Verify Traccar → MQTT → pluginManager → vehicle_analytics_events E2E
- Add an in-app **Test Panel** to `/admin/orchestrator` that injects Traccar and MQTT events and then reads back the newly-written `vehicle_analytics_events` rows for `demo-vehicle-1`, showing pass/fail per stage:
  1. Traccar bridge fires → orchestrator state updated
  2. MQTT bridge fires → orchestrator state updated
  3. `pluginManager.process` invoked on active plugins (asserted via plugin call counter)
  4. Row present in `vehicle_analytics_events` within 3s (queried via supabase)
- Add a Vitest integration test `src/services/__tests__/orchestrator-e2e.test.ts` that mocks supabase and asserts the same flow.

## 2. Role-based access control on `/admin/orchestrator`
- Route is currently only wrapped in `ProtectedRoute`. Wrap it with `allowedRoles={['admin']}` and additionally check `has_admin_assistant_permission('orchestrator_access')` for assistants.
- Hide demo injectors and plugin toggles unless `userRole === 'admin'` (assistants get read-only view).

## 3. Telemetry health indicator + stall alert
- Track `lastTraccarEventAt` and `lastMqttEventAt` inside `residentOrchestrator`.
- New `TelemetryHealthCard` on `/admin/orchestrator`: green/amber/red badges per feed, configurable stall window (default 5 min, admin-adjustable via slider stored in `localStorage`).
- When a feed exceeds the window, show a toast and insert an `admin_notifications` row of type `telemetry_stall` (once per stall cycle).

## 4. Admin audit log viewer
- New card section on `/admin/orchestrator` (and route `/admin/audit-log` for a full-page view) listing recent `admin_audit_log` entries.
- Filters: user (email search), action type (dropdown from distinct actions), date range.
- Paginated (25/page), read-only, admin-only.

## 5. Plugin toggle live test
- Add a **Run plugin toggle test** button that:
  1. Records baseline plugin call count
  2. Disables a plugin, injects event, asserts call count unchanged
  3. Re-enables, injects event, asserts call count incremented
  4. Reports pass/fail inline
- Add `getCallCount()` to `pluginManager` for observability.

## 6. Hero background refresh
- Regenerate `src/assets/hero-cars-bg.png` from the current Hero component context (fresh image, no historical reference).
- Delete the existing `hero-cars-bg.png` asset first so no cached editor pointer remains, then generate a new one at the same path. HeroSection import path stays the same, so preview and deployed site render identically.

## Technical details
- No DB schema changes required — `admin_audit_log`, `admin_notifications`, and `vehicle_analytics_events` already exist.
- Files to touch:
  - `src/pages/admin/OrchestratorPage.tsx` (RBAC gating, health card, audit card, E2E + toggle test panels)
  - `src/plugins/pluginManager.ts` (call counter, `getCallCount`)
  - `src/services/residentOrchestrator.ts` (`lastTraccarEventAt`, `lastMqttEventAt`, getters)
  - `src/App.tsx` (`allowedRoles={['admin']}` on orchestrator route, new `/admin/audit-log` route)
  - `src/components/admin/TelemetryHealthCard.tsx` (new)
  - `src/components/admin/AdminAuditLogViewer.tsx` (new)
  - `src/components/admin/OrchestratorE2ETestPanel.tsx` (new)
  - `src/services/__tests__/orchestrator-e2e.test.ts` (new)
  - `src/assets/hero-cars-bg.png` (regenerated)
