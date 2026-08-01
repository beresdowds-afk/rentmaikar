# Platform-wide anomaly & consistency fixes

Scope covers 7 workstreams from your message. I'll ship them in one pass, each behind a clearly-scoped diff so any single item can be reverted independently.

## 1. Region-aware phone inputs (platform-wide)

Problem: `PhoneNumberInput` has a hard-coded `defaultCountry='US'` fallback and its placeholder example is stale. Several screens pass literal `'US'`/`'NG'` instead of consuming region. Country banner (flag) can desync from IDD when `autoCountry` resolves late.

Fix:
- `src/components/ui/phone-number-input.tsx`
  - Drive `defaultCountry` from `useDefaultPhoneCountry()` when caller passes nothing; use `RegionContext.country` mapped through `phone_reference.iso2` as authoritative fallback.
  - Show region-correct placeholder via `usePhoneExample(country)` (already exists), never a hard-coded `+1 555…` string.
  - Remove the `key={country}` remount hack in favor of controlled `country`/`onCountryChange` so flag ↔ IDD stay in sync on every keystroke.
- Sweep every consumer (`ProfileSettingsPage`, `DriverRegistration`, `OwnerRegistration`, `PhoneVerification`, `IoTDevicePurchase`, admin `CallDialer`/`CallGroups`/`RoleManagement`/`SupportUserManagement`/`AdminSupportTaskManagement`, `phone-number-field`) to stop passing `'US'` literals and instead pull from `RegionContext` → `phone_reference`.
- Delete the legacy `+1 5551234567` placeholder strings; every placeholder now comes from `phone_reference.example_national` for the selected country.

## 2. E.164 normalization + region validation on save

Problem: some code paths save whatever the user typed; DB trigger `is_valid_e164` exists but is not enforced everywhere; region mismatch isn't checked.

Fix:
- New helper `src/lib/phone-normalize.ts`:
  - `normalizeToE164(raw, expectedCountry)` → returns `{ e164, country }` or throws with a friendly reason.
  - `assertMatchesRegion(parsed, selectedCountry)` — rejects when parsed country ≠ selected region.
- Wire the helper into every write path: `ProfileSettingsPage.save`, both registration wizards, `PhoneVerification.handleVerifyCode`, admin user-create dialogs.
- Migration: add `CHECK (phone IS NULL OR public.is_valid_e164(phone))` on `profiles.phone` (trigger already exists — this backs it with a constraint). No data backfill; existing rows stay untouched and are validated on next update

## 3. Centralized Post-Login Routing (Stability & Error Prevention)

### Problem

The current post-authentication flow can attempt to determine the user's destination before all required authentication state has been fully initialized. When user profile data, role assignments, onboarding status, or region information are still loading, the routing logic may evaluate incomplete data and redirect prematurely.

This can produce the following sequence:

- Landing page renders.
- Existing authentication session is restored.
- "Loading your dashboard..." is displayed.
- Route resolution executes before required data is available.
- An invalid or incorrect destination is selected, or an exception is thrown.
- The application falls through to the global `ErrorBoundary`, displaying the generic "Something went wrong" page.

### Required Behaviour

Create a single `resolvePostLoginRoute(user, profile, roles)` helper that executes **only after** all required authentication state has been successfully loaded and validated.

The helper must:

- Wait until authentication initialization has completed.
- Wait until the user profile has been successfully retrieved.
- Wait until role assignments have been loaded.
- Wait until onboarding status has been determined.
- Return a valid destination only when all required data is available.
- Never evaluate partially-loaded or undefined state.
- Never redirect to `/` as a fallback for authenticated users unless explicitly intended.
- Return a safe fallback route if required data cannot be resolved instead of throwing an exception.

### Routing Rules

- Verified users with completed onboarding → role-specific dashboard.
- Verified users with incomplete onboarding → appropriate onboarding workflow.
- Authenticated users with incomplete profile data → profile completion flow.
- Unauthenticated users → authentication page.

### Stability Requirements

The routing helper must be deterministic and idempotent.

It must:

