-- Migration: Instructor Role Permissions, RLS Policy Restoration & Schedule Seed from Existing Templates

-- 1. Ensure `private` schema exists and `anon`/`authenticated` have USAGE privilege
--    (Required so RLS policies and SECURITY INVOKER functions can call `private.*` helpers;
--     PostgREST still never exposes `private` schema over HTTP RPC.)
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.is_admin()
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
      AND user_tier = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION private.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated, service_role;

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
GRANT EXECUTE ON FUNCTION private.is_instructor() TO authenticated, service_role;

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
GRANT EXECUTE ON FUNCTION private.is_session_instructor(integer) TO authenticated, service_role;

-- 2. Fix `get_available_instructors()` so Admins & Instructors can always load the Coach dropdown
CREATE OR REPLACE FUNCTION public.get_available_instructors()
RETURNS TABLE(id uuid, username text, full_name text, email text)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, private
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
GRANT EXECUTE ON FUNCTION public.get_available_instructors() TO authenticated, service_role;

-- 3. Ensure All Table Grants & RLS Policies Are Intact for Public, Members, Instructors, and Admins
GRANT SELECT ON TABLE public.workout_classes TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.workout_classes TO authenticated;

GRANT SELECT ON TABLE public.class_sessions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.class_sessions TO authenticated;

GRANT SELECT ON TABLE public.user_profiles TO anon, authenticated;
GRANT UPDATE ON TABLE public.user_profiles TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.bookings TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.waitlist TO authenticated;

-- workout_classes policies
DROP POLICY IF EXISTS "Everyone can read workout classes" ON public.workout_classes;
DROP POLICY IF EXISTS "Admins can create workout templates" ON public.workout_classes;
DROP POLICY IF EXISTS "Admins can update workout templates" ON public.workout_classes;
DROP POLICY IF EXISTS "Admins can delete workout templates" ON public.workout_classes;

CREATE POLICY "Everyone can read workout classes"
  ON public.workout_classes FOR SELECT USING (true);

CREATE POLICY "Admins can create workout templates"
  ON public.workout_classes FOR INSERT TO authenticated WITH CHECK (private.is_admin());

CREATE POLICY "Admins can update workout templates"
  ON public.workout_classes FOR UPDATE TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

CREATE POLICY "Admins can delete workout templates"
  ON public.workout_classes FOR DELETE TO authenticated USING (private.is_admin());

-- user_profiles policies
DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Everyone can read instructor profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "View user profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;

CREATE POLICY "View user profiles"
  ON public.user_profiles
  FOR SELECT
  USING (
    id = (SELECT auth.uid())
    OR user_tier IN ('instructor', 'admin')
    OR private.is_admin()
    OR private.is_instructor()
  );

CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- class_sessions policies
DROP POLICY IF EXISTS "Everyone can read class sessions" ON public.class_sessions;
DROP POLICY IF EXISTS "View class sessions" ON public.class_sessions;
DROP POLICY IF EXISTS "Admins can create sessions" ON public.class_sessions;
DROP POLICY IF EXISTS "Admins and instructors can create sessions" ON public.class_sessions;
DROP POLICY IF EXISTS "Admins can update sessions" ON public.class_sessions;
DROP POLICY IF EXISTS "Admins and instructors can update sessions" ON public.class_sessions;
DROP POLICY IF EXISTS "Admins can delete sessions" ON public.class_sessions;
DROP POLICY IF EXISTS "Admins and instructors can delete sessions" ON public.class_sessions;

CREATE POLICY "View class sessions"
  ON public.class_sessions
  FOR SELECT
  USING (
    is_active = true
    OR private.is_admin()
    OR instructor_id = (SELECT auth.uid())
  );

CREATE POLICY "Admins and instructors can create sessions"
  ON public.class_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    private.is_admin()
    OR (private.is_instructor() AND instructor_id = (SELECT auth.uid()))
  );

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

