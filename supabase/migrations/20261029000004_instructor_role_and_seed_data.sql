-- Migration: Instructor Role Permissions & Rich Dummy Schedule Seed

-- 1. Helper Functions for Instructor Role
CREATE OR REPLACE FUNCTION private.is_instructor()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE id = (SELECT auth.uid())
      AND user_tier = 'instructor'
  );
$$;

REVOKE ALL ON FUNCTION private.is_instructor() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_instructor() TO authenticated;

CREATE OR REPLACE FUNCTION private.is_session_instructor(p_session_id integer)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.class_sessions cs
    WHERE cs.id = p_session_id
      AND cs.instructor_id = (SELECT auth.uid())
      AND private.is_instructor()
  );
$$;

REVOKE ALL ON FUNCTION private.is_session_instructor(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_session_instructor(integer) TO authenticated;

-- Allow both admins and instructors to fetch the instructor list
CREATE OR REPLACE FUNCTION public.get_available_instructors()
RETURNS TABLE(id uuid, username text, full_name text, email text)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (private.is_admin() OR private.is_instructor()) THEN
    RAISE EXCEPTION 'Only admins and instructors can fetch instructors list';
  END IF;

  RETURN QUERY
  SELECT
    up.id,
    up.username::TEXT,
    up.full_name::TEXT,
    up.email::TEXT
  FROM public.user_profiles up
  WHERE up.user_tier IN ('instructor', 'admin')
  ORDER BY up.username;
END;
$$;

REVOKE ALL ON FUNCTION public.get_available_instructors() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_available_instructors() TO authenticated;

-- 2. Update RLS Policies to Empower Instructors on Their Own Sessions

-- user_profiles: allow instructors to read user profiles (for Manual Booking & rosters)
DROP POLICY IF EXISTS "View user profiles" ON public.user_profiles;
CREATE POLICY "View user profiles"
  ON public.user_profiles
  FOR SELECT
  USING (
    id = (SELECT auth.uid())
    OR user_tier IN ('instructor', 'admin')
    OR private.is_admin()
    OR private.is_instructor()
  );

-- class_sessions: allow instructors to create, update, and delete their own sessions
DROP POLICY IF EXISTS "View class sessions" ON public.class_sessions;
CREATE POLICY "View class sessions"
  ON public.class_sessions
  FOR SELECT
  USING (
    is_active = true
    OR private.is_admin()
    OR instructor_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Admins can create sessions" ON public.class_sessions;
DROP POLICY IF EXISTS "Admins and instructors can create sessions" ON public.class_sessions;
CREATE POLICY "Admins and instructors can create sessions"
  ON public.class_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    private.is_admin()
    OR (private.is_instructor() AND instructor_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "Admins can update sessions" ON public.class_sessions;
DROP POLICY IF EXISTS "Admins and instructors can update sessions" ON public.class_sessions;
CREATE POLICY "Admins and instructors can update sessions"
  ON public.class_sessions
  FOR UPDATE
  TO authenticated
  USING (
    private.is_admin()
    OR (private.is_instructor() AND instructor_id = (SELECT auth.uid()))
  )
  WITH CHECK (
    private.is_admin()
    OR (private.is_instructor() AND instructor_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "Admins can delete sessions" ON public.class_sessions;
DROP POLICY IF EXISTS "Admins and instructors can delete sessions" ON public.class_sessions;
CREATE POLICY "Admins and instructors can delete sessions"
  ON public.class_sessions
  FOR DELETE
  TO authenticated
  USING (
    private.is_admin()
    OR (private.is_instructor() AND instructor_id = (SELECT auth.uid()))
  );

-- bookings: allow instructors to view, create, and remove bookings for their own sessions
DROP POLICY IF EXISTS "View bookings" ON public.bookings;
CREATE POLICY "View bookings"
  ON public.bookings
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR private.is_admin()
    OR private.is_session_instructor(session_id)
  );

DROP POLICY IF EXISTS "Create bookings" ON public.bookings;
CREATE POLICY "Create bookings"
  ON public.bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR private.is_admin()
    OR private.is_session_instructor(session_id)
  );

DROP POLICY IF EXISTS "Delete bookings" ON public.bookings;
CREATE POLICY "Delete bookings"
  ON public.bookings
  FOR DELETE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR private.is_admin()
    OR private.is_session_instructor(session_id)
  );

-- waitlist: allow instructors to view waitlist entries for their own sessions
DROP POLICY IF EXISTS "View waitlist entries" ON public.waitlist;
CREATE POLICY "View waitlist entries"
  ON public.waitlist
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR private.is_admin()
    OR private.is_session_instructor(session_id)
  );

-- Update booking triggers so instructors managing their own session have staff privileges
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
  v_is_staff boolean;
BEGIN
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

  v_is_staff := (SELECT auth.uid()) IS NULL
    OR COALESCE((SELECT private.is_admin()), false)
    OR COALESCE((SELECT private.is_session_instructor(NEW.session_id)), false);

  IF v_is_active IS DISTINCT FROM true AND NOT v_is_staff THEN
    RAISE EXCEPTION 'This workout session is not active';
  END IF;

  IF v_start_time <= now() AND NOT v_is_staff THEN
    RAISE EXCEPTION 'Cannot book a workout session that has already started';
  END IF;

  IF NEW.booking_status = 'confirmed' AND v_current_bookings >= v_max_capacity THEN
    RAISE EXCEPTION 'This session is already full';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.validate_booking_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_time timestamptz;
BEGIN
  IF (SELECT auth.uid()) IS NULL
     OR COALESCE((SELECT private.is_admin()), false)
     OR COALESCE((SELECT private.is_session_instructor(OLD.session_id)), false) THEN
    RETURN OLD;
  END IF;

  SELECT cs.start_time
  INTO v_start_time
  FROM public.class_sessions cs
  WHERE cs.id = OLD.session_id;

  IF NOT FOUND THEN
    RETURN OLD;
  END IF;

  IF (v_start_time - now()) < interval '2 hours' THEN
    RAISE EXCEPTION 'Bookings can only be cancelled at least 2 hours before the workout starts';
  END IF;

  RETURN OLD;
END;
$$;

-- 3. Seed Demo Instructor, Extra Coaches, Members, Workout Templates & Multi-Session Daily Schedule
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
DECLARE
  v_demo_member_id     uuid := '00000000-0000-0000-0000-000000000101';
  v_demo_admin_id      uuid := '00000000-0000-0000-0000-000000000102';
  v_demo_instructor_id uuid := '00000000-0000-0000-0000-000000000103';
  v_coach_eszter_id    uuid := '00000000-0000-0000-0000-000000000104';
  v_coach_bence_id     uuid := '00000000-0000-0000-0000-000000000105';
  v_member_anna_id     uuid := '00000000-0000-0000-0000-000000000106';
  v_member_peter_id    uuid := '00000000-0000-0000-0000-000000000107';
  v_member_kata_id     uuid := '00000000-0000-0000-0000-000000000108';
  v_member_david_id    uuid := '00000000-0000-0000-0000-000000000109';

  v_class_yoga       integer;
  v_class_hiit       integer;
  v_class_crossfit   integer;
  v_class_spin       integer;
  v_class_kettlebell integer;
  v_class_mobility   integer;

  v_week_monday timestamptz;
  v_day_offset  integer;
  v_day_base    timestamptz;
  v_session_rec record;
BEGIN
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);

  -- Helper block to upsert demo/seed accounts into auth.users + public.user_profiles
  -- 1) Demo Instructor (Kovács Máté)
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'demo.instructor@workoutbooking.demo') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_demo_instructor_id, 'authenticated', 'authenticated',
      'demo.instructor@workoutbooking.demo', extensions.crypt('demo123456', extensions.gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      '{"username":"demo_instructor","full_name":"Kovács Máté (Coach)"}'::jsonb,
      now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_demo_instructor_id, jsonb_build_object('sub', v_demo_instructor_id::text, 'email', 'demo.instructor@workoutbooking.demo'), 'email', v_demo_instructor_id::text, now(), now(), now())
    ON CONFLICT DO NOTHING;
  ELSE
    SELECT id INTO v_demo_instructor_id FROM auth.users WHERE email = 'demo.instructor@workoutbooking.demo' LIMIT 1;
  END IF;

  INSERT INTO public.user_profiles (id, email, username, full_name, user_tier)
  VALUES (v_demo_instructor_id, 'demo.instructor@workoutbooking.demo', 'demo_instructor', 'Kovács Máté (Coach)', 'instructor')
  ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username, full_name = EXCLUDED.full_name, user_tier = 'instructor';

  -- 2) Coach Eszter
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'eszter.coach@workoutbooking.demo') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_coach_eszter_id, 'authenticated', 'authenticated',
      'eszter.coach@workoutbooking.demo', extensions.crypt('demo123456', extensions.gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      '{"username":"coach_eszter","full_name":"Tóth Eszter"}'::jsonb,
      now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_coach_eszter_id, jsonb_build_object('sub', v_coach_eszter_id::text, 'email', 'eszter.coach@workoutbooking.demo'), 'email', v_coach_eszter_id::text, now(), now(), now())
    ON CONFLICT DO NOTHING;
  ELSE
    SELECT id INTO v_coach_eszter_id FROM auth.users WHERE email = 'eszter.coach@workoutbooking.demo' LIMIT 1;
  END IF;

  INSERT INTO public.user_profiles (id, email, username, full_name, user_tier)
  VALUES (v_coach_eszter_id, 'eszter.coach@workoutbooking.demo', 'coach_eszter', 'Tóth Eszter', 'instructor')
  ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username, full_name = EXCLUDED.full_name, user_tier = 'instructor';

  -- 3) Coach Bence
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'bence.coach@workoutbooking.demo') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_coach_bence_id, 'authenticated', 'authenticated',
      'bence.coach@workoutbooking.demo', extensions.crypt('demo123456', extensions.gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      '{"username":"coach_bence","full_name":"Horváth Bence"}'::jsonb,
      now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_coach_bence_id, jsonb_build_object('sub', v_coach_bence_id::text, 'email', 'bence.coach@workoutbooking.demo'), 'email', v_coach_bence_id::text, now(), now(), now())
    ON CONFLICT DO NOTHING;
  ELSE
    SELECT id INTO v_coach_bence_id FROM auth.users WHERE email = 'bence.coach@workoutbooking.demo' LIMIT 1;
  END IF;

  INSERT INTO public.user_profiles (id, email, username, full_name, user_tier)
  VALUES (v_coach_bence_id, 'bence.coach@workoutbooking.demo', 'coach_bence', 'Horváth Bence', 'instructor')
  ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username, full_name = EXCLUDED.full_name, user_tier = 'instructor';

  -- 4) Sample Members (Anna, Péter, Kata, Dávid)
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'anna.varga@workoutbooking.demo') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_member_anna_id, 'authenticated', 'authenticated',
      'anna.varga@workoutbooking.demo', extensions.crypt('demo123456', extensions.gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      '{"username":"anna_varga","full_name":"Varga Anna"}'::jsonb,
      now(), now(), '', '', '', ''
    );
  ELSE
    SELECT id INTO v_member_anna_id FROM auth.users WHERE email = 'anna.varga@workoutbooking.demo' LIMIT 1;
  END IF;
  INSERT INTO public.user_profiles (id, email, username, full_name, user_tier)
  VALUES (v_member_anna_id, 'anna.varga@workoutbooking.demo', 'anna_varga', 'Varga Anna', 'regular')
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'peter.nagy@workoutbooking.demo') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_member_peter_id, 'authenticated', 'authenticated',
      'peter.nagy@workoutbooking.demo', extensions.crypt('demo123456', extensions.gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      '{"username":"peter_nagy","full_name":"Nagy Péter"}'::jsonb,
      now(), now(), '', '', '', ''
    );
  ELSE
    SELECT id INTO v_member_peter_id FROM auth.users WHERE email = 'peter.nagy@workoutbooking.demo' LIMIT 1;
  END IF;
  INSERT INTO public.user_profiles (id, email, username, full_name, user_tier)
  VALUES (v_member_peter_id, 'peter.nagy@workoutbooking.demo', 'peter_nagy', 'Nagy Péter', 'regular')
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'kata.szabo@workoutbooking.demo') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_member_kata_id, 'authenticated', 'authenticated',
      'kata.szabo@workoutbooking.demo', extensions.crypt('demo123456', extensions.gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      '{"username":"kata_szabo","full_name":"Szabó Kata"}'::jsonb,
      now(), now(), '', '', '', ''
    );
  ELSE
    SELECT id INTO v_member_kata_id FROM auth.users WHERE email = 'kata.szabo@workoutbooking.demo' LIMIT 1;
  END IF;
  INSERT INTO public.user_profiles (id, email, username, full_name, user_tier)
  VALUES (v_member_kata_id, 'kata.szabo@workoutbooking.demo', 'kata_szabo', 'Szabó Kata', 'regular')
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'david.kiss@workoutbooking.demo') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_member_david_id, 'authenticated', 'authenticated',
      'david.kiss@workoutbooking.demo', extensions.crypt('demo123456', extensions.gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      '{"username":"david_kiss","full_name":"Kiss Dávid"}'::jsonb,
      now(), now(), '', '', '', ''
    );
  ELSE
    SELECT id INTO v_member_david_id FROM auth.users WHERE email = 'david.kiss@workoutbooking.demo' LIMIT 1;
  END IF;
  INSERT INTO public.user_profiles (id, email, username, full_name, user_tier)
  VALUES (v_member_david_id, 'david.kiss@workoutbooking.demo', 'david_kiss', 'Kiss Dávid', 'regular')
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

  SELECT id INTO v_demo_member_id FROM auth.users WHERE email = 'demo.member@workoutbooking.demo' LIMIT 1;
  SELECT id INTO v_demo_admin_id  FROM auth.users WHERE email = 'demo.admin@workoutbooking.demo' LIMIT 1;

  -- 5) Seed 6 Workout Class Templates
  SELECT id INTO v_class_yoga FROM public.workout_classes WHERE title = 'Morning Flow Yoga' LIMIT 1;
  IF v_class_yoga IS NULL THEN
    INSERT INTO public.workout_classes (title, description, duration, max_capacity, created_by)
    VALUES ('Morning Flow Yoga', 'Energizing vinyasa yoga sequence focusing on breath control, mobility, and core stability.', 60, 12, v_demo_admin_id)
    RETURNING id INTO v_class_yoga;
  END IF;

  SELECT id INTO v_class_hiit FROM public.workout_classes WHERE title = 'HIIT & Core Blast' LIMIT 1;
  IF v_class_hiit IS NULL THEN
    INSERT INTO public.workout_classes (title, description, duration, max_capacity, created_by)
    VALUES ('HIIT & Core Blast', 'High-intensity interval training alternating explosive cardio intervals with targeted abdominal work.', 45, 15, v_demo_admin_id)
    RETURNING id INTO v_class_hiit;
  END IF;

  SELECT id INTO v_class_crossfit FROM public.workout_classes WHERE title = 'CrossFit WOD' LIMIT 1;
  IF v_class_crossfit IS NULL THEN
    INSERT INTO public.workout_classes (title, description, duration, max_capacity, created_by)
    VALUES ('CrossFit WOD', 'Functional strength and conditioning workout of the day featuring barbell movements and gymnastics.', 60, 10, v_demo_admin_id)
    RETURNING id INTO v_class_crossfit;
  END IF;

  SELECT id INTO v_class_spin FROM public.workout_classes WHERE title = 'Spin & Burn Cycling' LIMIT 1;
  IF v_class_spin IS NULL THEN
    INSERT INTO public.workout_classes (title, description, duration, max_capacity, created_by)
    VALUES ('Spin & Burn Cycling', 'Rhythm-based indoor cycling session with hill climbs, sprints, and endurance intervals.', 45, 8, v_demo_admin_id)
    RETURNING id INTO v_class_spin;
  END IF;

  SELECT id INTO v_class_kettlebell FROM public.workout_classes WHERE title = 'Kettlebell Strength' LIMIT 1;
  IF v_class_kettlebell IS NULL THEN
    INSERT INTO public.workout_classes (title, description, duration, max_capacity, created_by)
    VALUES ('Kettlebell Strength', 'Full-body ballistic and grind kettlebell training: swings, Turkish get-ups, cleans, and presses.', 60, 12, v_demo_admin_id)
    RETURNING id INTO v_class_kettlebell;
  END IF;

  SELECT id INTO v_class_mobility FROM public.workout_classes WHERE title = 'Evening Mobility & Stretch' LIMIT 1;
  IF v_class_mobility IS NULL THEN
    INSERT INTO public.workout_classes (title, description, duration, max_capacity, created_by)
    VALUES ('Evening Mobility & Stretch', 'Guided joint mobility, myofascial release, and deep stretching for recovery and posture.', 50, 16, v_demo_admin_id)
    RETURNING id INTO v_class_mobility;
  END IF;

  -- 6) Seed Multiple Daily Sessions Across the Week (automatically replicates across 4 weeks via trigger!)
  v_week_monday := date_trunc('week', now());

  FOR v_day_offset IN 0..6 LOOP
    v_day_base := v_week_monday + (v_day_offset * interval '1 day');

    IF v_day_offset IN (0, 2, 4) THEN
      -- Monday, Wednesday, Friday: 08:00 Yoga, 12:30 HIIT, 17:30 CrossFit, 19:00 Spin
      IF NOT EXISTS (SELECT 1 FROM public.class_sessions WHERE class_id = v_class_yoga AND start_time = v_day_base + interval '8 hours') THEN
        INSERT INTO public.class_sessions (class_id, instructor_id, start_time, end_time, is_active, is_recurring)
        VALUES (v_class_yoga, v_coach_eszter_id, v_day_base + interval '8 hours', v_day_base + interval '9 hours', true, true);
      END IF;

      IF NOT EXISTS (SELECT 1 FROM public.class_sessions WHERE class_id = v_class_hiit AND start_time = v_day_base + interval '12 hours 30 minutes') THEN
        INSERT INTO public.class_sessions (class_id, instructor_id, start_time, end_time, is_active, is_recurring)
        VALUES (v_class_hiit, v_demo_instructor_id, v_day_base + interval '12 hours 30 minutes', v_day_base + interval '13 hours 15 minutes', true, true);
      END IF;

      IF NOT EXISTS (SELECT 1 FROM public.class_sessions WHERE class_id = v_class_crossfit AND start_time = v_day_base + interval '17 hours 30 minutes') THEN
        INSERT INTO public.class_sessions (class_id, instructor_id, start_time, end_time, is_active, is_recurring)
        VALUES (v_class_crossfit, v_demo_instructor_id, v_day_base + interval '17 hours 30 minutes', v_day_base + interval '18 hours 30 minutes', true, true);
      END IF;

      IF NOT EXISTS (SELECT 1 FROM public.class_sessions WHERE class_id = v_class_spin AND start_time = v_day_base + interval '19 hours') THEN
        INSERT INTO public.class_sessions (class_id, instructor_id, start_time, end_time, is_active, is_recurring)
        VALUES (v_class_spin, v_coach_bence_id, v_day_base + interval '19 hours', v_day_base + interval '19 hours 45 minutes', true, true);
      END IF;

    ELSIF v_day_offset IN (1, 3) THEN
      -- Tuesday, Thursday: 08:30 Kettlebell, 12:00 Spin, 17:30 HIIT, 19:00 Mobility
      IF NOT EXISTS (SELECT 1 FROM public.class_sessions WHERE class_id = v_class_kettlebell AND start_time = v_day_base + interval '8 hours 30 minutes') THEN
        INSERT INTO public.class_sessions (class_id, instructor_id, start_time, end_time, is_active, is_recurring)
        VALUES (v_class_kettlebell, v_coach_bence_id, v_day_base + interval '8 hours 30 minutes', v_day_base + interval '9 hours 30 minutes', true, true);
      END IF;

      IF NOT EXISTS (SELECT 1 FROM public.class_sessions WHERE class_id = v_class_spin AND start_time = v_day_base + interval '12 hours') THEN
        INSERT INTO public.class_sessions (class_id, instructor_id, start_time, end_time, is_active, is_recurring)
        VALUES (v_class_spin, v_demo_instructor_id, v_day_base + interval '12 hours', v_day_base + interval '12 hours 45 minutes', true, true);
      END IF;

      IF NOT EXISTS (SELECT 1 FROM public.class_sessions WHERE class_id = v_class_hiit AND start_time = v_day_base + interval '17 hours 30 minutes') THEN
        INSERT INTO public.class_sessions (class_id, instructor_id, start_time, end_time, is_active, is_recurring)
        VALUES (v_class_hiit, v_demo_instructor_id, v_day_base + interval '17 hours 30 minutes', v_day_base + interval '18 hours 15 minutes', true, true);
      END IF;

      IF NOT EXISTS (SELECT 1 FROM public.class_sessions WHERE class_id = v_class_mobility AND start_time = v_day_base + interval '19 hours') THEN
        INSERT INTO public.class_sessions (class_id, instructor_id, start_time, end_time, is_active, is_recurring)
        VALUES (v_class_mobility, v_coach_eszter_id, v_day_base + interval '19 hours', v_day_base + interval '19 hours 50 minutes', true, true);
      END IF;

    ELSE
      -- Saturday & Sunday: 09:30 Yoga / CrossFit, 16:00 Kettlebell / Mobility
      IF NOT EXISTS (SELECT 1 FROM public.class_sessions WHERE class_id = v_class_crossfit AND start_time = v_day_base + interval '9 hours 30 minutes') THEN
        INSERT INTO public.class_sessions (class_id, instructor_id, start_time, end_time, is_active, is_recurring)
        VALUES (v_class_crossfit, v_demo_instructor_id, v_day_base + interval '9 hours 30 minutes', v_day_base + interval '10 hours 30 minutes', true, true);
      END IF;

      IF NOT EXISTS (SELECT 1 FROM public.class_sessions WHERE class_id = v_class_mobility AND start_time = v_day_base + interval '16 hours') THEN
        INSERT INTO public.class_sessions (class_id, instructor_id, start_time, end_time, is_active, is_recurring)
        VALUES (v_class_mobility, v_coach_eszter_id, v_day_base + interval '16 hours', v_day_base + interval '16 hours 50 minutes', true, true);
      END IF;
    END IF;
  END LOOP;

  -- 7) Seed Sample Bookings into Upcoming Sessions so the Calendar & Dashboards Look Alive
  FOR v_session_rec IN
    SELECT id, instructor_id
    FROM public.class_sessions
    WHERE start_time > (now() + interval '3 hours')
      AND start_time < (now() + interval '6 days')
    ORDER BY start_time ASC
    LIMIT 10
  LOOP
    INSERT INTO public.bookings (user_id, session_id, booking_status)
    VALUES
      (v_member_anna_id,  v_session_rec.id, 'confirmed'),
      (v_member_peter_id, v_session_rec.id, 'confirmed'),
      (v_member_kata_id,  v_session_rec.id, 'confirmed')
    ON CONFLICT (user_id, session_id) DO NOTHING;

    IF v_demo_member_id IS NOT NULL AND v_session_rec.instructor_id = v_demo_instructor_id THEN
      INSERT INTO public.bookings (user_id, session_id, booking_status)
      VALUES (v_demo_member_id, v_session_rec.id, 'confirmed')
      ON CONFLICT (user_id, session_id) DO NOTHING;
    END IF;
  END LOOP;
END $$;
