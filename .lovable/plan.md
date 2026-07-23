## What's already in place

The recently uploaded GitHub files fall into two groups:

**Docs (rules — no code to run):** `architecture/*.md`, `docs/architecture/*.md` — Hologram/Persona separation, verification rules, orchestrator design.

**Code (already compiles and boots):** `src/services/residentOrchestrator.ts`, `traccarBridge.ts`, `mqttBridge.ts`, `resident-ochestrator/types.ts`, `src/plugins/{pluginManager,pluginTypes}.ts`, `evBattery`, `obd`, and `index.ts`. These are imported by `src/main.tsx` and typecheck clean.

What's missing is that nothing in the running app actually *feeds* the orchestrator or *shows* its output, and the plugin manager has no admin surface.

## Plan

### 1. Feed real telemetry into the Resident Orchestrator
- Call `receiveTraccarEvent(...)` from `useVehicleTracking` whenever a Traccar position/event arrives.
- Call `receiveMQTTMessage(topic, payload)` from the MQTT client path in `src/lib/emqx-config.ts` / vehicle telemetry subscriber.
- Persist orchestrator `AnalyticsEvent`s to a new `vehicle_analytics_events` table (severity, type, vehicle_id, payload) so alerts survive reloads.

### 2. Plugin lifecycle wiring
- Route every orchestrator event through `pluginManager.process(event)` so `evBattery`/`obd`/future plugins actually see traffic.
- Normalize plugin event shape to `{ type, payload, vehicleId, source, timestamp }` and update the two example plugins to match.

### 3. Admin surface for orchestrator + plugins
- New page `src/pages/admin/OrchestratorPage.tsx`: live vehicle state table (from `orchestrator.getVehicleState`), recent analytics events, plugin list with enable/disable toggles calling `pluginManager.activate/deactivate`.
- Add nav entry under Fleet Connectivity → "Resident Orchestrator" (admin only).

### 4. Enforce Hologram/Persona separation rules from the docs
- Audit for any code path where Persona modules touch Hologram tables/functions or vice versa; add an ESLint boundary rule (`no-restricted-imports`) that forbids `src/integrations/persona/**` from importing `src/integrations/hologram/**` and the reverse.
- Add a short README at `src/integrations/persona/README.md` and `src/integrations/hologram/README.md` linking to the rule docs.

### 5. Verification-state independence (from IdentityVerificationArchitecture.md)
- Ensure `profiles` exposes independent booleans: `email_verified`, `phone_verified`, `persona_verified`, `referee_verified`, `payment_proxy_verified`. Add any missing columns via one migration and backfill from existing state.
- No auto-completion between them (add a DB trigger that blocks writes flipping `persona_verified` from an email/phone code path).

### 6. Database
One migration adds:
- `vehicle_analytics_events` (vehicle_id, category, event_type, payload jsonb, severity, created_at) + GRANTs + RLS (admins read all; owners read their vehicles).
- Any missing verification columns on `profiles`.

### 7. Verification
- `tsgo --noEmit`, existing vitest suite, and a new unit test that feeds a synthetic Traccar position through the orchestrator and asserts `vehicle_analytics_events` was inserted and plugins fired.

## Technical notes
- No changes to auto-generated files (`src/integrations/supabase/{client,types}.ts`, `.env`, `supabase/config.toml`).
- Orchestrator remains in-memory for live state; only analytics events persist.
- No rewrites of Traccar or Hologram edge functions — this is purely additive per `resident-ochestrator.md` rule #1 ("Preserve Existing Systems").
- Scope explicitly excludes rebuilding the full Hologram eSIM marketplace and Persona template refactors described in the docs — those are separate multi-turn efforts and already partially exist. Say the word and I'll plan them next.

Approve and I'll implement steps 1–7 in one pass.
