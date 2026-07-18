
# Staged Registration Flow (Drivers & Owners)

Restructure onboarding into 5 explicit stages, with a **view-only dashboard** unlocked after step 1 and full access granted only after admin approval.

## Stages

```text
1. AUTH              → email + password signup, email verification
2. ACCOUNT OPENED    → view-only dashboard (checklist + preview + profile/notifications)
3. DOCUMENTS         → role-specific uploads (+ referees for drivers, + proxy billing when driver adds one)
4. VERIFICATION      → Persona ID check + document review; referees attest; proxy signs consent
5. ADMIN APPROVAL    → admin final-approves → full dashboard unlocked
```

Existing approved users are **grandfathered** — flow applies only to new signups (detected via `profiles.registration_stage IS NULL`).

## Data model (one migration)

Add to `profiles`:
- `registration_stage` enum: `auth` | `account_opened` | `documents_submitted` | `verification_pending` | `approved`
- `stage_updated_at timestamptz`
- `access_level` enum: `view_only` | `full` (default `view_only`; grandfathered rows backfilled to `full`)

Add RPCs (SECURITY DEFINER, search_path=public):
- `advance_registration_stage(target_stage)` — validates transition, logs to `application_audit_log`
- `grant_full_access(user_id)` — admin-only; sets `access_level='full'` + stage `approved`
- `get_my_registration_progress()` — returns stage, missing items, next action

Trigger: when Persona verification succeeds AND required docs present AND (drivers) referees attested → auto-advance to `verification_pending` and create/refresh an admin review task.

## Backend gates

- Extend `useDashboardAuthGate` → add `requireFullAccess` mode; view-only users see stage checklist instead of dashboard content.
- RLS: mutating policies on `rentals`, `price_negotiations`, `iot_device_orders`, `rent_to_own_listings` add `access_level = 'full'` check via `has_full_access(auth.uid())` SECURITY DEFINER helper.
- Registration pages stop navigating straight to dashboards; they navigate to `/driver/dashboard` or `/owner/dashboard` which now renders in view-only mode until stage=approved.

## Frontend

New shared component `RegistrationProgressPanel` (checklist with 5 stages, current step highlighted, CTAs for next action).

`DriverDashboard` / `OwnerDashboard`:
- If `access_level='view_only'`: render `RegistrationProgressPanel` + preview grid (feature tiles with `Lock` badge + "Unlocks after approval") + profile editor + notification prefs. Hide all data queries.
- If `full`: render as today.

Documents step (`DriverOnboarding`, `OwnerOnboarding`) becomes stage 3 — on submit calls `advance_registration_stage('documents_submitted')` and launches Persona.

Referee verification (drivers): unchanged flow, but its completion is now a prerequisite for stage advancement. Admin review dashboard shows a blocker if referees pending.

Proxy billing: unchanged; remains a runtime action inside the driver dashboard (post-approval), since a proxy is optional and can be added later.

Admin approval: `ApplicationManagement` gains a "Grant full dashboard access" action which calls `grant_full_access` — only enabled when Persona verified + docs complete + referees attested.

## Grandfathering

Migration backfills existing rows:
```sql
UPDATE profiles SET access_level='full', registration_stage='approved'
WHERE user_id IN (SELECT user_id FROM user_roles WHERE role IN ('driver','owner'))
  AND onboarding_completed_at IS NOT NULL;
```

## Files touched (approximate)

- `supabase/migrations/<new>.sql` — enums, columns, RPCs, trigger, backfill, RLS helper
- `src/hooks/useRegistrationProgress.ts` (new)
- `src/components/registration/RegistrationProgressPanel.tsx` (new)
- `src/components/registration/ViewOnlyDashboardShell.tsx` (new)
- `src/pages/DriverDashboard.tsx`, `src/pages/OwnerDashboard.tsx` — branch on access_level
- `src/pages/DriverOnboarding.tsx`, `src/pages/OwnerOnboarding.tsx` — call advance_stage, launch Persona
- `src/pages/DriverRegistration.tsx`, `src/pages/OwnerRegistration.tsx` — redirect to view-only dashboard after signup
- `src/components/admin/ApplicationManagement.tsx` — "Grant full access" action + gating badges
- `src/components/verification/RefereeVerificationPanel.tsx` — surface completion in progress panel
- `src/hooks/useOnboardingGate.ts` — replaced/extended by stage gate

No changes to existing referee flow, proxy billing flow, or Persona integration beyond wiring their events into stage advancement.

## Out of scope

- Redesigning Persona templates
- Changing payment/billing logic
- Modifying grandfathered users' access