CREATE POLICY "Admins and instructors can delete sessions"
  ON public.class_sessions
  FOR DELETE
  TO authenticated
  USING (
    private.is_admin()
    OR (private.is_instructor() AND instructor_id = (SELECT auth.uid()))
  );

-- bookings policies
DROP POLICY IF EXISTS "Users can read own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can view all bookings" ON public.bookings;
DROP POLICY IF EXISTS "View bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can create own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can book users manually" ON public.bookings;
DROP POLICY IF EXISTS "Create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can update own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can delete own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can delete any booking" ON public.bookings;
DROP POLICY IF EXISTS "Delete bookings" ON public.bookings;

CREATE POLICY "View bookings"
  ON public.bookings
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR private.is_admin()
    OR private.is_session_instructor(session_id)
  );

CREATE POLICY "Create bookings"
  ON public.bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR private.is_admin()
    OR private.is_session_instructor(session_id)
  );

CREATE POLICY "Users can update own bookings"
  ON public.bookings
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Delete bookings"
  ON public.bookings
  FOR DELETE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR private.is_admin()
    OR private.is_session_instructor(session_id)
  );

-- waitlist policies
DROP POLICY IF EXISTS "Users can read own waitlist entries" ON public.waitlist;
DROP POLICY IF EXISTS "Admins can view all waitlist entries" ON public.waitlist;
DROP POLICY IF EXISTS "View waitlist entries" ON public.waitlist;
DROP POLICY IF EXISTS "Users can create own waitlist entries" ON public.waitlist;
DROP POLICY IF EXISTS "Users can delete own waitlist entries" ON public.waitlist;

CREATE POLICY "View waitlist entries"
  ON public.waitlist
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR private.is_admin()
    OR private.is_session_instructor(session_id)
  );

CREATE POLICY "Users can create own waitlist entries"
  ON public.waitlist
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own waitlist entries"
  ON public.waitlist
  FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- 4. Seed Demo Coach, Extra Coaches & Schedule Sessions ONLY from EXISTING Workout Templates
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
DECLARE
  v_demo_instructor_id uuid := '00000000-0000-0000-0000-000000000103';
  v_coach_eszter_id    uuid := '00000000-0000-0000-0000-000000000104';
  v_coach_bence_id     uuid := '00000000-0000-0000-0000-000000000105';

  v_template_ids       integer[];
  v_template_durations integer[];
  v_template_count     integer;
  v_instructor_ids     uuid[];
  v_instructor_count   integer;
  v_member_ids         uuid[];
  v_member_count       integer;

  v_week_monday        timestamptz;
  v_day_offset         integer;
  v_slot_idx           integer;
  v_slot_hours         interval[];
  v_start_ts           timestamptz;
  v_end_ts             timestamptz;
  v_chosen_class_id    integer;
  v_chosen_duration    integer;
  v_chosen_instructor  uuid;
  v_counter            integer := 0;
  v_session_rec        record;
  v_m_idx              integer;
