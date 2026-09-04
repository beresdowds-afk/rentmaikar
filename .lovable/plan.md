# Consolidate email domains in Resend (notify. + backend.rentmaikar.com)

## Goal
Manage both email subdomains inside Resend so inbound email no longer depends on the separate Cloudflare Email Worker hop.

## What I verified
- `notify.rentmaikar.com` is **already added and verified in Resend** (sending + receiving enabled, region eu-west-1). No action needed there. Its DNS zone is delegated to Lovable nameservers and its MX points to Lovable-managed inbound mail — leave it untouched.
- `backend.rentmaikar.com` has **no MX record** today and is not in Resend. Inbound mail to it currently flows: Cloudflare Email Routing → Cloudflare Email Worker (`cloudflare/email-router`) → signed POST to the `email-webhook` function.

## Plan

### 1. Add backend.rentmaikar.com to Resend
- Via the linked Resend connection (API): create the domain `backend.rentmaikar.com`, eu-west-1 region, receiving enabled.
- Resend returns the DNS records to publish (MX to Resend inbound servers, SPF TXT, DKIM TXT).

### 2. Publish the DNS records (user action, one small step)
- Records go in the Cloudflare DNS zone for rentmaikar.com (DNS-only, grey cloud).
- I'll present the exact records from Resend's response — you add them in Cloudflare DNS, then I trigger verification via the Resend API and confirm status `verified`.

### 3. Point Resend inbound webhooks at the existing email-webhook function
- Register an inbound webhook in Resend (Svix-signed with the same `RESEND_WEBHOOK_SECRET` the function already verifies) so `message.received` events POST to the inbound email endpoint.
- The new email-routing rules table (support/admin/noreply/notification routing) keeps working unchanged — it consumes the same webhook payload.

### 4. Cut over and retire the Cloudflare worker hop
- Send a test email to a `backend.rentmaikar.com` mailbox and confirm it lands in the admin inbox with routing metadata.
- Disable the Cloudflare Email Routing rule for that address and note `cloudflare/email-router` as deprecated (kept in repo, no longer live).

### 5. Keep notify.rentmaikar.com exactly as-is
- Already verified in Resend and used for all outbound sending; inbound replies there are handled by Lovable-managed mail. No DNS changes on this subdomain.

## Out of scope / notes
- Only one MX destination can receive mail per subdomain — that's why the Cloudflare routing rule for backend.rentmaikar.com is removed in step 4.
- No code changes to the app; steps 1–3 are API calls + one DNS step from you.

## Technical details
- Domain create/verify: `POST/GET /domains` via the Resend connector gateway.
- Inbound webhook: Resend dashboard/API webhook with `message.received`, Svix signature verified by existing `verifySvixSignature` in `supabase/functions/email-webhook`.
- After cutover: redeploy nothing; `email-webhook` already accepts Svix-signed inbound payloads.
