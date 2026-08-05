# User Lifecycle Audit — Registration & Onboarding

Scope (as agreed): existing roles only (`admin`, `admin_assistant`, `owner`, `driver`, `legal_support`, `iot_support`, `vehicle_support`); breakages only. Organizations / staff / designers / customers do not exist in the schema and are out of scope.

---

## 1. Inventory of account-creation paths

| # | Path | Entry point | Records created |
|---|------|-------------|-----------------|
| A | Generic signup tab | `Auth.tsx:221` → `AuthContext.signUp` (`AuthContext.tsx:197-232`) | `auth.users`, `user_roles` (client insert), `profiles` via trigger. **No `applications`** |
| B | Owner registration | `OwnerRegistration.tsx:184-260` | `auth.users`, `applications`, `advance_registration_stage`. **No `user_roles`** |
| C | Driver registration | `DriverRegistration.tsx:157-240` | same as B |
| D | Google OAuth | `AlternativeAuthOptions.tsx` / `Auth.tsx:90-113` | `auth.users` + trigger `profiles`/default role only. **No `applications`** |
| E | Admin create user | `RoleManagement.tsx:244-266` → `admin-create-user` edge fn | server-side; no `applications` |
| F | Support staff registration | `SupportUserManagement.tsx:149-221` | `auth.users`, `support_staff`, `user_roles` |
| G | Onboard existing user as staff | `SupportUserManagement.tsx:224-304` | `support_staff`, upsert `user_roles` |

Backend chain: `on_auth_user_created` → `handle_new_user()` (upsert `profiles`, seed role, insert `two_factor_settings`), then `advance_registration_stage` / `complete_onboarding` / `approve_application`.

---

## 2. Failing conditions (observed, with evidence)

### P0 — data loss / users stranded

**F1. `handle_new_user()` swallows every error.**
Body ends in `EXCEPTION WHEN OTHERS THEN RAISE WARNING; RETURN NEW`. Any failure (constraint, enum, RLS) leaves an `auth.users` row with **no profile, no role, no 2FA** and the client sees a successful signup.
Failing condition: any insert error inside the trigger.
Evidence: **9 profiles currently hold zero `user_roles` rows**.

**F2. `approve_application` role grant not landing.**
**6 approved applications whose applicant has no `user_roles` row.** Either the `ON CONFLICT DO NOTHING` insert collided, or `v_app.user_id` was null/revoked afterwards. Result: approved driver/owner cannot pass `DashboardAuthGate` (no role ⇒ denied) — a permanent dead end.

**F3. Generic signup (path A) bypasses the application flow.**
`Auth.tsx` lets a user pick `driver|owner` (`Auth.tsx:35`) and inserts the role directly, but never creates an `applications` row. `useRegistrationProgress` / `PortalGate` derive stage from `applications`, so the user has a role but stage-less progress and every gate fails with no route forward.

**F4. OAuth users get the default `driver` role and no application.**
`handle_new_user` seeds `driver` when no role exists. A Google sign-up intending to be an owner is silently mis-roled, and has no application to correct it.

**F5. No wallet provisioning anywhere in the lifecycle.**
`wallet_accounts` is created only by explicit `ensure_wallet_account` RPC. **25/25 profiles have no wallet row.** Any payment/withdrawal path that reads the ledger for a driver/owner fails on first use.

### P1 — inconsistent gating / access

**F6. Two contradictory definitions of "onboarded".**
`MarketplaceGate.tsx:32` requires `is_verified`; `PortalGate.tsx:130` accepts `access_level === 'full' || stage === 'approved'` with no identity check. Same user passes one gate and fails the other.

**F7. `MarketplaceGate` lets anonymous users through** (`MarketplaceGate.tsx:24` returns children when `!authenticated`) while `PortalGate.tsx:122` fails all requirements for anonymous. Opposite behaviour in the same gate family.

**F8. Admin bypass differs per gate.** `DashboardAuthGate.tsx:39` auto-appends `admin` to `allowedRoles`; `ProtectedRoute.tsx:48` does not. Admin access depends on which gate a page happens to use.

