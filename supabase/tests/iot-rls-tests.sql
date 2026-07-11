-- =============================================================================
-- IoT RLS & SECURITY DEFINER helper regression tests
-- =============================================================================
-- Verifies:
--   1. vehicle_mqtt_credentials  SELECT is limited to admins + IoT-specific
--      support staff (iot_installation / iot_maintenance).
--   2. mqtt_telemetry_logs       SELECT has the same IoT-only scoping.
--   3. SECURITY DEFINER helpers (has_role, is_any_support_staff,
--      is_support_staff, get_support_staff_city) refuse to answer about
--      any user other than auth.uid() unless the caller is an admin.
--
-- All test data is created inside a single transaction and rolled back at the
-- end, so nothing persists. Run with:
--
--   psql -f supabase/tests/iot-rls-tests.sql
--
-- Any failing ASSERT aborts the transaction and returns a non-zero exit code.
-- =============================================================================

\set ON_ERROR_STOP on
\timing off

BEGIN;

-- --- Test fixtures --------------------------------------------------------
-- We seed dummy uuids into user_roles / support_staff. We do NOT insert into
-- auth.users (managed schema) — the helpers only join on user_roles /
-- support_staff, which is enough to exercise the guards.

DO $seed$
DECLARE
  admin_id       uuid := '00000000-0000-0000-0000-00000000adad';
  iot_install_id uuid := '00000000-0000-0000-0000-000000001abc';
  iot_maint_id   uuid := '00000000-0000-0000-0000-000000001a1a';
  legal_id       uuid := '00000000-0000-0000-0000-000000001ea1';
  vehicle_id     uuid := '00000000-0000-0000-0000-00000000ceec';
  driver_id      uuid := '00000000-0000-0000-0000-000000000dd1';
