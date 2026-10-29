-- ============================================================================
-- Migration: Database-Level Overbooking (Race Condition) & Cancellation Window Triggers
-- ============================================================================

-- 1. BEFORE INSERT trigger on `public.bookings`:
--    Locks the `class_sessions` row with `FOR UPDATE` to serialize concurrent
--    booking attempts and prevent overbooking beyond `max_capacity`.
CREATE OR REPLACE FUNCTION private.validate_booking_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_capacity integer;
  v_current_bookings integer;
  v_is_active boolean;
  v_start_time timestamptz;
BEGIN
  -- Lock the session row so concurrent transactions cannot overbook the last spot
  SELECT
    wc.max_capacity,
    COALESCE(cs.current_bookings, 0),
    cs.is_active,
    cs.start_time
  INTO
    v_max_capacity,
    v_current_bookings,
    v_is_active,
    v_start_time
  FROM public.class_sessions cs
  JOIN public.workout_classes wc ON wc.id = cs.class_id
  WHERE cs.id = NEW.session_id
  FOR UPDATE OF cs;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Workout session not found';
  END IF;

  IF v_is_active IS DISTINCT FROM true AND NOT COALESCE((SELECT private.is_admin()), false) THEN
    RAISE EXCEPTION 'This workout session is not active';
  END IF;

  IF v_start_time <= now() AND NOT COALESCE((SELECT private.is_admin()), false) THEN
    RAISE EXCEPTION 'Cannot book a workout session that has already started';
  END IF;

  IF NEW.booking_status = 'confirmed' AND v_current_bookings >= v_max_capacity THEN
    RAISE EXCEPTION 'This session is already full';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.validate_booking_insert() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trigger_validate_booking_insert ON public.bookings;
CREATE TRIGGER trigger_validate_booking_insert
  BEFORE INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION private.validate_booking_insert();

-- 2. BEFORE DELETE trigger on `public.bookings`:
--    Enforces the 2-hour cancellation cutoff at the database level for regular users,
--    while allowing admins and automated session cleanup jobs (`auth.uid() IS NULL`).
CREATE OR REPLACE FUNCTION private.validate_booking_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_time timestamptz;
BEGIN
  -- Allow system/cron jobs (where auth.uid() is NULL) and admins to delete at any time
  IF (SELECT auth.uid()) IS NULL OR COALESCE((SELECT private.is_admin()), false) THEN
    RETURN OLD;
  END IF;

  SELECT cs.start_time
  INTO v_start_time
  FROM public.class_sessions cs
  WHERE cs.id = OLD.session_id;

  -- If the parent session is being deleted or doesn't exist, allow cascade delete
  IF NOT FOUND THEN
    RETURN OLD;
  END IF;

  IF (v_start_time - now()) < interval '2 hours' THEN
    RAISE EXCEPTION 'Bookings can only be cancelled at least 2 hours before the workout starts';
  END IF;

  RETURN OLD;
END;
$$;

REVOKE ALL ON FUNCTION private.validate_booking_delete() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trigger_validate_booking_delete ON public.bookings;
CREATE TRIGGER trigger_validate_booking_delete
  BEFORE DELETE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION private.validate_booking_delete();

-- ============================================================================
-- 3. Allow SQL Editor / Dashboard (`postgres` / `supabase_admin`) to update `user_tier`
--    while still blocking regular authenticated/anon API clients
-- ============================================================================
CREATE OR REPLACE FUNCTION public.prevent_user_tier_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.user_tier IS DISTINCT FROM OLD.user_tier THEN
    IF current_user NOT IN ('postgres', 'supabase_admin', 'service_role')
       AND COALESCE(current_setting('request.jwt.claim.role', true), '') <> 'service_role' THEN
      RAISE EXCEPTION 'You are not allowed to change user_tier';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- 4. Idempotent Demo Accounts Seed (for 1-Click Demo Login on /login)
--    Creates `demo_member` (regular) and `demo_admin` (admin) with password `demo123456`
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
DECLARE
  v_member_id uuid := '00000000-0000-0000-0000-000000000101';
  v_admin_id  uuid := '00000000-0000-0000-0000-000000000102';
BEGIN
  -- Ensure trigger allows tier updates during this transaction
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);

  -- 1. Seed Demo Member in auth.users if not exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'demo.member@workoutbooking.demo') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_member_id,
      'authenticated',
      'authenticated',
      'demo.member@workoutbooking.demo',
      extensions.crypt('demo123456', extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"username":"demo_member","full_name":"Demo Member"}'::jsonb,
      now(),
      now(),
      '', '', '', ''
    );

    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      v_member_id,
      jsonb_build_object('sub', v_member_id::text, 'email', 'demo.member@workoutbooking.demo'),
      'email',
      v_member_id::text,
      now(),
      now(),
      now()
    ) ON CONFLICT DO NOTHING;
  ELSE
    SELECT id INTO v_member_id FROM auth.users WHERE email = 'demo.member@workoutbooking.demo' LIMIT 1;
  END IF;

  INSERT INTO public.user_profiles (id, email, username, full_name, user_tier)
  VALUES (v_member_id, 'demo.member@workoutbooking.demo', 'demo_member', 'Demo Member', 'regular')
  ON CONFLICT (id) DO UPDATE
    SET username = EXCLUDED.username,
        full_name = EXCLUDED.full_name,
        user_tier = 'regular';

  -- 2. Seed Demo Admin in auth.users if not exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'demo.admin@workoutbooking.demo') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_admin_id,
      'authenticated',
      'authenticated',
      'demo.admin@workoutbooking.demo',
      extensions.crypt('demo123456', extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"username":"demo_admin","full_name":"Demo Admin"}'::jsonb,
      now(),
      now(),
      '', '', '', ''
    );

    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      v_admin_id,
      jsonb_build_object('sub', v_admin_id::text, 'email', 'demo.admin@workoutbooking.demo'),
      'email',
      v_admin_id::text,
      now(),
      now(),
      now()
    ) ON CONFLICT DO NOTHING;
  ELSE
    SELECT id INTO v_admin_id FROM auth.users WHERE email = 'demo.admin@workoutbooking.demo' LIMIT 1;
  END IF;

  INSERT INTO public.user_profiles (id, email, username, full_name, user_tier)
  VALUES (v_admin_id, 'demo.admin@workoutbooking.demo', 'demo_admin', 'Demo Admin', 'admin')
  ON CONFLICT (id) DO UPDATE
    SET username = EXCLUDED.username,
        full_name = EXCLUDED.full_name,
        user_tier = 'admin';
END $$;

