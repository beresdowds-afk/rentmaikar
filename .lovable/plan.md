## Overview

Three related enhancements: a new **Admin Assistant** role with admin-controlled granular permissions, a **granular cookie consent** banner (Necessary / Analytics / Marketing / Preferences), and an **API Authentication** section added to `/api-docs`.

---

## 1. Admin Assistant Role

### Database (migration)
- Extend `app_role` enum with `'admin_assistant'`.
- New table `admin_assistant_permissions` (one row per assistant user) storing granular boolean flags:
  - `can_view_users`, `can_manage_users`, `can_view_vehicles`, `can_manage_vehicles`, `can_view_rentals`, `can_manage_rentals`, `can_view_payments`, `can_manage_payments`, `can_view_support_tasks`, `can_manage_support_tasks`, `can_view_iot`, `can_manage_iot`, `can_view_communications`, `can_send_communications`, `can_view_reports`, `can_manage_content` (FAQs/training), `can_view_audit_log`.
- Grants + RLS: assistant reads own row; admins read/write all rows. Assigned by admin at creation time.
- Security-definer helper `has_admin_assistant_permission(_user_id, _permission text)` returning boolean.
- ProtectedRoute allows `'admin_assistant'` on selected admin routes.
- Audit entries in `role_audit_log` when permissions change.

### UI (Admin → ERP → Role Management)
- New "Admin Assistants" tab in existing Role Management area:
  - List of current assistants with permission summary chips.
  - "Add Admin Assistant" dialog — pick existing user OR create new (email + full name), then permission checkboxes grouped by domain (Users, Fleet, Payments, Support, IoT, Communications, Content, Audit).
  - Edit dialog to toggle permissions per assistant; changes logged.
  - Remove assistant (revoke role) with confirmation.
- Assistant sees a scoped Admin Dashboard: hide tabs/actions where their permission flag is false via a `useAdminAssistantPermissions()` hook.

---

## 2. Granular Cookie Consent

Replace current single Accept/Decline `CookieConsent.tsx` with a preference-aware banner:

- **Four categories**:
  - Necessary (always on, disabled toggle)
  - Analytics (traffic, performance)
  - Marketing (ads, retargeting)
  - Preferences (region, language, saved UI settings)
- Banner actions: **Accept All**, **Reject All (non-essential)**, **Customize** (opens sheet with per-category switches + descriptions + Save).
- Persist to `localStorage` under `rentmaikar_cookie_consent_v2` as `{ necessary:true, analytics:bool, marketing:bool, preferences:bool, timestamp, version }`.
- Provide `useCookieConsent()` hook with `consent`, `hasConsented`, `update(prefs)`, `revoke()`, `openPreferences()`.
- Expose "Cookie Preferences" link in `Footer.tsx` that reopens the customization sheet at any time.
- Auto-migrate the old `rentmaikar_cookie_consent` value (`accepted` → all true, `declined` → only necessary).

---

## 3. API Authentication Docs (`/api-docs`)

Extend existing `ApiDocs.tsx` with a new top-level **Authentication** section (rendered above endpoint tables):

- **Required Headers** table: `Authorization: Bearer rmk_live_...`, `X-API-Key` alt, `Content-Type: application/json`, `Idempotency-Key` (optional).
- **Auth flows** (tabbed code samples in `curl`, `JavaScript (fetch)`, `Python (requests)`):
  1. Obtain key via Admin Dashboard → ERP → API Keys.
  2. Send authenticated request.
  3. Handle `401 invalid_key` / `403 insufficient_scope` / `429 rate_limited`.
  4. Rotate a key (POST to `/v1/keys/{id}/rotate`).
- **Rate limits per endpoint** table (fed by existing `api_validation_endpoints` metadata + defaults): method, path, per-minute limit, burst, notes on `X-RateLimit-*` headers.
- **Error response schema** JSON snippet.
- **Scopes reference** table mapping API-key permissions (`read`, `write`, `delete`, `vehicles`, `users`, `payments`) to which endpoints require them.

Content is static React + shadcn Tables/Tabs — no backend changes required for this section.

---

## Technical notes

- Files touched:
  - **New migration** for enum + `admin_assistant_permissions` + helper + policies.
  - `src/contexts/AuthContext.tsx` — extend `AppRole` type.
  - `src/components/auth/ProtectedRoute.tsx` — accept new role.
  - `src/components/admin/AdminAssistantManagement.tsx` (new).
  - `src/hooks/useAdminAssistantPermissions.ts` (new).
  - `src/pages/AdminDashboard.tsx` — wire new tab; guard tabs by permission when role is assistant.
  - `src/components/CookieConsent.tsx` — rewrite for granular consent.
  - `src/hooks/useCookieConsent.ts` (new).
  - `src/components/layout/Footer.tsx` — add "Cookie Preferences" link.
  - `src/pages/ApiDocs.tsx` — add Authentication section + rate-limit table.
- No changes to existing role checks for `admin` — assistant is additive; sensitive server-side actions still require `is_admin()` unless explicitly relaxed via the permission helper.
- The user has 100-secret cap; no new secrets required.

Confirm and I'll implement in this order: migration → AuthContext/Route wiring → assistant management UI → cookie consent → API docs.