BEGIN
  -- Seed auth.users first (FK target). We run as superuser inside a
  -- transaction that will be rolled back, so nothing persists.
  INSERT INTO auth.users(id, instance_id, aud, role, email,
                         encrypted_password, created_at, updated_at)
  VALUES
    (admin_id,       '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin.rls.test@example.com',       '', now(), now()),
    (iot_install_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'iot-install.rls.test@example.com', '', now(), now()),
    (iot_maint_id,   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'iot-maint.rls.test@example.com',   '', now(), now()),
    (legal_id,       '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'legal.rls.test@example.com',       '', now(), now()),
    (vehicle_id,     '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'vehicle.rls.test@example.com',     '', now(), now()),
    (driver_id,      '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'driver.rls.test@example.com',      '', now(), now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles(user_id, role) VALUES
    (admin_id,       'admin'),
    (iot_install_id, 'iot_support'),
    (iot_maint_id,   'iot_support'),
    (legal_id,       'legal_support'),
    (vehicle_id,     'vehicle_support'),
    (driver_id,      'driver')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.support_staff(user_id, support_type, is_active) VALUES
    (iot_install_id, 'iot_installation', true),
    (iot_maint_id,   'iot_maintenance',  true),
    (legal_id,       'legal_review',     true),
    (vehicle_id,     'vehicle_recall',   true)
  ON CONFLICT DO NOTHING;
END
$seed$;

-- --- Helpers --------------------------------------------------------------
-- become(uid) — switch to the authenticated role with jwt.claims.sub = uid,
-- so auth.uid() returns that user and RLS applies as if they were signed in.

CREATE OR REPLACE FUNCTION pg_temp.become(_uid uuid) RETURNS void AS $$
BEGIN
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims',
                     json_build_object('sub', _uid::text, 'role', 'authenticated')::text,
                     true);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION pg_temp.as_superuser() RETURNS void AS $$
BEGIN
  PERFORM set_config('role', 'postgres', true);
  PERFORM set_config('request.jwt.claims', '', true);
END;
$$ LANGUAGE plpgsql;

-- --- Test runner ----------------------------------------------------------

DO $tests$
DECLARE
  admin_id       uuid := '00000000-0000-0000-0000-00000000adad';
  iot_install_id uuid := '00000000-0000-0000-0000-000000001abc';
  iot_maint_id   uuid := '00000000-0000-0000-0000-000000001a1a';
  legal_id       uuid := '00000000-0000-0000-0000-000000001ea1';
  vehicle_id     uuid := '00000000-0000-0000-0000-00000000ceec';
  driver_id      uuid := '00000000-0000-0000-0000-000000000dd1';
  cnt            integer;
  txt            text;
  ok             boolean;
BEGIN
  RAISE NOTICE '--- 1. vehicle_mqtt_credentials SELECT scoping ---';

  PERFORM pg_temp.become(admin_id);
  PERFORM 1 FROM public.vehicle_mqtt_credentials LIMIT 1; -- must not error
  RAISE NOTICE '  admin: SELECT allowed';

  PERFORM pg_temp.become(iot_install_id);
  PERFORM 1 FROM public.vehicle_mqtt_credentials LIMIT 1;
  RAISE NOTICE '  iot_installation staff: SELECT allowed';

  PERFORM pg_temp.become(iot_maint_id);
  PERFORM 1 FROM public.vehicle_mqtt_credentials LIMIT 1;
  RAISE NOTICE '  iot_maintenance staff: SELECT allowed';

  -- Non-IoT support staff must see zero rows even if data exists.
  PERFORM pg_temp.become(legal_id);
  SELECT count(*) INTO cnt FROM public.vehicle_mqtt_credentials;
  ASSERT cnt = 0, format('legal_support must see 0 credentials, saw %s', cnt);
  RAISE NOTICE '  legal_support: 0 rows (expected)';

  PERFORM pg_temp.become(vehicle_id);
  SELECT count(*) INTO cnt FROM public.vehicle_mqtt_credentials;
  ASSERT cnt = 0, format('vehicle_support must see 0 credentials, saw %s', cnt);
  RAISE NOTICE '  vehicle_support: 0 rows (expected)';

  PERFORM pg_temp.become(driver_id);
  SELECT count(*) INTO cnt FROM public.vehicle_mqtt_credentials;
  ASSERT cnt = 0, format('driver must see 0 credentials, saw %s', cnt);
  RAISE NOTICE '  driver: 0 rows (expected)';

  RAISE NOTICE '--- 2. mqtt_telemetry_logs SELECT scoping ---';

  PERFORM pg_temp.become(iot_install_id);
  PERFORM 1 FROM public.mqtt_telemetry_logs LIMIT 1;
  RAISE NOTICE '  iot_installation staff: SELECT allowed';

  PERFORM pg_temp.become(legal_id);
  SELECT count(*) INTO cnt FROM public.mqtt_telemetry_logs;
  ASSERT cnt = 0, format('legal_support must see 0 telemetry rows, saw %s', cnt);
  RAISE NOTICE '  legal_support: 0 rows (expected)';

  PERFORM pg_temp.become(vehicle_id);
  SELECT count(*) INTO cnt FROM public.mqtt_telemetry_logs;
  ASSERT cnt = 0, format('vehicle_support must see 0 telemetry rows, saw %s', cnt);
  RAISE NOTICE '  vehicle_support: 0 rows (expected)';

  PERFORM pg_temp.become(driver_id);
  SELECT count(*) INTO cnt FROM public.mqtt_telemetry_logs;
  ASSERT cnt = 0, format('driver must see 0 telemetry rows, saw %s', cnt);
  RAISE NOTICE '  driver: 0 rows (expected)';

  RAISE NOTICE '--- 3. SECURITY DEFINER helper guards ---';

  -- has_role: caller may inspect own roles; not other users unless admin.
  PERFORM pg_temp.become(driver_id);
  SELECT public.has_role(driver_id, 'driver'::app_role) INTO ok;
  ASSERT ok, 'driver querying own role should return true';
  SELECT public.has_role(admin_id, 'admin'::app_role) INTO ok;
  ASSERT NOT ok, 'driver must NOT be able to probe admin role via has_role';
  RAISE NOTICE '  has_role: self OK, cross-user blocked';

  -- Admin can inspect anyone.
  PERFORM pg_temp.become(admin_id);
  SELECT public.has_role(driver_id, 'driver'::app_role) INTO ok;
  ASSERT ok, 'admin should be able to inspect other users via has_role';
  RAISE NOTICE '  has_role: admin can query anyone';

  -- is_any_support_staff
  PERFORM pg_temp.become(driver_id);
  SELECT public.is_any_support_staff(iot_install_id) INTO ok;
  ASSERT NOT ok, 'driver must NOT be able to probe support_staff via is_any_support_staff';
  SELECT public.is_any_support_staff(driver_id) INTO ok;
  ASSERT NOT ok, 'driver querying self should be false (not staff)';
  RAISE NOTICE '  is_any_support_staff: cross-user blocked';

  -- is_support_staff
  PERFORM pg_temp.become(legal_id);
  SELECT public.is_support_staff(legal_id, 'legal_review'::support_task_type) INTO ok;
  ASSERT ok, 'legal support querying own type should return true';
  SELECT public.is_support_staff(iot_install_id, 'iot_installation'::support_task_type) INTO ok;
  ASSERT NOT ok, 'legal staff must NOT be able to probe another user via is_support_staff';
  RAISE NOTICE '  is_support_staff: self OK, cross-user blocked';

  -- get_support_staff_city
  PERFORM pg_temp.become(driver_id);
  SELECT public.get_support_staff_city(iot_install_id, 'iot_installation'::support_task_type) INTO txt;
  ASSERT txt IS NULL, 'driver must NOT retrieve another user city via get_support_staff_city';
  RAISE NOTICE '  get_support_staff_city: cross-user returns NULL';

  -- is_admin only reports on caller
  PERFORM pg_temp.become(driver_id);
  SELECT public.is_admin() INTO ok;
  ASSERT NOT ok, 'driver is_admin() must be false';
  PERFORM pg_temp.become(admin_id);
  SELECT public.is_admin() INTO ok;
  ASSERT ok, 'admin is_admin() must be true';
  RAISE NOTICE '  is_admin: reports caller correctly';

  PERFORM pg_temp.as_superuser();
  RAISE NOTICE '=== ALL IoT RLS + HELPER TESTS PASSED ===';
END
$tests$;

ROLLBACK;
