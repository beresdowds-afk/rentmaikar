-- =============================================================================
-- IoT RLS & SECURITY DEFINER helper regression tests
-- =============================================================================
-- Verifies scoping on vehicle_mqtt_credentials, mqtt_telemetry_logs, and the
-- SECURITY DEFINER helpers used across RLS policies. Uses existing users from
-- the database (no seeding — the auth schema is off-limits). Wrapped in a
-- transaction and rolled back at the end so nothing changes.
--
--   psql -f supabase/tests/iot-rls-tests.sql
--
-- A failing ASSERT aborts and returns non-zero.
-- =============================================================================

\set ON_ERROR_STOP on
\timing off

BEGIN;

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

DO $tests$
DECLARE
  admin_id       uuid;
  iot_install_id uuid;
  iot_maint_id   uuid;
  legal_id       uuid;
  vehicle_id     uuid;
  driver_id      uuid;
  cnt            integer;
  txt            text;
  ok             boolean;
BEGIN
  ------------------------------------------------------------------
  -- Discover a live user for each role we need to exercise. If any
  -- role has no representative, we log and skip its assertions
  -- rather than fail — the test proves fresh scoping wherever data
  -- exists.
  ------------------------------------------------------------------
  SELECT user_id INTO admin_id       FROM public.user_roles WHERE role = 'admin'         LIMIT 1;
  SELECT user_id INTO driver_id      FROM public.user_roles WHERE role = 'driver'        LIMIT 1;

  SELECT s.user_id INTO iot_install_id
    FROM public.support_staff s
   WHERE s.support_type = 'iot_installation' AND s.is_active LIMIT 1;

  SELECT s.user_id INTO iot_maint_id
    FROM public.support_staff s
   WHERE s.support_type = 'iot_maintenance' AND s.is_active LIMIT 1;

  SELECT s.user_id INTO legal_id
    FROM public.support_staff s
   WHERE s.support_type NOT IN ('iot_installation','iot_maintenance')
     AND s.is_active
     AND s.support_type::text ILIKE 'legal%' LIMIT 1;

  SELECT s.user_id INTO vehicle_id
    FROM public.support_staff s
   WHERE s.support_type NOT IN ('iot_installation','iot_maintenance')
     AND s.is_active
     AND s.support_type::text ILIKE 'vehicle%' LIMIT 1;

  RAISE NOTICE 'Fixture users → admin=%, iot_install=%, iot_maint=%, legal=%, vehicle=%, driver=%',
    admin_id, iot_install_id, iot_maint_id, legal_id, vehicle_id, driver_id;

  ------------------------------------------------------------------
  -- 1. vehicle_mqtt_credentials SELECT scoping
  ------------------------------------------------------------------
  RAISE NOTICE '--- 1. vehicle_mqtt_credentials SELECT scoping ---';

  IF admin_id IS NOT NULL THEN
    PERFORM pg_temp.become(admin_id);
    PERFORM 1 FROM public.vehicle_mqtt_credentials LIMIT 1; -- must not error
    RAISE NOTICE '  admin: SELECT allowed';
  END IF;

  IF iot_install_id IS NOT NULL THEN
    PERFORM pg_temp.become(iot_install_id);
    PERFORM 1 FROM public.vehicle_mqtt_credentials LIMIT 1;
    RAISE NOTICE '  iot_installation staff: SELECT allowed';
  END IF;

  IF iot_maint_id IS NOT NULL THEN
    PERFORM pg_temp.become(iot_maint_id);
    PERFORM 1 FROM public.vehicle_mqtt_credentials LIMIT 1;
    RAISE NOTICE '  iot_maintenance staff: SELECT allowed';
  END IF;

  IF legal_id IS NOT NULL THEN
    PERFORM pg_temp.become(legal_id);
    SELECT count(*) INTO cnt FROM public.vehicle_mqtt_credentials;
    ASSERT cnt = 0, format('legal_support must see 0 credentials, saw %s', cnt);
    RAISE NOTICE '  legal_support: 0 rows (expected)';
  ELSE
    RAISE NOTICE '  legal_support: no fixture user — skipped';
  END IF;

  IF vehicle_id IS NOT NULL THEN
    PERFORM pg_temp.become(vehicle_id);
    SELECT count(*) INTO cnt FROM public.vehicle_mqtt_credentials;
    ASSERT cnt = 0, format('vehicle_support must see 0 credentials, saw %s', cnt);
    RAISE NOTICE '  vehicle_support: 0 rows (expected)';
  ELSE
    RAISE NOTICE '  vehicle_support: no fixture user — skipped';
  END IF;

  IF driver_id IS NOT NULL THEN
    PERFORM pg_temp.become(driver_id);
    SELECT count(*) INTO cnt FROM public.vehicle_mqtt_credentials;
    ASSERT cnt = 0, format('driver must see 0 credentials, saw %s', cnt);
    RAISE NOTICE '  driver: 0 rows (expected)';
  END IF;

  ------------------------------------------------------------------
  -- 2. mqtt_telemetry_logs SELECT scoping
  ------------------------------------------------------------------
  RAISE NOTICE '--- 2. mqtt_telemetry_logs SELECT scoping ---';

  IF iot_install_id IS NOT NULL THEN
    PERFORM pg_temp.become(iot_install_id);
    PERFORM 1 FROM public.mqtt_telemetry_logs LIMIT 1;
    RAISE NOTICE '  iot_installation staff: SELECT allowed';
  END IF;

  IF legal_id IS NOT NULL THEN
    PERFORM pg_temp.become(legal_id);
    SELECT count(*) INTO cnt FROM public.mqtt_telemetry_logs;
    ASSERT cnt = 0, format('legal_support must see 0 telemetry rows, saw %s', cnt);
    RAISE NOTICE '  legal_support: 0 rows (expected)';
  END IF;

  IF vehicle_id IS NOT NULL THEN
    PERFORM pg_temp.become(vehicle_id);
    SELECT count(*) INTO cnt FROM public.mqtt_telemetry_logs;
    ASSERT cnt = 0, format('vehicle_support must see 0 telemetry rows, saw %s', cnt);
    RAISE NOTICE '  vehicle_support: 0 rows (expected)';
  END IF;

  IF driver_id IS NOT NULL THEN
    PERFORM pg_temp.become(driver_id);
    SELECT count(*) INTO cnt FROM public.mqtt_telemetry_logs;
    ASSERT cnt = 0, format('driver must see 0 telemetry rows, saw %s', cnt);
    RAISE NOTICE '  driver: 0 rows (expected)';
  END IF;

  ------------------------------------------------------------------
  -- 3. SECURITY DEFINER helper guards
  ------------------------------------------------------------------
  RAISE NOTICE '--- 3. SECURITY DEFINER helper guards ---';

  IF driver_id IS NOT NULL AND admin_id IS NOT NULL THEN
    PERFORM pg_temp.become(driver_id);
    SELECT public.has_role(driver_id, 'driver'::app_role) INTO ok;
    ASSERT ok, 'driver querying own role should return true';
    SELECT public.has_role(admin_id, 'admin'::app_role) INTO ok;
    ASSERT NOT ok, 'driver must NOT be able to probe admin role via has_role';
    RAISE NOTICE '  has_role: self OK, cross-user blocked';

    PERFORM pg_temp.become(admin_id);
    SELECT public.has_role(driver_id, 'driver'::app_role) INTO ok;
    ASSERT ok, 'admin should be able to inspect other users via has_role';
    RAISE NOTICE '  has_role: admin can query anyone';
  END IF;

  IF driver_id IS NOT NULL AND iot_install_id IS NOT NULL THEN
    PERFORM pg_temp.become(driver_id);
    SELECT public.is_any_support_staff(iot_install_id) INTO ok;
    ASSERT NOT ok, 'driver must NOT be able to probe support_staff via is_any_support_staff';
    SELECT public.is_any_support_staff(driver_id) INTO ok;
    ASSERT NOT ok, 'driver querying self should be false (not staff)';
    RAISE NOTICE '  is_any_support_staff: cross-user blocked';
  END IF;

  IF legal_id IS NOT NULL AND iot_install_id IS NOT NULL THEN
    PERFORM pg_temp.become(legal_id);
    SELECT public.is_support_staff(iot_install_id, 'iot_installation'::support_task_type) INTO ok;
    ASSERT NOT ok, 'legal staff must NOT be able to probe another user via is_support_staff';
    RAISE NOTICE '  is_support_staff: cross-user blocked';
  END IF;

  IF driver_id IS NOT NULL AND iot_install_id IS NOT NULL THEN
    PERFORM pg_temp.become(driver_id);
    SELECT public.get_support_staff_city(iot_install_id, 'iot_installation'::support_task_type) INTO txt;
    ASSERT txt IS NULL, 'driver must NOT retrieve another user city via get_support_staff_city';
    RAISE NOTICE '  get_support_staff_city: cross-user returns NULL';
  END IF;

  IF driver_id IS NOT NULL THEN
    PERFORM pg_temp.become(driver_id);
    SELECT public.is_admin() INTO ok;
    ASSERT NOT ok, 'driver is_admin() must be false';
  END IF;
  IF admin_id IS NOT NULL THEN
    PERFORM pg_temp.become(admin_id);
    SELECT public.is_admin() INTO ok;
    ASSERT ok, 'admin is_admin() must be true';
  END IF;
  RAISE NOTICE '  is_admin: reports caller correctly';

  PERFORM pg_temp.as_superuser();
  RAISE NOTICE '=== ALL IoT RLS + HELPER TESTS PASSED ===';
END
$tests$;

ROLLBACK;
