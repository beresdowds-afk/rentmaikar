# Rentmaikar Backend Handoff Package

Everything an incoming backend team needs to take ownership of the Rentmaikar server surface. Generated 2026-09-03 by scanning the live codebase and the running database — not hand-maintained.

| File | What it is |
| --- | --- |
| `API-CONTRACT.md` | Every endpoint: the Express gateway plus all 160 Supabase Edge Functions, grouped by domain, with auth mode, schedule and the secrets each one reads. |
| `openapi.yaml` | OpenAPI 3.1 spec of the same surface (168 paths, two servers). Validated with Redocly — zero errors, zero warnings. |
| `backend.env.template` | Every server-side environment variable, empty, grouped by provider, annotated with purpose and consumer count. |
| `CREDENTIALS.md` | Credential inventory, ownership handover order, zero-drop rotation sequence and post-rotation verification steps. **No secret values.** |
| `CUTOVER.md` | Domain topology, webhook endpoints to repoint, cutover sequence and a post-cutover smoke checklist. |

## Regenerating

The inventory is derived from:

- `Deno.env.get("...")` across `supabase/functions/**` and `process.env.*` across `backend/src/**`
- `supabase/config.toml` for per-function `verify_jwt`
- `cron.job` in the database for scheduled workers
- the leading doc comment of each function's `index.ts` for its purpose

Re-run the scan whenever functions are added or removed so the contract, spec and env template stay exhaustive.

## Security rules

- No credential value appears anywhere in this package.
- `SUPABASE_SERVICE_ROLE_KEY` and the database password are not retrievable on the managed platform.
- Publishable keys (Paystack public, OPay public, VAPID public, Supabase publishable) are safe in client code; everything else is server-only.
- Twilio is approved for **voice only**; SMS/WhatsApp routes through Sent.dm with Termii as the Nigeria fallback.