BEGIN
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);

  -- 1) Demo Coach (for 1-Click Demo Coach button on /login)
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
  ON CONFLICT (id) DO UPDATE
    SET username = EXCLUDED.username,
        full_name = EXCLUDED.full_name,
        user_tier = 'instructor';

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
  ON CONFLICT (id) DO UPDATE
    SET username = EXCLUDED.username,
        full_name = EXCLUDED.full_name,
        user_tier = 'instructor';

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
  ON CONFLICT (id) DO UPDATE
    SET username = EXCLUDED.username,
        full_name = EXCLUDED.full_name,
        user_tier = 'instructor';

  -- 4) Load ONLY EXISTING workout templates from `public.workout_classes` (zero new templates created!)
  SELECT
    array_agg(id ORDER BY id),
    array_agg(COALESCE(duration, 60) ORDER BY id)
  INTO
    v_template_ids,
    v_template_durations
  FROM public.workout_classes;

  v_template_count := COALESCE(array_length(v_template_ids, 1), 0);

  IF v_template_count = 0 THEN
    RAISE NOTICE 'No existing workout templates found in public.workout_classes; skipping session generation.';
    RETURN;
  END IF;

  -- 5) Load all instructors from `public.user_profiles`
  SELECT array_agg(id ORDER BY created_at ASC)
  INTO v_instructor_ids
  FROM public.user_profiles
  WHERE user_tier = 'instructor';

  v_instructor_count := COALESCE(array_length(v_instructor_ids, 1), 0);

  -- Also assign instructors to any existing sessions that currently have `instructor_id IS NULL`
  UPDATE public.class_sessions cs
  SET instructor_id = v_instructor_ids[(cs.id % v_instructor_count) + 1]
  WHERE cs.instructor_id IS NULL
    AND v_instructor_count > 0;

  -- 6) Schedule multiple daily sessions across the current week using ONLY existing templates
  v_week_monday := date_trunc('week', now());

  FOR v_day_offset IN 0..6 LOOP
    IF v_day_offset < 5 THEN
      -- Weekdays (Mon-Fri): 3 sessions per day (08:30, 17:00, 18:30)
      v_slot_hours := ARRAY[interval '8 hours 30 minutes', interval '17 hours', interval '18 hours 30 minutes'];
    ELSE
      -- Weekends (Sat-Sun): 2 sessions per day (09:30, 16:30)
      v_slot_hours := ARRAY[interval '9 hours 30 minutes', interval '16 hours 30 minutes'];
    END IF;

    FOR v_slot_idx IN 1..array_length(v_slot_hours, 1) LOOP
      v_counter := v_counter + 1;

      v_chosen_class_id   := v_template_ids[((v_counter - 1) % v_template_count) + 1];
      v_chosen_duration   := v_template_durations[((v_counter - 1) % v_template_count) + 1];
      v_chosen_instructor := v_instructor_ids[((v_counter - 1) % v_instructor_count) + 1];

      v_start_ts := v_week_monday + (v_day_offset * interval '1 day') + v_slot_hours[v_slot_idx];
      v_end_ts   := v_start_ts + (v_chosen_duration * interval '1 minute');

      IF NOT EXISTS (
        SELECT 1
        FROM public.class_sessions cs
        WHERE cs.start_time = v_start_ts
      ) THEN
        INSERT INTO public.class_sessions (
          class_id,
          instructor_id,
          start_time,
          end_time,
          is_active,
          is_recurring
        ) VALUES (
          v_chosen_class_id,
          v_chosen_instructor,
          v_start_ts,
          v_end_ts,
          true,
          true
        );
      END IF;
    END LOOP;
  END LOOP;

  -- 7) Add sample bookings on upcoming sessions
  SELECT array_agg(id ORDER BY created_at ASC)
  INTO v_member_ids
  FROM public.user_profiles
  WHERE user_tier = 'regular';

  v_member_count := COALESCE(array_length(v_member_ids, 1), 0);

  IF v_member_count > 0 THEN
    FOR v_session_rec IN
      SELECT cs.id, wc.max_capacity, COALESCE(cs.current_bookings, 0) AS current_bookings
      FROM public.class_sessions cs
      JOIN public.workout_classes wc ON wc.id = cs.class_id
      WHERE cs.start_time > (now() + interval '3 hours')
        AND cs.start_time < (now() + interval '7 days')
      ORDER BY cs.start_time ASC
      LIMIT 12
    LOOP
      FOR v_m_idx IN 1..LEAST(v_member_count, 3) LOOP
        IF (v_session_rec.current_bookings + v_m_idx) <= v_session_rec.max_capacity THEN
          INSERT INTO public.bookings (user_id, session_id, booking_status)
          VALUES (v_member_ids[v_m_idx], v_session_rec.id, 'confirmed')
          ON CONFLICT (user_id, session_id) DO NOTHING;
        END IF;
      END LOOP;
    END LOOP;
  END IF;
END $$;
