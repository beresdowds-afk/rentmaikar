
# RentMaikar Authentication — End-to-End Audit

_No code changes made. This is analysis + an implementation plan for the Google SSO gaps._

## 1. Current Authentication Providers

| Provider | Where wired | Notes |
|---|---|---|
| Email + password | `src/pages/Auth.tsx` → `AuthContext.signIn`/`signUp` → `supabase.auth.signInWithPassword` / `signUp` | Primary path. Requires email confirmation unless auto-confirm is on. |
| Google OAuth (Managed Cloud) | `src/components/auth/AlternativeAuthOptions.tsx` → `lovable.auth.signInWithOAuth('google', { redirect_uri: window.location.origin })` via `src/integrations/lovable/index.ts` (`@lovable.dev/cloud-auth-js`) | Uses Lovable OAuth broker → sets Supabase session. |
| Phone OTP (Supabase native SMS) | `AlternativeAuthOptions.PhoneOtpDialog` → `supabase.auth.signInWithOtp` + `verifyOtp` | Only active when `platform_kv_settings.phone_otp_provider = 'supabase'`. |
| Phone OTP (custom Twilio/Termii) | Edge fn `phone-otp-custom` | Active when `phone_otp_provider = 'custom'`. Returns temp password and app signs in via `signInWithPassword`. |
| 2FA (post-login challenge) | `send-2fa-code` edge fn + `TwoFactorChallenge` component | Mandatory for admin/owner; SMS/WhatsApp channel. |
| Password reset | `supabase.auth.resetPasswordForEmail` → `/reset-password` route | |

## 2. Current Registration Flow

1. `Auth.tsx` signup tab collects name, email, password, role (driver/owner), terms.
2. `AuthContext.signUp` → `supabase.auth.signUp({ email, password, options: { emailRedirectTo: origin, data: { full_name }}})`.
3. On success, client inserts `user_roles(user_id, role)` directly from the browser.
4. Supabase inserts row into `auth.users` → trigger `on_auth_user_created` fires → `public.handle_new_user()` seeds `public.profiles` and (as of latest migration) auto-assigns a `driver` role or promotes seeded admin email.
5. If email confirmation required, user is shown `EmailVerification` screen.
6. Post-verify redirect → `ROLE_HOME[role]` or `ROLE_ONBOARDING[role]`.

## 3. Current Login Flow

1. Email/password → `signInWithPassword`.
2. `AuthContext` `onAuthStateChange` fires, hydrates `user`, `session`, then fetches `user_roles` (deferred via `setTimeout(0)`).
3. `Auth.tsx` calls `check2FAStatus` (invokes `send-2fa-code` with action `status`); if `requires_2fa`, shows `TwoFactorChallenge`, otherwise routes based on role.
4. Existing sessions: `getSession()` bypasses 2FA challenge (sets `twoFactorVerified = true`).

## 4. Email Verification Flow

- `supabase.auth.signUp` with `emailRedirectTo: ${origin}/`.
- Auth email HTML/subject managed by Supabase (Lovable-managed sending).
- Post-signup UI: `EmailVerification` component polls / instructs; user clicks link → returns with confirmed session.
- No custom edge function; relies on Supabase Auth.

## 5. Phone Verification Flow

- Two paths (see table above).
- Non-auth phone add/change: `verify-phone` edge function — server-side E.164 validation (`is_valid_e164`), rate-limited, supports voice + SMS codes.
- Numbers stored in `profiles.phone` (also mirrored into `two_factor_settings.phone_number`).

## 6. User Profile Creation

- Trigger `handle_new_user()` (SECURITY DEFINER) inserts into `public.profiles` from `auth.users.raw_user_meta_data`:
  - `full_name` from `full_name` / `name` / `given_name+family_name`
  - `avatar_url` from `avatar_url` / `picture`
  - `phone` from `NEW.phone` or metadata
  - `preferred_country` from Google `locale` (`en-US` → `US`, `*-NG` → `NG`, else NULL)
  - Email from `NEW.email` or metadata
- `ON CONFLICT (user_id)` merges (COALESCE keeps existing non-null values).
- `public_uuid` filled by a separate trigger.

## 7. User Roles Creation

- Table `public.user_roles(user_id, role)` with `unique(user_id, role)`.
- Sources of assignment:
  1. Client-side insert after `signUp` in `AuthContext.signUp`.
  2. Trigger `handle_new_user`: seed admin `eastfortemain@gmail.com` → `admin`; else default `driver` if no row exists.
  3. Admin dashboard via `admin-create-user` edge fn (blocks driver/owner creation by admins per policy).
  4. `approve_application` RPC for owner/driver approvals.

## 8. Session Management

