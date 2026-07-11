## Current state (already built)

- Table `persona_inquiries` with RLS.
- Edge fns `persona-create-inquiry` (region-aware) and `persona-webhook` (HMAC-verified, cascades to referees).
- Component `PersonaVerification` (opens hosted URL in new tab).
- Templates today are picked from env vars `PERSONA_TEMPLATE_ID_US` / `PERSONA_TEMPLATE_ID_NG`.

## What we'll add

### 1. Per-region template mapping in DB

- New table `persona_region_templates` (region_code, country, inquiry_template_id, env_id, is_active, auto_generated, source_template_id, provisioned_at). Admin-managed.
- Edge fn reads DB first, falls back to env vars if empty.
- Admin UI card on **Regional Operations** page to view/edit template mappings and trigger provisioning.

### 2. Auto-provisioning worker for new regions

- Trigger on `region_definitions` insert queues a row in `persona_region_templates` (status: `pending`).
- Edge fn `persona-provision-template` clones a master template via Persona's `template-versions` endpoint, saves the new template_id, marks `active`. Idempotent; can be invoked from admin UI too.
- Requires new secret: `PERSONA_MASTER_TEMPLATE_ID` (source template to clone).

### 3. Embedded inquiry flow (drivers, owners, referees)

- Rewrite `PersonaVerification.tsx` to load `withpersona.com/dist/persona-*.js` and open the `Persona.Client` modal in-app instead of a new tab.
- Edge fn returns `inquiry_id` + short-lived `session_token` (`/inquiries/:id/resume`). Component uses `inquiryId` + `sessionToken` to launch the modal, subscribes to `onComplete`/`onCancel`/`onError`, refetches inquiry status.
- Referee mode: passes `subject_ref` (referee_verifications.id) + `fields` (name, phone) so Persona cross-references what the applicant declared.

### 4. Onboarding triggers

- **Driver onboarding**: add Persona step to `VerificationGate` between phone verify and registration form; blocks progression until `persona_inquiries.status = 'approved'` for that user.
- **Owner onboarding**: same gate on `/owner/registration`.
- **Referee**: existing referee capture already links to `persona_inquiry_id` — surface embedded launch in referee capture UI (RefereeCapture component if present).

### 5. Admin re-verification (hosted link via email/SMS)

- New edge fn `persona-send-reverification`:
  - Admin-only (`is_admin()`).
  - Creates fresh inquiry, generates hosted URL (`/verify?inquiry-id=…&environment-id=…`).
  - Sends unified message (Resend email + Termii/Twilio SMS) with the link via existing `send-inbox-reply` pattern.
  - Logs to `admin_audit_log`.
- Admin UI action button on user profile: "Request identity re-verification".

### 6. Document expiry re-verification (cron)

- New edge fn `persona-expiry-scan` runs daily via pg_cron; for `user_documents` expiring in ≤14 days (DL, NIN, VIN, etc.), sends re-verification email via the same send fn.

### 7. Webhook hardening

- Persist `mismatch_fields` from Persona payload (name/DOB/id_number diffs) so admins can review.
- Also cascade approved `self` inquiries → set `profiles.identity_verified_at`.
  8. Store and update per user verification results on admin dashboards

## Technical details

**Migrations**

- Create `persona_region_templates` with GRANTs, RLS (admins manage; authenticated read `is_active`), updated_at trigger.
- Trigger `on_region_definition_created` → insert placeholder row.
- Add `profiles.identity_verified_at TIMESTAMPTZ` and `profiles.identity_verified_inquiry_id TEXT`.

**Secrets to request** (via `add_secret`, not generated):

- `PERSONA_API_KEY` (already listed? — will confirm)
- `PERSONA_WEBHOOK_SECRET`
- `PERSONA_MASTER_TEMPLATE_ID` (source for regional clones)
- `PERSONA_ENVIRONMENT_ID` (sandbox/prod)

**Edge functions**

- Update `persona-create-inquiry`: DB-first template lookup; also mint session token for embedded.
- New: `persona-provision-template`, `persona-send-reverification`, `persona-expiry-scan`.
- Keep `persona-webhook`, extend it.

**Frontend**

- Rewrite `PersonaVerification.tsx` for embedded modal (with hosted URL fallback if SDK blocked).
- Add gate step in `VerificationGate` + owner registration.
- Admin action button + template management card.

**Cron**

- Schedule `persona-expiry-scan` daily at 07:00 UTC via `cron.schedule` (using insert tool, per instructions).

## Out of scope

- Actual Persona template design work in the Persona dashboard (user creates the master template once; worker clones it per region).
- Face-match against selfies stored in-app — Persona handles it and returns the verdict.

Confirm and I'll ship the migration first, then functions + UI in parallel.