# Migrate from Lovable Cloud to your own Supabase project

## Important context first

- Lovable Cloud cannot be "disconnected" from this project once added — but you CAN point the app at an external Supabase project by reconnecting via **Connectors → Supabase** with your own project. The recommended path is: build the new project, migrate schema + data, then switch the app's connection and re-verify.
- Your schema is large: **200+ tables, 30+ enums, 200+ functions/triggers, RLS policies, storage buckets, edge functions, secrets, and cron jobs**. A partial copy will break the app — this must be a full-fidelity migration.
- **Auth users** are the hardest part: password hashes can only be exported by Supabase support (or you force password resets). Plan for this explicitly.

## Phase 1 — Prepare the target project

1. Create the new Supabase project (pick region closest to users; note NG/US traffic).
2. Note its project ref, URL, anon key, and service role key.
3. Enable required extensions: `pg_cron`, `pg_net`, `pgcrypto`, `uuid-ossp`, `pgjwt`, `pgsodium`/Vault (used for provider credential storage).

## Phase 2 — Migrate schema (structure)

Source of truth options, in order of reliability:

1. **Repo migrations** — if `supabase/migrations/` reflects reality, run them in order against the new project with `supabase db push` / `psql -f`. (Many migrations in this project were applied via the migration tool and may not exist as files.)
2. **Authoritative dump** — pull a schema-only dump from the current Lovable Cloud DB:
   ```bash
   pg_dump --schema-only --no-owner --no-privileges -d <current-db> > schema.sql
   ```
   Then apply to the new project with `psql`.
3. Fix-ups after restore: re-apply `GRANT`s if stripped, verify all enums/functions/triggers/RLS policies exist, and confirm `storage.buckets` rows for buckets like `user-documents` (private), chat attachments, etc.

## Phase 3 — Migrate data

1. Data-only dump per schema:
   ```bash
   pg_dump --data-only --schema=public -d <current-db> > data.sql
   ```
2. Load into the new project with triggers/RLS-safe order (disable triggers during load or load in FK dependency order).
3. **Row counts reconciliation**: produce a per-table count report on both sides and diff before cutover.
4. **Storage objects**: export files from all buckets (user documents, chat attachments, agreement PDFs) via the Storage API and re-upload to the new project preserving paths (signed URLs are path-based).
5. **Auth users**: request a `auth.users` export (incl. password hashes) from Supabase support for the source project, or plan a "reset password on first login" flow for all users. User **IDs must be preserved** — every table FK references them.

## Phase 4 — Edge functions, secrets, cron, webhooks

1. Redeploy all edge functions in `supabase/functions/` to the new project (`supabase functions deploy` per function).
2. Recreate all secrets in the new project (Paystack, PayPal, SENT, Twilio API key/secret, Termii, Resend, EMQX, ElevenLabs, Meta, `SENT_WEBHOOK_SECRET`, etc.).
3. Recreate pg_cron jobs (daily debits, email queue, payouts, reminders, reconciliation) — list current jobs with `SELECT * FROM cron.job` before cutover.
4. Update external webhook endpoints to the new project's function URLs: PayPal webhook, SENT webhook, Twilio webhooks, Resend webhook, email tracking.
5. Re-point the custom backend (`staging.rentmaikar.com`) env vars to the new Supabase URL/keys.

## Phase 5 — Reconnect the app & cutover

1. In Lovable: **Connectors → Supabase**, connect your own project (this swaps `VITE_SUPABASE_URL`/keys and regenerates `src/integrations/supabase/types.ts`).
2. Regenerate types and fix any type drift.
3. Configure Auth in the new project: Google OAuth provider credentials, redirect URLs (`https://rentmaikar.com`, preview URLs), email templates (branded templates must be re-uploaded), rate limits.
4. Smoke test matrix: sign-up/sign-in (email + Google), driver & owner dashboards, vehicle catalogue, payments (sandbox first), messaging center (SMS/WhatsApp), IoT/telemetry reads, admin pages.
5. Cutover strategy: brief read-only window → final delta sync of changed rows → switch connection → monitor error logs.

## Phase 6 — Validation & rollback

- Automated checks: row-count diff report, per-table FK integrity, sample record spot-checks per major domain (applications, vehicles, payments, agreements).
- Keep the Lovable Cloud backend intact (read-only) as rollback for 1–2 weeks.
- Rollback = reconnect to Cloud project in Connectors.

## Risks / decisions needed from you

| Decision | Options |
|---|---|
| Auth user passwords | (a) Supabase support export, or (b) force password reset for all users |
| Cutover downtime | (a) short read-only window (recommended), or (b) dual-write period (complex) |
| Ongoing writes during migration | Freeze signups/payments during final sync |

## Technical details

- Tools: `pg_dump`/`psql` for schema+data, Supabase CLI for functions, Storage API for files.
- Things that do NOT transfer automatically: auth users, secrets, cron jobs, storage files, auth email templates, OAuth provider config, webhook registrations with third parties.
- Estimated effort: 1–2 focused sessions plus a scheduled cutover window.
