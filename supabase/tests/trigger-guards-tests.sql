-- =============================================================================
-- BEFORE UPDATE trigger guard regression tests
-- =============================================================================
-- Verifies that the column-scope guards on the seven protected tables:
--   - revert forbidden field changes made by non-admins
--   - allow legitimate field changes for the role that owns the field
--   - never restrict admins
--   - write a row into public.permission_denied_log for every blocked attempt
--
-- Run with:
--   psql -f supabase/tests/trigger-guards-tests.sql
--   scripts/test-trigger-guards.sh   (convenience wrapper)
--
-- Any failing ASSERT aborts and returns non-zero. All test-only rows are
-- rolled back at the end via the outer transaction.
-- =============================================================================

\set ON_ERROR_STOP on
\timing off

BEGIN;

-- Impersonation helper: set the jwt.claims.sub GUC that auth.uid() reads.
CREATE OR REPLACE FUNCTION pg_temp.become(_uid uuid) RETURNS void AS $$
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', _uid::text, 'role', 'authenticated')::text,
    true
  );
END;
$$ LANGUAGE plpgsql;

DO $tests$
DECLARE
  admin_id      uuid;
  driver_id     uuid;
  owner_id      uuid;
  vehicle_id    uuid;

  denied_before bigint;
  denied_after  bigint;

  la_id   uuid;
  rto_id  uuid;
  pn_id   uuid;
  rent_id uuid;
  rs_id   uuid;
  inc_id  uuid;
  wr_id   uuid;
  listing_id uuid;

