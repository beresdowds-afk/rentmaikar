# Verify admin dashboard access isolation (read-only audit)

## Question answered
Drivers/owners **cannot accidentally** reach admin dashboards: all `/admin*` routes are role-guarded, the role is read server-side from `user_roles`, unroled users are blocked, and RLS (`has_role`) enforces access at the database layer. Remaining question is whether anyone could **deliberately** escalate — this plan verifies that.

## Steps (no code changes, no schema changes)

1. **RLS verification query** — confirm on the live database that `public.user_roles`:
   - has RLS enabled
   - grants only SELECT to `authenticated` (no INSERT/UPDATE/DELETE for non-service roles)
   - has no policy allowing users to insert/update their own rows
2. **Privilege-escalation probe** — as an authenticated non-admin session, attempt `insert into user_roles (role='admin')` and confirm it's rejected.
3. **Admin-write audit** — list every code path that writes to `user_roles` (edge functions using service role, e.g. `admin_create_staff_role`) and confirm each is gated by an admin check (`has_role(auth.uid(), 'admin')`).
4. **Edge-function role checks** — spot-check the highest-privilege edge functions (payments, impersonation, treasury) for server-side `has_role` verification rather than trusting the client.
5. **Report** — a short findings list: PASS/AT-RISK per surface, with the specific fix for anything found (fix applied only with your approval).

## Out of scope
Changing any guard logic, roles, or routes — current isolation is sound; this is verification only.