- `src/integrations/supabase/client.ts` uses `storage: localStorage`, `persistSession: true`, `autoRefreshToken: true`.
- `AuthContext` registers `onAuthStateChange` FIRST, then calls `getSession()` (correct ordering).
- Role fetch is deferred with `setTimeout(0)` to avoid the Supabase auth-callback deadlock.
- Existing sessions bypass fresh 2FA challenge.

## 9. JWT Generation

- Handled entirely by Supabase Auth server (HS256 signed with Supabase project JWT secret).
- Client only sees `access_token` (JWT) + `refresh_token` in the session; access token attached to REST/Functions calls automatically by `@supabase/supabase-js`.
- Edge functions verify JWT via platform (`verify_jwt = true` by default). Non-user webhooks explicitly set `verify_jwt = false` in `supabase/config.toml`.

## 10. Supabase Auth Configuration

- Managed by Lovable Cloud (no direct dashboard access exposed).
- Google provider: enabled via `configure_social_auth` (managed OAuth credentials — Lovable-hosted).
- Redirect URL passed by client: `window.location.origin`.
- Site URL / additional redirect URLs owned by Lovable-managed Auth; per platform this defaults to the canonical preview/published origin.

## 11. Database Triggers Involved in Onboarding

| Trigger | Table | Purpose |
|---|---|---|
| `on_auth_user_created` | `auth.users` AFTER INSERT | Calls `handle_new_user()` |
| `handle_new_user()` | — | Seeds profile + default role |
| `log_user_public_uuid_assignment` | `profiles` | Fills `public_uuid`, logs to `user_uuid_assignments` (recently fixed for missing column) |
| `enforce_verified_name_immutable` | `profiles` | Prevents name change after verification |
| `log_profile_settings_changes` | `profiles` | Writes `profile_settings_audit` |
| `fanout_admin_onboarding_notification` | `profiles` / stage table | Emits `admin_notifications` |
| Assorted `is_valid_e164` triggers | 13 tables incl. `profiles`, `two_factor_settings` | Server-side E.164 enforcement |

## 12. Edge Functions Involved in Auth / Onboarding

- `admin-create-user`, `admin-set-user-active`
- `phone-otp-custom` (send/verify)
- `verify-phone` (add/change number, non-auth)
- `send-2fa-code` (status/send/verify)
- `persona-send-reverification`
- `persona-config` (role-aware template selection)
- `notify-referees`, `verify-referees`
- Supporting: `email-webhook`, `send-inbox-reply` (transactional email delivery)

## 13. Admin User Creation Flow

- `AdminUserManagement` UI → `admin-create-user` edge fn (JWT-verified, admin role check).
- Cannot create `driver` or `owner` roles (they must self-register / be approved).
- Can create `admin_assistant`, `legal_support`, `iot_support`, `vehicle_support`.
- Sends welcome email with temp password; role inserted server-side using service role.
- `eastfortemain@gmail.com` seed row created directly via SQL migration + `admin` role, temp password `Rentmaikar!2026`.

---

## 14. Points That Would Block Google Sign-In From Completing

Ordered from most likely to least, based on the code paths above.

### A. OAuth-broker / provider configuration
1. **Google provider not actually enabled on the current Cloud environment.** After the recent workspace move, `configure_social_auth` needs to be re-run against the new project ref (`bwvocmhcledbwqlpcswp`). If disabled, `lovable.auth.signInWithOAuth('google', ...)` returns `Unsupported provider` / `provider is not enabled` — matches an error string already handled in `friendlyGoogleError`.
2. **Site URL / redirect allowlist mismatch.** `redirect_uri: window.location.origin` must be in the Supabase Auth "Additional Redirect URLs". The staging custom domain (`https://staging.rentmaikar.com`) and preview subdomain (`https://id-preview--…lovable.app`) must both be allowed. If missing, Google returns to the broker but the broker refuses to hand back tokens.
3. **Managed Google credentials mode vs BYO.** If the project was migrated with "custom credentials" left on but no client id/secret carried over, Google returns `redirect_uri_mismatch`.

### B. Broker / SDK integration
4. **`lovable.auth.signInWithOAuth` requires the app to be reachable at the origin it opens the popup from.** In the preview iframe the popup uses `web_message` post-back; browser third-party cookie blocking can drop it silently → user sees "window closed before finishing".
5. **`await supabase.auth.setSession(result.tokens)` inside `src/integrations/lovable/index.ts`** fails if `result.tokens` is missing `refresh_token` (happens when broker only returned an id_token). No visible toast — the sign-in silently fails and no session is stored.
6. **Google popup vs full-page redirect.** Some devices (iOS Safari PWA) force full-page redirect; because `redirect_uri` is `window.location.origin`, the app lands on `/` without an `authorization_code` in the URL, and the SDK never runs the redirect handler → no session.

