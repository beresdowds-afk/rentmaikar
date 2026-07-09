## Driver Call-In System

Add three "Call In" actions on the Driver Dashboard — **Vehicle Fault**, **Maintenance Schedule**, and **Sick Call-In( incl**ude notes for nature of fault and maintenance call in) — that pause payments, geofence the vehicle to a 20 m radius, capture detailed real time vehicle telemetry at point of call in, logges report and escalate to a vehicle recall when abused.

### 1. Driver Dashboard UI

New "Call In" card on `src/pages/DriverDashboard.tsx` with three buttons. Each opens a confirmation dialog that:

- Captures current vehicle GPS (from latest MQTT/Traccar telemetry) as geofence center.
- Requires a short reason (validated with Zod, max 500 chars).
- Shows the rules: 24 h validity (fault/maintenance), 7 d cap (sick, needs owner+admin approval beyond that), auto-reactivation on geofence breach.

An "Active Call-Ins" panel shows the live call-in, remaining time, geofence status, and a "Cancel Call-In" button.

If the driver has an active recall request or approved recall, the Call In buttons are disabled with an explanatory message.

### 2. Database (new migration)

- `**driver_call_ins**`: `driver_id`, `rental_id`, `vehicle_id`, `type` (`fault` | `maintenance` | `sick`), `reason`, `status` (`active` | `expired` | `cancelled` | `breached` | `resolved`), `geofence_lat`, `geofence_lng`, `geofence_radius_m` (default 20), `started_at`, `expires_at`, `ended_at`, `end_reason`, standard timestamps.
- `**vehicle_geofences**`: active geofence per vehicle tied to a call-in (`vehicle_id`, `call_in_id`, `center_lat`, `center_lng`, `radius_m`, `active`, `breached_at`).
- Extend `**vehicle_recalls**` with `triggered_by_call_ins` (uuid[]) and `owner_approval_status`, `admin_validation_status` if not already present.
- RLS: driver reads/creates own call-ins; owner reads call-ins on their vehicles; admin/admin_assistant full access. GRANTs for authenticated + service_role.
- Trigger on insert: sets `expires_at = now() + 24h` for fault/maintenance, `+ 7d` for sick.
- Trigger on insert: sets `profiles.payments_suspended = true` (new boolean column) and records `suspended_reason`, `suspended_until`.
- Trigger on status change to `expired`/`cancelled`/`breached`/`resolved`: clears suspension unless another active call-in exists.

### 3. Payment Suspension

- Add `payments_suspended`, `suspended_reason`, `suspended_until` on `profiles`.
- `process-daily-debits`, `process-predue-reminders`, and `process-payment-defaults` skip drivers where `payments_suspended = true` and log the skip in `messaging_events`.
- Driver dashboard payment card shows a "Payments Suspended" banner with call-in reference and expiry.

### 4. Geofence Enforcement (edge function + cron)

- New edge function `**enforce-call-in-geofence**` (cron every 60 s, `verify_jwt = false`, `CRON_SECRET` guarded):
  - Loads active `vehicle_geofences`.
  - Fetches latest vehicle location via existing telemetry client (MQTT snapshot table / Traccar).
  - Computes Haversine distance (reuse `src/lib/geo-utils.ts` logic ported to Deno). Breach if distance > `radius_m`.
  - On breach: marks call-in `breached`, geofence `active=false`, reactivates payments, logs to `messaging_events`, notifies driver + owner + admin via `send-inbox-reply` (email + SMS/WhatsApp per region).
- New edge function `**expire-call-ins**` (cron every 5 min): flips `active`→`expired` when `expires_at < now()`, clears suspension.

### 5. Recall Escalation

- New edge function `**check-repeat-call-ins**` (runs after each call-in insert via trigger `pg_net` webhook, and nightly):
  - If a driver has ≥1 fault/maintenance call-in on each of 2 consecutive calendar days for the same vehicle, insert a `vehicle_recalls` row with `status='requested'`, `reason='repeat_call_ins'`, and link the triggering call-ins.
  - Notify driver, owner, and admin dashboards (in-app + email).
- Sick call-in >7 days: when `expires_at` is reached and driver flags "extend", a recall request is created requiring **owner consent** + **admin approval** before the vehicle is released for reassignment.
- Extend `src/components/admin/VehicleRecallManagement.tsx` and add an owner-side approval card (`src/components/owner/RecallApprovalCard.tsx`) with Approve/Reject actions. Approval requires both owner + admin; either rejection cancels the recall.

### 6. Notifications

Reuse `notify-referees`-style multi-channel sender (`send-inbox-reply` / `send-sms-notification` / WhatsApp) with region-aware templates in `src/lib/region-templates.ts` for: call-in created, geofence breached, payment reactivated, recall requested, recall approved/rejected.

### 7. Tests

- Unit: geofence Haversine breach logic, call-in expiry timing, repeat-call-in detector (2 consecutive days), suspension skip in debit worker.
- Component: Driver dashboard Call In dialog validation and disabled states.
- Integration (vitest + supabase mocks): create call-in → payment suspended → simulate breach → payment reactivated + notifications logged.

### Files

**New**

- `supabase/migrations/<ts>_driver_call_ins.sql`
- `supabase/functions/enforce-call-in-geofence/index.ts`
- `supabase/functions/expire-call-ins/index.ts`
- `supabase/functions/check-repeat-call-ins/index.ts`
- `supabase/functions/create-call-in/index.ts` (server-side create with validation + geofence init)
- `src/components/driver/CallInPanel.tsx`
- `src/components/driver/CallInDialog.tsx`
- `src/components/owner/RecallApprovalCard.tsx`
- `src/hooks/useCallIns.ts`
- `src/lib/__tests__/call-in-geofence.test.ts`
- `src/lib/__tests__/call-in-repeat.test.ts`

**Edited**

- `src/pages/DriverDashboard.tsx` (mount CallInPanel, suspension banner)
- `src/pages/OwnerDashboard.tsx` (recall approvals)
- `src/pages/AdminDashboard.tsx` (call-in monitoring tab in VehicleRecallManagement)
- `src/components/admin/VehicleRecallManagement.tsx`
- `supabase/functions/process-daily-debits/index.ts`
- `supabase/functions/process-predue-reminders/index.ts`
- `supabase/functions/process-payment-defaults/index.ts`
- `src/lib/region-templates.ts`
- `supabase/config.toml` (cron entries for the three new functions)