- Avoid multiple redirects during a single authentication cycle.
- Prevent redirect loops.
- Prevent navigation while authentication state is still loading.
- Handle missing or delayed profile data gracefully.
- Log routing failures for diagnostics rather than allowing unhandled exceptions to propagate to the global `ErrorBoundary`.


- Maximum authentication initialization timeout (e.g. 10–15 seconds).
- Maximum profile/role/onboarding fetch timeout.
- Retry transient network failures with exponential backoff.
- Distinguish loading, success, failed, and timeout states.
- If required data cannot be resolved after retries, route to a dedicated recovery page (for example /session-recovery or /account-loading-error) rather than remaining on an infinite loading screen.
- Allow the user to retry without manually refreshing the browser.
- Always clear loading indicators after routing succeeds or a recovery route is chosen.
- Preserve intended deep-link destinations and continue once initialization completes.
- Emit structured diagnostic logs and telemetry for every routing decision and timeout.

This routing helper should become the single source of truth for all authentication-based navigation and be used consistently by `Auth.tsx`, `OnboardingRedirect.tsx`, deep-link handlers, session restoration, and any future login or onboarding flows.

## 4. Admin ↔ Admin-Assistant dashboard sync

Problem: Assistants see stale tab visibility because `TAB_PERMISSION_MAP` and the admin dashboard tab list can drift.

Fix:
- Derive the admin dashboard tab list from `TAB_PERMISSION_MAP` keys (single source of truth).
- Add a runtime dev assertion (in `useAssistantPermissions`) that warns when an admin tab has no entry in the map.
- Assistant dashboard already uses `canAccessTab`; extend it to also filter side-nav sections and top-level route guards for the same set of tabs so grants immediately unlock the corresponding pages without a code change.

## 5. Driver's license mandatory in Persona verification

Problem: Persona template config treats all doc types as optional; drivers can complete verification without a DL.

Fix:
- Migration: add `requires_drivers_license boolean default false` to `persona_template_config`; set `true` for the driver role rows.
- `PersonaVerification.tsx`: before launching Persona, if `user_role='driver'` and template flag is true, show a mandatory "Upload Driver's License" step using existing `UploadDropZone` (stored under `user-documents/{uid}/drivers_license/…`) and block Persona launch until the doc is present. The other doc types remain user-choice.
- `admin_review_persona_inquiry` RPC updated to fail-close a driver approval when no DL document is on file.

## 6. Driver UX anomaly sweep

Fix the following observed items:
- Registration step order: phone step now defaults to the region picked at the country gate (uses fix #1).
- `DriverDashboard` KPI hero: loading state flashes 0 for cars/earnings — switch to skeleton until `useDriverDashboard` resolves.
- "Continue onboarding" CTA sometimes routes to `/` after Persona callback — routed through helper from fix #3.
- `OnboardingChecklist` shows completed steps as actionable — mark them read-only.

## 7. Owner UX anomaly sweep

- Owner registration → post-approval redirect goes through the helper from fix #3 (was hard-coded to `/`).
- `OwnerDashboard` earnings card: use `get_owner_available_balance` RPC everywhere instead of ad-hoc client math (already exists, some spots missed).
- Vehicle pickup-location form: phone field now region-aware via fix #1.
- Withdrawal PSP picker: default to owner's `preferred_country` PSP, not USA.

## Verification

- `bun run build` must stay green.
- Vitest: extend `phone-number-input.e2e.test.tsx` to assert placeholder/flag/IDD for US, NG, GB and reject cross-region numbers.
- Playwright smoke: sign-in-as-verified-owner → lands on `/owner/dashboard`; driver verification without DL is blocked.

## Technical notes

- No new dependencies; leverages existing `libphonenumber-js`, `react-phone-number-input`, `phone_reference` table, `useDefaultPhoneCountry`, `usePhoneExample`, `RegionContext`.
- One migration in this pass (adds `phone` CHECK constraint + `requires_drivers_license` column + seeds driver rows).
- No changes to signing-keys or Google OAuth surfaces.

## Out of scope (call out separately if you want them next)

- Backfilling existing non-E.164 numbers in `profiles` (would need a re-verification prompt UX).
- Broader Persona document-type UI (e.g. per-region ID matrix) — happy to plan as a follow-up.