### C. App-side gating (session appears but user still bounced)
7. **`handle_new_user` trigger failure aborts the auth insert.** Any exception (e.g., NOT NULL constraint on `profiles.some_field`, or the `public_uuid` audit trigger referencing a missing column) rolls back `auth.users` insert → Google returns "Database error saving new user". A prior fix was made for `log_user_public_uuid_assignment` referencing a non-existent `created_at`; regression risk remains if similar constraints exist on `profiles`.
8. **`user_roles` auto-assign race.** `AuthContext` fetches role via deferred `setTimeout(0)`. If the Google callback lands and the trigger hasn't yet committed the default `driver` row, `userRole = null` → router may redirect to `/onboarding` or an unauthorized page and user thinks sign-in "failed".
9. **`RegionContext` regional lock for non-admins.** `preferred_country` is set only when Google `locale` is `en-US` or contains `-NG`. Otherwise it's `NULL` → context may not resolve a region → downstream guards may render a blank state or force a region-picker the user cannot dismiss.
10. **2FA gate for admin/owner roles.** If Google email resolves to the seeded admin, `handle_new_user` promotes to `admin`; then `check2FAStatus` runs and shows `TwoFactorChallenge`. Without a phone on file the challenge cannot complete → sign-in appears stuck at the 2FA screen.
11. **Redirect-URI value is protected route on some flows.** Current code uses `window.location.origin` (compliant). But if any call site accidentally passes a protected path (search for any future `/dashboard` `redirect_uri`), the user lands on `/` post-provider with no session yet hydrated. Not currently broken but fragile.

### D. Browser / environment
12. Third-party cookie blocking in Chrome incognito / Safari ITP → broker `web_message` handshake dropped.
13. PWA service-worker interception of `/~oauth/*` routes if a Workbox SW ever returns. Current kill-switch `public/sw.js` mitigates this; regressions to any app-shell SW would break Google sign-in.
14. Popup blockers (button click must trigger `signInWithOAuth` directly — verified in current code).

---

## 15. Implementation Plan (No Code Yet)

**Phase 1 — Confirm broker configuration (no code, tooling only)**
- Run `supabase--configure_social_auth` with `providers: ["google"]` (idempotent) against the current project to re-assert Google enablement on the new workspace.
- Verify Site URL and Additional Redirect URLs include: `https://staging.rentmaikar.com`, `https://rentmaikar.lovable.app`, current `id-preview--*.lovable.app`, and `http://localhost:8080` for dev.
- Confirm we are using managed Google credentials (default) — do not require the user to paste their own unless they ask.

**Phase 2 — Harden `handle_new_user` for Google-shaped payloads**
- Add defensive `EXCEPTION WHEN OTHERS` block that logs to `admin_audit_log` and still returns NEW, so a profile-seed failure never rolls back `auth.users` insert (Google sign-ins otherwise return generic "Database error saving new user").
- Broaden `preferred_country` mapping: fall back to Cloudflare/Vercel IP header parse in a follow-up edge fn, and default to `NULL` (leave region unresolved rather than crash).

**Phase 3 — Close the role-assignment race in the client**
- In `AuthContext.onAuthStateChange`, when `session.user` is present and `fetchUserRole` returns `null`, retry once after 750 ms before treating the user as roleless (covers the tiny window between OAuth callback and trigger commit).
- Only route after role fetch resolves; show a lightweight "Finalizing your account…" state instead of bouncing to `/`.

**Phase 4 — Friendly OAuth error surface**
- Ensure `Auth.tsx` reads both `?error=` and `#error=` (Supabase sometimes hashes them).
- Add explicit copy for `server_error` / `unexpected_failure` returned by Google when `handle_new_user` raises, pointing the user to "Try again in a moment".
- Add a "Contact support" secondary action after two consecutive failures.

**Phase 5 — Session persistence sanity checks**
- Add unit assertion that `src/integrations/supabase/client.ts` never gets edited (already auto-generated; document in README).
- Extend `supabase/tests/google-sso-provisioning-e2e.test.ts` with a test that fires `handle_new_user` with only `{ name, email, provider_id: 'google' }` (no locale, no picture) and asserts the profile row is still created and no exception is raised.
- Extend `tests/e2e/google-sso.spec.ts` to (a) assert redirect to role-home after callback, (b) reload the page and assert session persists.

**Phase 6 — 2FA / admin path**
- For admins who complete Google SSO without a phone number, route to a mandatory "add phone + verify" screen before allowing dashboard access — instead of an unclearable 2FA modal.

**Phase 7 — Docs**
- Update `docs/security/` with a short "Google SSO troubleshooting" runbook listing the 14 failure points above and their diagnostic queries.

### Technical Notes
- All schema changes go through `supabase--migration` (Phase 2, 6 may add a small migration).
- No changes to `src/integrations/supabase/client.ts`, `src/integrations/lovable/index.ts`, or `supabase/config.toml` project-level fields.
- No new secrets required; managed OAuth credentials remain in use.
- Estimated size: 1 SQL migration, ~3 client-file edits, 2 test files.
