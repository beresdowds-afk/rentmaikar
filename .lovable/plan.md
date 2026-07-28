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
- Migration: add `CHECK (phone IS NULL OR public.is_valid_e164(phone))` on `profiles.phone` (trigger already exists — this backs it with a constraint). No data backfill; existing rows stay untouched and are validated on next update.

## 3. Returning verified users → dashboard on sign-in

Problem: `Auth.tsx` and `OnboardingRedirect.tsx` sometimes bounce verified users to `/` (landing).

Fix:
- Centralize routing in a single `resolvePostLoginRoute(user, profile, roles)` helper in `src/lib/role-home.ts`:
  - Verified + onboarding_completed_at set → `homeForRole(role)`.
  - Verified + role in `ROLE_ONBOARDING` and onboarding incomplete → onboarding path.
  - Everything else → `/onboarding/complete-profile` (never `/`).
- Update `Auth.tsx` success handler and `OnboardingRedirect.tsx` to use the helper.

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