**F9. `PortalGate.nextStepPath()` only branches `owner`/`driver`** (`PortalGate.tsx:83-84`). Any support role hitting a gated portal is routed to `/driver/onboarding`.

**F10. `DashboardAuthGate` "no role" screen is a dead end** (`:102-107`) — tells the user to complete registration but links nowhere. This is exactly the state the 9 role-less users are in.

**F11. Support/admin roles have no `ROLE_ONBOARDING` entry** (`role-home.ts:26-29` covers only driver/owner). First-login for the five other roles skips onboarding entirely.

### P2 — duplication / drift risk

**F12. Role assignment duplicated in 4 places** with three different semantics: plain insert (`AuthContext.tsx:221`, `SupportUserManagement.tsx:193`), upsert (`:278`), delete+upsert (`:402`). Plain inserts throw duplicate-key for users who already hold a role.
**F13. "Ensure auth user exists" block copy-pasted verbatim** in `OwnerRegistration.tsx:187-216` and `DriverRegistration.tsx:160-189`.
**F14. `roleMap` duplicated 4× inside `SupportUserManagement.tsx`.**
**F15. Redirect logic reimplemented inline** in `Auth.tsx:146` instead of reusing `homeForRole()` (`role-home.ts:31`).
**F16. 2FA double-provisioned** by both `handle_new_user` and the `create_2fa_settings_on_profile` trigger (harmless today — `ON CONFLICT DO NOTHING`).
**F17. Two users hold stacked roles** (admin+driver, driver+admin_assistant) from the default-driver seed plus later grants; no de-duplication on grant.
**F18. No `auth.users` update trigger** — email/phone changes never sync to `profiles`.

---

## 3. Prioritized fix plan

### Phase 1 — stop stranding users (P0)
1. **Make `handle_new_user` fail loudly for provisioning, softly for extras.** Keep profile+role inserts outside the catch-all; only wrap the optional 2FA insert. Log failures to `auth_event_log`.
2. **Backfill the 9 role-less profiles and 6 approved-without-role applicants** via a one-off migration, deriving the role from `applications.application_type`, defaulting to the profile's declared intent.
3. **Add a self-healing RPC `ensure_user_provisioning(user_id)`** that idempotently guarantees `profiles` + exactly one `user_roles` + `wallet_accounts`, and call it from `approve_application`, `admin_create_staff_role`, and on dashboard load when a role is missing.
4. **Make path A create an application.** Either drop the driver/owner selector from `/auth` and redirect to `/driver/registration` / `/owner/registration`, or have signup insert the matching `applications` stub. (Recommend the redirect — one canonical registration path per role.)
5. **Stop defaulting OAuth users to `driver`.** Seed no role; route roleless authenticated users to a role-choice step that starts the correct registration.
6. **Provision wallets on role approval** inside `approve_application` (via step 3's RPC).

### Phase 2 — unify gating (P1)
7. Single source of truth for "onboarded": one hook/RPC consumed by `PortalGate`, `MarketplaceGate`, `DashboardAuthGate`.
8. Align anonymous handling — `MarketplaceGate` should redirect to `/auth` rather than pass through.
9. Move the admin auto-allow into one shared helper used by both gates.
10. Extend `nextStepPath()` and `ROLE_ONBOARDING` to all 7 roles (support roles → their dashboard tour).
11. Give the "no role" screen a real CTA into role selection / registration.

### Phase 3 — deduplicate (P2)
12. One `assignRole()` helper (upsert semantics) replacing all 4 call sites; one shared `ensureAuthUser()` used by both registration forms; hoist `roleMap` to a module constant; use `homeForRole()` in `Auth.tsx`.
13. Drop the redundant 2FA insert from `handle_new_user`, keep the trigger.
14. Decide policy on stacked roles (allow, but make role resolution explicit — `fetchUserRole` priority is already admin > assistant > support > owner > driver).
15. Add an `auth.users` UPDATE trigger to sync email/phone into `profiles`.

---

## 4. Not verified
- `admin-create-user` edge function internals (path E) — needs a read to confirm it provisions role + profile + application consistently with Phase 1.
- `auth.users`-side orphan counts — the audit role lacks `auth` schema access.
