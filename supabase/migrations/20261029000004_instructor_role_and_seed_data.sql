-- Migration: Instructor Role Permissions & Schedule Generation from Existing Templates

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

-- 3. Seed Demo Coach Account & Schedule Sessions ONLY from EXISTING Workout Templates
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
DECLARE
  v_demo_instructor_id uuid := '00000000-0000-0000-0000-000000000103';
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

  -- Ensure `demo_instructor` exists for the 1-Click "Demo Coach" login button on /login
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'demo.instructor@workoutbooking.demo') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_demo_instructor_id, 'authenticated', 'authenticated',
      'demo.instructor@workoutbooking.demo', extensions.crypt('demo123456', extensions.gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      '{"username":"demo_instructor","full_name":"Demo Coach"}'::jsonb,
      now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_demo_instructor_id, jsonb_build_object('sub', v_demo_instructor_id::text, 'email', 'demo.instructor@workoutbooking.demo'), 'email', v_demo_instructor_id::text, now(), now(), now())
    ON CONFLICT DO NOTHING;
  ELSE
    SELECT id INTO v_demo_instructor_id FROM auth.users WHERE email = 'demo.instructor@workoutbooking.demo' LIMIT 1;
  END IF;

  INSERT INTO public.user_profiles (id, email, username, full_name, user_tier)
  VALUES (v_demo_instructor_id, 'demo.instructor@workoutbooking.demo', 'demo_instructor', 'Demo Coach', 'instructor')
  ON CONFLICT (id) DO UPDATE
    SET username = EXCLUDED.username,
        full_name = COALESCE(public.user_profiles.full_name, EXCLUDED.full_name),
        user_tier = 'instructor';

  -- Load ONLY EXISTING workout templates from `public.workout_classes` (no new templates created!)
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

  -- Load all existing instructors from `public.user_profiles`
  SELECT array_agg(id ORDER BY created_at ASC)
  INTO v_instructor_ids
  FROM public.user_profiles
  WHERE user_tier = 'instructor';

  v_instructor_count := COALESCE(array_length(v_instructor_ids, 1), 0);

  -- Schedule multiple daily sessions across the current week using ONLY existing templates & instructors
  -- (The recurring session trigger automatically replicates these for the next 3 weeks = 4 weeks total)
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

      -- Only insert if no session starts at this exact time yet
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

  -- Add sample bookings using existing regular users on upcoming sessions
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