BEGIN
  ------------------------------------------------------------------------------
  -- Reuse existing real users so we don't need to insert into auth.users.
  ------------------------------------------------------------------------------
  SELECT ur.user_id INTO admin_id
    FROM public.user_roles ur
   WHERE ur.role = 'admin'::app_role
   LIMIT 1;
  IF admin_id IS NULL THEN
    RAISE EXCEPTION 'No admin user found — cannot run trigger-guard tests';
  END IF;

  SELECT p.user_id INTO driver_id
    FROM public.profiles p
   WHERE NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id AND ur.role = 'admin'::app_role)
   ORDER BY p.created_at
   LIMIT 1;
  SELECT p.user_id INTO owner_id
    FROM public.profiles p
   WHERE NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id AND ur.role = 'admin'::app_role)
     AND p.user_id <> driver_id
   ORDER BY p.created_at
   LIMIT 1;
  IF driver_id IS NULL OR owner_id IS NULL THEN
    RAISE EXCEPTION 'Need at least two non-admin users to run trigger-guard tests';
  END IF;

  RAISE NOTICE 'Test users: admin=% driver=% owner=%', admin_id, driver_id, owner_id;

  ------------------------------------------------------------------------------
  -- Fixture rows for each protected table
  ------------------------------------------------------------------------------
  INSERT INTO public.legal_agreements(
    driver_id, owner_id, vehicle_id, agreement_type, agreement_version,
    agreement_content, status, is_compulsory
  ) VALUES (
    driver_id, owner_id, vehicle_id, 'rental', 1,
    'ORIGINAL CONTENT', 'pending', true
  ) RETURNING id INTO la_id;

  INSERT INTO public.rent_to_own_listings(
    vehicle_id, owner_id, total_price, down_payment, monthly_payment,
    duration_months, currency, allow_buyout, allow_conversion_to_rental,
    status, is_available
  ) VALUES (
    vehicle_id, owner_id, 20000, 2000, 500,
    36, 'USD', true, false, 'active', true
  ) RETURNING id INTO listing_id;

  INSERT INTO public.rent_to_own_agreements(
    driver_id, owner_id, vehicle_id, listing_id, total_price, down_payment, monthly_payment,
    duration_months, currency, status
  ) VALUES (
    driver_id, owner_id, vehicle_id, listing_id, 20000, 2000, 500,
    36, 'USD', 'pending'
  ) RETURNING id INTO rto_id;


  INSERT INTO public.price_negotiations(
    driver_id, owner_id, vehicle_id, proposed_daily_rate, status
  ) VALUES (
    driver_id, owner_id, vehicle_id, 55, 'pending'
  ) RETURNING id INTO pn_id;

  INSERT INTO public.rentals(
    driver_id, owner_id, vehicle_id, daily_rate, currency, status,
    start_date, end_date, payment_frequency, region
  ) VALUES (
    driver_id, owner_id, vehicle_id, 75, 'USD', 'active',
    now(), now() + interval '7 days', 'daily', 'USA'
  ) RETURNING id INTO rent_id;

  INSERT INTO public.rideshare_profile_submissions(
    driver_id, vehicle_id, week_start_date, status
  ) VALUES (
    driver_id, vehicle_id, date_trunc('week', now())::date, 'submitted'
  ) RETURNING id INTO rs_id;

  INSERT INTO public.vehicle_incidents(
    driver_id, owner_id, vehicle_id, incident_type, severity, status,
    reported_at, occurred_at
  ) VALUES (
    driver_id, owner_id, vehicle_id, 'minor_damage', 'low', 'reported',
    now(), now()
  ) RETURNING id INTO inc_id;

  INSERT INTO public.weekly_inspection_reports(
    driver_id, owner_id, vehicle_id, week_start_date
  ) VALUES (
    driver_id, owner_id, vehicle_id, date_trunc('week', now())::date
  ) RETURNING id INTO wr_id;

  ----------------------------------------------------------------------------
  -- 1. legal_agreements: driver cannot change status; can change driver_signature
  ----------------------------------------------------------------------------
  PERFORM pg_temp.become(driver_id);
  SELECT count(*) INTO denied_before FROM public.permission_denied_log
    WHERE target_table = 'legal_agreements' AND target_row_id = la_id::text;

  UPDATE public.legal_agreements
     SET status = 'active', driver_signature = 'signed-by-driver'
   WHERE id = la_id;

  ASSERT (SELECT status FROM public.legal_agreements WHERE id = la_id) = 'pending',
    'legal_agreements.status must not change when a driver attempts it';
  ASSERT (SELECT driver_signature FROM public.legal_agreements WHERE id = la_id) = 'signed-by-driver',
    'legal_agreements.driver_signature must be updatable by the driver';

  SELECT count(*) INTO denied_after FROM public.permission_denied_log
    WHERE target_table = 'legal_agreements' AND target_row_id = la_id::text;
  ASSERT denied_after = denied_before + 1,
    'legal_agreements: exactly one permission_denied_log row expected';

  ----------------------------------------------------------------------------
  -- 2. rent_to_own_agreements: driver cannot change total_price
  ----------------------------------------------------------------------------
  PERFORM pg_temp.become(driver_id);
  SELECT count(*) INTO denied_before FROM public.permission_denied_log
    WHERE target_table = 'rent_to_own_agreements' AND target_row_id = rto_id::text;

  UPDATE public.rent_to_own_agreements
     SET total_price = 1, driver_signature = 'driver-signed'
   WHERE id = rto_id;

  ASSERT (SELECT total_price FROM public.rent_to_own_agreements WHERE id = rto_id) = 20000,
    'rent_to_own_agreements.total_price must not change when a driver attempts it';
  ASSERT (SELECT driver_signature FROM public.rent_to_own_agreements WHERE id = rto_id) = 'driver-signed',
    'rent_to_own_agreements.driver_signature must be updatable by the driver';

  SELECT count(*) INTO denied_after FROM public.permission_denied_log
    WHERE target_table = 'rent_to_own_agreements' AND target_row_id = rto_id::text;
  ASSERT denied_after = denied_before + 1,
    'rent_to_own_agreements: one permission_denied_log row expected';

  ----------------------------------------------------------------------------
  -- 3. price_negotiations: non-admin cannot set status='approved'
  ----------------------------------------------------------------------------
  PERFORM pg_temp.become(driver_id);
  SELECT count(*) INTO denied_before FROM public.permission_denied_log
    WHERE target_table = 'price_negotiations' AND target_row_id = pn_id::text;

  UPDATE public.price_negotiations
     SET status = 'approved', final_daily_rate = 40
   WHERE id = pn_id;

  ASSERT (SELECT status FROM public.price_negotiations WHERE id = pn_id) = 'pending',
    'price_negotiations.status must not change from non-admin';
  ASSERT (SELECT final_daily_rate FROM public.price_negotiations WHERE id = pn_id) IS NULL,
    'price_negotiations.final_daily_rate must not change from non-admin';

  SELECT count(*) INTO denied_after FROM public.permission_denied_log
    WHERE target_table = 'price_negotiations' AND target_row_id = pn_id::text;
  ASSERT denied_after = denied_before + 1,
    'price_negotiations: one permission_denied_log row expected';

  ----------------------------------------------------------------------------
  -- 4. rentals: driver cannot change daily_rate
  ----------------------------------------------------------------------------
  PERFORM pg_temp.become(driver_id);
  SELECT count(*) INTO denied_before FROM public.permission_denied_log
    WHERE target_table = 'rentals' AND target_row_id = rent_id::text;

  UPDATE public.rentals SET daily_rate = 1 WHERE id = rent_id;

  ASSERT (SELECT daily_rate FROM public.rentals WHERE id = rent_id) = 75,
    'rentals.daily_rate must not change when a driver attempts it';

  SELECT count(*) INTO denied_after FROM public.permission_denied_log
    WHERE target_table = 'rentals' AND target_row_id = rent_id::text;
  ASSERT denied_after = denied_before + 1,
    'rentals: one permission_denied_log row expected';

  ----------------------------------------------------------------------------
  -- 5. rideshare_profile_submissions: non-admin cannot change admin fields
  ----------------------------------------------------------------------------
  PERFORM pg_temp.become(driver_id);
  SELECT count(*) INTO denied_before FROM public.permission_denied_log
    WHERE target_table = 'rideshare_profile_submissions' AND target_row_id = rs_id::text;

  UPDATE public.rideshare_profile_submissions
     SET status = 'approved', admin_notes = 'self-approved'
   WHERE id = rs_id;

  ASSERT (SELECT status FROM public.rideshare_profile_submissions WHERE id = rs_id) = 'submitted',
    'rideshare_profile_submissions.status must not change from driver';
  ASSERT (SELECT admin_notes FROM public.rideshare_profile_submissions WHERE id = rs_id) IS NULL,
    'rideshare_profile_submissions.admin_notes must not change from driver';

  SELECT count(*) INTO denied_after FROM public.permission_denied_log
    WHERE target_table = 'rideshare_profile_submissions' AND target_row_id = rs_id::text;
  ASSERT denied_after = denied_before + 1,
    'rideshare_profile_submissions: one permission_denied_log row expected';

  ----------------------------------------------------------------------------
  -- 6. vehicle_incidents: driver cannot mark resolved / change severity
  ----------------------------------------------------------------------------
  PERFORM pg_temp.become(driver_id);
  SELECT count(*) INTO denied_before FROM public.permission_denied_log
    WHERE target_table = 'vehicle_incidents' AND target_row_id = inc_id::text;

  UPDATE public.vehicle_incidents
     SET status = 'resolved', severity = 'high', resolved_by = driver_id
   WHERE id = inc_id;

  ASSERT (SELECT status FROM public.vehicle_incidents WHERE id = inc_id) = 'reported',
    'vehicle_incidents.status must not change from driver';
  ASSERT (SELECT severity FROM public.vehicle_incidents WHERE id = inc_id) = 'low',
    'vehicle_incidents.severity must not change from driver';

  SELECT count(*) INTO denied_after FROM public.permission_denied_log
    WHERE target_table = 'vehicle_incidents' AND target_row_id = inc_id::text;
  ASSERT denied_after = denied_before + 1,
    'vehicle_incidents: one permission_denied_log row expected';

  ----------------------------------------------------------------------------
  -- 7. weekly_inspection_reports: driver cannot change admin_decision;
  --    can update inspection photos.
  ----------------------------------------------------------------------------
  PERFORM pg_temp.become(driver_id);
  SELECT count(*) INTO denied_before FROM public.permission_denied_log
    WHERE target_table = 'weekly_inspection_reports' AND target_row_id = wr_id::text;

  UPDATE public.weekly_inspection_reports
     SET admin_decision = 'approved',
         photo_front_view = 'https://cdn/front.jpg'
   WHERE id = wr_id;

  ASSERT (SELECT admin_decision FROM public.weekly_inspection_reports WHERE id = wr_id) IS NULL,
    'weekly_inspection_reports.admin_decision must not change from driver';
  ASSERT (SELECT photo_front_view FROM public.weekly_inspection_reports WHERE id = wr_id) = 'https://cdn/front.jpg',
    'weekly_inspection_reports.photo_front_view must be updatable by the driver';

  SELECT count(*) INTO denied_after FROM public.permission_denied_log
    WHERE target_table = 'weekly_inspection_reports' AND target_row_id = wr_id::text;
  ASSERT denied_after = denied_before + 1,
    'weekly_inspection_reports: one permission_denied_log row expected';

  ----------------------------------------------------------------------------
  -- 8. Admin bypass: admin CAN change admin-only fields, no denial logged.
  ----------------------------------------------------------------------------
  PERFORM pg_temp.become(admin_id);
  SELECT count(*) INTO denied_before FROM public.permission_denied_log;

  UPDATE public.legal_agreements SET status = 'active' WHERE id = la_id;
  UPDATE public.rent_to_own_agreements SET total_price = 25000 WHERE id = rto_id;
  UPDATE public.price_negotiations SET status = 'approved', final_daily_rate = 50 WHERE id = pn_id;
  UPDATE public.rentals SET daily_rate = 80 WHERE id = rent_id;
  UPDATE public.rideshare_profile_submissions SET status = 'approved', admin_notes = 'ok' WHERE id = rs_id;
  UPDATE public.vehicle_incidents SET status = 'resolved', severity = 'high' WHERE id = inc_id;
  UPDATE public.weekly_inspection_reports SET admin_decision = 'approved' WHERE id = wr_id;

  ASSERT (SELECT status FROM public.legal_agreements WHERE id = la_id) = 'active',
    'admin must be able to change legal_agreements.status';
  ASSERT (SELECT total_price FROM public.rent_to_own_agreements WHERE id = rto_id) = 25000,
    'admin must be able to change rent_to_own_agreements.total_price';
  ASSERT (SELECT status FROM public.price_negotiations WHERE id = pn_id) = 'approved',
    'admin must be able to approve price_negotiations';
  ASSERT (SELECT daily_rate FROM public.rentals WHERE id = rent_id) = 80,
    'admin must be able to change rentals.daily_rate';
  ASSERT (SELECT status FROM public.rideshare_profile_submissions WHERE id = rs_id) = 'approved',
    'admin must be able to approve rideshare_profile_submissions';
  ASSERT (SELECT status FROM public.vehicle_incidents WHERE id = inc_id) = 'resolved',
    'admin must be able to resolve vehicle_incidents';
  ASSERT (SELECT admin_decision FROM public.weekly_inspection_reports WHERE id = wr_id) = 'approved',
    'admin must be able to set weekly_inspection_reports.admin_decision';

  SELECT count(*) INTO denied_after FROM public.permission_denied_log;
  ASSERT denied_after = denied_before,
    'admin updates must NOT write any permission_denied_log rows';

  RAISE NOTICE '✅ All 7 trigger-guard tests + admin-bypass test PASSED';
END $tests$;

ROLLBACK;
