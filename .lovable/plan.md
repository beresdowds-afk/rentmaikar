# Streamline Driver Registration, Onboarding, Verification & Auth

Audit found ~16 redundancies across `Auth`, `DriverRegistration`, `DriverOnboarding`, verification gates, and progress hooks. Below are the concrete changes grouped by priority. Approve and I'll execute in this order.

## P0 — Remove duplicate gates and re-collected data

1. **Retire `VerificationGate` full-page block on the driver dashboard.**
   Today `DriverDashboard` is wrapped by `VerificationGate` (all‑or‑nothing) AND by `PortalGate` per tab (staged). They contradict each other and defeat the "view-only access after signup" promise. Drive all gating through `useRegistrationProgress` + `PortalGate` only. `VerificationGate` becomes a lightweight banner on the Overview tab that surfaces the next unmet requirement.

2. **Consolidate the three email-verification UIs.**
   `Auth.tsx`, `EmailVerification.tsx`, and `VerificationGate.tsx` each hand-roll resend/cooldown against `supabase.auth.resend`. Make `EmailVerification` the single source of truth and have `Auth.tsx` reuse it in the "check your inbox" state.

3. **Stop re-collecting name/email/password in `DriverRegistration` when already signed in.**
   When a user hits `/driver/registration` with an active session, hide email/password/name inputs and prefill from the session/profile. New signups from `/auth` (role=driver) are routed straight into the application form with the session already established — one path, not two.

4. **Prefill Persona with existing profile fields.**
   `PersonaVerification` currently only sends `region`/`subject_role`. Pass `fields={{ name, phone, address }}` from the profile so drivers don't re-type identity data.

## P1 — Fewer gates, fewer refetches, cleaner stage ordering

5. **Unify the five gate components.**
   Extract one `ROLE_HOME` map and one `meetsRequirement(progress, requirement)` helper shared by `PortalGate` + `PortalRouteGuard`. Route auth+role gating through `ProtectedRoute` only; delete `DashboardAuthGate` duplication.

6. **Kill the focus/visibility re-invalidation storm.**
   `useOnboardingProgressReconciliation` invalidates the progress query on every focus/visibility change, triggering the RPC across every mounted consumer. Replace with React Query's built-in `refetchOnWindowFocus` + a 30 s stale window.

7. **Merge the two sequential RPCs in `DriverOnboarding.finish()`.**
   Combine `advance_registration_stage('documents_submitted')` and `('verification_pending')` into one RPC/transaction and navigate optimistically; reconcile via progress query.

8. **Insert the legal-agreement step into the canonical stage order.**
   Add `legal_accepted` between `account_opened` and `documents_submitted` in `onboarding-stages.ts` + `routeForStage`, so `OnboardingRedirect`/`PortalGate` route drivers there deterministically instead of it being an orphan URL.

9. **Reuse `useRegistrationProgress` in `Auth.tsx` post-login redirect.**
   Removes an extra blocking `profiles` query on every login.

10. **Add `autoFocus` + proper `autoComplete` on all auth/registration inputs.**
    (`email`, `current-password`, `new-password`, `tel`, `one-time-code`.) One-line-per-field fix that measurably reduces friction, especially on mobile.

11. **Prefill 2FA phone from `profiles.phone`.**
    `TwoFactorSetup` should not re-ask for a number already captured during registration.

## P2 — Dead code & polish

12. Delete the legacy no-op `useOnboardingGate.ts` (already commented as legacy).
13. Fix order-dependent branches in `registration-errors.ts` so `isAlreadyRegistered` is checked before `isDuplicate`.
14. Disable "Re-run verification" in `RefereeVerificationPanel` until at least one invite is sent.
15. Merge `lib/onboarding-error.ts` and `lib/onboarding-stages.ts` into one `lib/onboarding/` module.
16. Ensure `OnboardingReconciliationBanner` is actually mounted on gated dashboards (currently appears unmounted).

## Technical notes

- Backend: one new RPC `advance_registration_stages(text[])` (P1‑7) applied as a single migration with `GRANT EXECUTE TO authenticated`.
- No schema changes required beyond that RPC and adding `legal_accepted` to the stage enum/lookup (P1‑8).
- All UI changes are additive/removals — no data migration.
- Tests: extend `useRegistrationProgress.test.tsx` and `PortalGate.test.tsx` to cover the merged gate helper; add an integration test that a freshly signed-up driver sees the dashboard immediately (view-only) instead of a hard block.

## Out of scope

- Design overhaul of any page.
- Persona template changes (already covered by `AdminPersonaTemplatesPage`).
- Payment/subscription gating (`SubscriptionGate`) — orthogonal to onboarding flow.

## Rollout order

1. P0-1 → P0-2 → P0-3 → P0-4 (biggest UX wins, no schema)
2. P1-5 → P1-6 → P1-9 → P1-10 → P1-11
3. P1-7 + P1-8 together (requires the one migration)
4. P2 cleanup

Approve to proceed, or tell me which items to drop / reorder.
