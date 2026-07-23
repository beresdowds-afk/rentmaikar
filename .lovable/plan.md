
## Goals

1. Skip email verification when it's already done.
2. Resumable onboarding checklist for drivers and owners that auto-saves and deep-links back to the last incomplete step.
3. Single server-sourced onboarding state machine that decides the next screen — retire remaining ad-hoc gating logic.
4. Global resend cooldown for verification emails, SMS OTPs, and 2FA codes with clear UI countdown.

---

## 1. Verification-flow smart redirect

**File:** `src/components/auth/EmailVerification.tsx`, `src/pages/Auth.tsx`, `src/pages/DriverRegistration.tsx`, `src/pages/OwnerRegistration.tsx`

- On mount, check `supabase.auth.getUser()` — if `email_confirmed_at` is set OR `profile.email_verified_at` is set, immediately call `advanceOnboarding()` (see §3) and route to the next required step instead of showing the verification screen.
- Same treatment for the 2FA screen: if `two_factor_settings.verified_at` exists and the current session already has an `aal2` claim, skip.
- Add a `?force=1` escape hatch for admin/QA to re-run a step deliberately.

---

## 2. Resumable onboarding checklist

**New file:** `src/components/onboarding/OnboardingChecklist.tsx`

Renders the ordered list of steps for the current role (driver / owner), each with status pill (`done`, `in_progress`, `locked`, `todo`), ETA, and a "Resume" CTA on the first non-done item.

**New hook:** `src/hooks/useOnboardingChecklist.ts`
- Reads `profile.onboarding_state` (JSONB, see §3) plus computed step definitions.
- Persists `last_visited_step` on every route change via `upsert` into `profiles.onboarding_state` (debounced 2s).
- Returns `{ steps, currentStep, resumeHref, percentComplete }`.

Mount the checklist on `/driver/dashboard` and `/owner/dashboard` above the KPI hero. Also render as the empty state inside `PortalGate` when a portal is locked, so users see the exact prerequisite and a one-click "Resume onboarding".

---

## 3. Single onboarding state machine (server-sourced)

**Migration:** new columns / helpers on `profiles`
- `onboarding_state jsonb not null default '{}'::jsonb` — stores `{ last_visited_step, completed_steps: text[], updated_at }`.

**New Postgres function:** `public.get_onboarding_next_step(_user_id uuid) returns jsonb`
Returns:
```json
{ "role": "driver", "next_step": "phone_verification", "next_href": "/verify-phone",
  "completed": ["email_verification","identity"], "percent": 42, "blocked_reason": null }
```
Uses a single source of truth:
- email → `auth.users.email_confirmed_at`
- phone → `profiles.phone_verified_at`
- 2fa → `two_factor_settings.verified_at`
- identity → `persona_inquiries.status = 'completed'`
- role-specific registration → `applications.status`
- legal → `legal_agreement_acceptances`
- training → `training_completions` (drivers only)
- vehicle registration → `vehicles` count (owners only)

**New hook:** `src/hooks/useOnboardingMachine.ts` — thin wrapper calling the RPC via `react-query`, refetch on `AUTH_STATE_CHANGE` and after any mutation that could advance state.

**Refactor:** replace scattered checks in `PortalGate`, `PortalRouteGuard`, `useDashboardAuthGate`, `ReverificationBanner`, and each registration page to consume `useOnboardingMachine()` instead of duplicating step logic. Delete the local step-order arrays. Retire `useOnboardingProgressReconciliation` in favor of the RPC.

---

## 4. Resend cooldown for verification / 2FA / OTP

**New hook:** `src/hooks/useResendCooldown.ts`
- Keys cooldowns by channel + identifier in `localStorage` (e.g. `resend:email:foo@bar.com`) with `lastSentAt` and `cooldownSec` (30s email, 60s SMS, 60s 2FA by default; honor `Retry-After` from 429 responses).
- Returns `{ remaining, canSend, trigger(fn) }` where `trigger` wraps the send call, applies exponential backoff on repeated 429s (30→60→120→300s cap), and surfaces a toast on error.

**New component:** `src/components/auth/ResendButton.tsx` — button + inline countdown ("Resend in 0:23"), disabled state, aria-live announcement for accessibility.

Wire into:
- `EmailVerification.tsx` (Supabase `resend`)
- `PhoneVerification` flow (Termii / Twilio OTP)
- `TwoFactorSetup.tsx` and any 2FA challenge screen
- Password-reset email screen

Server-side already returns 429 with `Retry-After` from prior rate-limit work — the hook just consumes it.

---

## Technical notes

- All new RLS: none (functions are `security definer` and only read own row via `auth.uid()`).
- The `get_onboarding_next_step` function is `stable` and safe to call from React Query with a 15s stale time; invalidate on auth state change and after each verification success.
- Registration pages already prefill from session (recent driver/owner refactor) — the new machine will drive their "next" button target instead of hard-coded routes.
- Delete: `src/hooks/useOnboardingGate.ts` remnants (already partly removed), local `stepOrder` arrays inside PortalGate/PortalRouteGuard.

---

## Deliverables

- 1 migration (onboarding_state column + `get_onboarding_next_step` function + grants)
- New: `useOnboardingMachine`, `useOnboardingChecklist`, `useResendCooldown`, `OnboardingChecklist`, `ResendButton`
- Refactored: `PortalGate`, `PortalRouteGuard`, `EmailVerification`, `TwoFactorSetup`, `Auth`, driver + owner dashboards, driver + owner registration pages
- Removed duplicated step-order / gating logic across the above files
