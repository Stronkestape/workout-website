-- ============================================================================
-- Migration: Security, RLS, Waitlist Auto-Promotion, and Timezone Fixes
-- ============================================================================

-- 1. Harden `public.get_user_by_username_or_email(identifier text)`
--    - Drops `id` and `username` from output (returns only `email`)
--    - Removes fuzzy `full_name` matching (exact username or email match only)
DROP FUNCTION IF EXISTS public.get_user_by_username_or_email(text);

CREATE OR REPLACE FUNCTION public.get_user_by_username_or_email(identifier text)
RETURNS TABLE(email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_clean text := lower(btrim(coalesce(identifier, '')));
BEGIN
  IF v_clean = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT up.email::text
  FROM public.user_profiles up
  WHERE up.username = v_clean
     OR lower(up.email) = v_clean
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.get_user_by_username_or_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_by_username_or_email(text) TO anon, authenticated, service_role;

-- 2. Boolean-only username availability check for registration
--    Avoids returning user rows or email addresses during sign-up validation.
CREATE OR REPLACE FUNCTION public.username_available(candidate text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_clean text := lower(btrim(coalesce(candidate, '')));
BEGIN
  IF v_clean = '' OR v_clean !~ '^[a-z0-9_. ]{3,100}$' THEN
    RETURN false;
  END IF;

  RETURN NOT EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.username = v_clean
  );
END;
$$;

REVOKE ALL ON FUNCTION public.username_available(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.username_available(text) TO anon, authenticated, service_role;

-- 3. Helper: Check if a target user is booked or waitlisted in one of the
--    current instructor's own sessions (scopes instructor profile visibility).
CREATE OR REPLACE FUNCTION private.is_participant_of_my_session(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.class_sessions cs
    WHERE cs.instructor_id = (SELECT auth.uid())
      AND (
        EXISTS (
          SELECT 1
          FROM public.bookings b
          WHERE b.session_id = cs.id
            AND b.user_id = target_user_id
        )
        OR EXISTS (
          SELECT 1
          FROM public.waitlist w
          WHERE w.session_id = cs.id
            AND w.user_id = target_user_id
        )
      )
  );
END;
$$;

REVOKE ALL ON FUNCTION private.is_participant_of_my_session(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_participant_of_my_session(uuid) TO authenticated, service_role;

-- 4. Scoped User Search RPC for Manual Booking (Admin & Instructor)
--    Allows instructors and admins to search members by username/email/name for
--    manual booking (max 10 rows) without granting instructors blanket SELECT on all profiles.
CREATE OR REPLACE FUNCTION public.search_users_for_booking(search_term text)
RETURNS TABLE(id uuid, username text, email text, full_name text)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_pattern text;
BEGIN
  IF NOT (private.is_admin() OR private.is_instructor()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  v_pattern := '%' || regexp_replace(btrim(coalesce(search_term, '')), '([%_\\])', '\\\1', 'g') || '%';
  IF length(btrim(coalesce(search_term, ''))) < 2 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    up.id,
    up.username::text,
    up.email::text,
    up.full_name::text
  FROM public.user_profiles up
  WHERE up.username ILIKE v_pattern
     OR up.email ILIKE v_pattern
     OR COALESCE(up.full_name, '') ILIKE v_pattern
  ORDER BY up.username ASC
  LIMIT 10;
END;
$$;

REVOKE ALL ON FUNCTION public.search_users_for_booking(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_users_for_booking(text) TO authenticated, service_role;

-- 5. Tighten `public.user_profiles` RLS & Column-Level Grants
--    - `anon` can only read non-sensitive columns (`id, username, full_name, user_tier, created_at, updated_at`)
--      of instructors/admins for the public calendar; `anon` CANNOT read `email`.
--    - Instructors can only read their own profile, coach profiles, and participants of their own sessions.
REVOKE SELECT ON TABLE public.user_profiles FROM anon;
GRANT SELECT (id, username, full_name, user_tier, created_at, updated_at) ON TABLE public.user_profiles TO anon;
GRANT SELECT ON TABLE public.user_profiles TO authenticated;

DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Everyone can read instructor profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Anon can read instructor profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Authenticated can read profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Public can read coach profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "View user profiles" ON public.user_profiles;

CREATE POLICY "Public can read coach profiles"
  ON public.user_profiles
  FOR SELECT
  TO anon, authenticated
  USING (user_tier IN ('instructor', 'admin'));

CREATE POLICY "View user profiles"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR private.is_admin()
    OR private.is_participant_of_my_session(id)
  );

-- 6. Clean up duplicate RLS policies on `public.bookings` and `public.waitlist`
DROP POLICY IF EXISTS "Users and admins can view bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users and admins can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users and admins can update bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users and admins can delete bookings" ON public.bookings;

DROP POLICY IF EXISTS "Users and admins can view waitlist" ON public.waitlist;
DROP POLICY IF EXISTS "Users and admins can delete waitlist entries" ON public.waitlist;
DROP POLICY IF EXISTS "Users can delete own waitlist entries" ON public.waitlist;
DROP POLICY IF EXISTS "Delete waitlist entries" ON public.waitlist;

CREATE POLICY "Delete waitlist entries"
  ON public.waitlist
  FOR DELETE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR private.is_admin()
    OR private.is_session_instructor(session_id)
  );

-- 7. Fix `private.validate_booking_insert()` to count live confirmed bookings
--    under the `FOR UPDATE OF cs` lock instead of reading `cs.current_bookings`.
--    This guarantees accurate capacity checks both during concurrent inserts AND
--    when `promote_from_waitlist()` inserts a promoted user during an `AFTER DELETE` trigger.
CREATE OR REPLACE FUNCTION private.validate_booking_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_max_capacity integer;
  v_live_bookings integer;
  v_is_active boolean;
  v_start_time timestamptz;
  v_is_privileged boolean;
BEGIN
  SELECT
    wc.max_capacity,
    cs.is_active,
    cs.start_time
  INTO
    v_max_capacity,
    v_is_active,
    v_start_time
  FROM public.class_sessions cs
  JOIN public.workout_classes wc ON wc.id = cs.class_id
  WHERE cs.id = NEW.session_id
  FOR UPDATE OF cs;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Workout session not found';
  END IF;

  v_is_privileged := (SELECT auth.uid()) IS NULL
    OR COALESCE((SELECT private.is_admin()), false)
    OR COALESCE((SELECT private.is_session_instructor(NEW.session_id)), false)
    OR pg_trigger_depth() > 1;

  IF v_is_active IS DISTINCT FROM true AND NOT v_is_privileged THEN
    RAISE EXCEPTION 'This workout session is not active';
  END IF;

  IF v_start_time <= now() AND NOT v_is_privileged THEN
    RAISE EXCEPTION 'Cannot book a workout session that has already started';
  END IF;

  IF NEW.booking_status = 'confirmed' THEN
    SELECT COUNT(*)::integer
    INTO v_live_bookings
    FROM public.bookings b
    WHERE b.session_id = NEW.session_id
      AND b.booking_status = 'confirmed';

    IF v_live_bookings >= v_max_capacity THEN
      RAISE EXCEPTION 'This session is already full';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.validate_booking_insert() FROM PUBLIC, anon, authenticated;

-- 8. Update `private.validate_booking_delete()` so the session's assigned instructor
--    can also remove participants within the 2-hour cutoff window.
CREATE OR REPLACE FUNCTION private.validate_booking_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

REVOKE ALL ON FUNCTION private.validate_booking_delete() FROM PUBLIC, anon, authenticated;

-- 9. Add `private.validate_booking_update()` + BEFORE UPDATE trigger on `public.bookings`
--    Blocks regular users from moving `session_id` or bypassing the 2-hour cutoff / capacity via UPDATE.
CREATE OR REPLACE FUNCTION private.validate_booking_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_max_capacity integer;
  v_live_bookings integer;
  v_is_privileged boolean;
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Cannot reassign booking user_id';
  END IF;

  IF NEW.session_id IS DISTINCT FROM OLD.session_id THEN
    RAISE EXCEPTION 'Cannot move an existing booking to another session';
  END IF;

  v_is_privileged := (SELECT auth.uid()) IS NULL
    OR COALESCE((SELECT private.is_admin()), false)
    OR COALESCE((SELECT private.is_session_instructor(NEW.session_id)), false)
    OR pg_trigger_depth() > 1;

  IF NOT v_is_privileged AND NEW.booking_status IS DISTINCT FROM OLD.booking_status THEN
    RAISE EXCEPTION 'Direct booking status updates are not permitted; cancel the booking instead';
  END IF;

  IF NEW.booking_status = 'confirmed' AND OLD.booking_status IS DISTINCT FROM 'confirmed' THEN
    SELECT wc.max_capacity
    INTO v_max_capacity
    FROM public.class_sessions cs
    JOIN public.workout_classes wc ON wc.id = cs.class_id
    WHERE cs.id = NEW.session_id
    FOR UPDATE OF cs;

    SELECT COUNT(*)::integer
    INTO v_live_bookings
    FROM public.bookings b
    WHERE b.session_id = NEW.session_id
      AND b.booking_status = 'confirmed'
      AND b.id <> NEW.id;

    IF v_live_bookings >= v_max_capacity THEN
      RAISE EXCEPTION 'This session is already full';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.validate_booking_update() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trigger_validate_booking_update ON public.bookings;
CREATE TRIGGER trigger_validate_booking_update
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION private.validate_booking_update();

-- 10. Guard `class_sessions.current_bookings` against manual REST API tampering
--     Uses SECURITY INVOKER so `current_user` reflects the caller role (`authenticated`/`anon`),
--     while `SECURITY DEFINER` triggers (`update_current_bookings`) run at `pg_trigger_depth() > 1` as `postgres`.
CREATE OR REPLACE FUNCTION private.guard_session_counters()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.current_bookings IS DISTINCT FROM OLD.current_bookings THEN
    IF pg_trigger_depth() <= 1
       AND (
         current_user IN ('anon', 'authenticated')
         OR COALESCE(current_setting('request.jwt.claim.role', true), '') IN ('anon', 'authenticated')
       ) THEN
      NEW.current_bookings := OLD.current_bookings;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.guard_session_counters() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.guard_session_counters() TO authenticated, service_role;

DROP TRIGGER IF EXISTS trigger_guard_session_counters ON public.class_sessions;
CREATE TRIGGER trigger_guard_session_counters
  BEFORE UPDATE ON public.class_sessions
  FOR EACH ROW
  EXECUTE FUNCTION private.guard_session_counters();

-- 11. Fix `public.promote_from_waitlist()` and `public.manage_waitlist_positions()`
--     - Counts live confirmed bookings directly instead of reading stale `cs.current_bookings`
--     - Serializes waitlist position assignment per session with `pg_advisory_xact_lock`
CREATE OR REPLACE FUNCTION public.manage_waitlist_positions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(NEW.session_id::text, 0));

    NEW.position := COALESCE(
      (SELECT MAX(position) + 1
       FROM public.waitlist
       WHERE session_id = NEW.session_id),
      1
    );
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(OLD.session_id::text, 0));

    UPDATE public.waitlist
    SET position = position - 1
    WHERE session_id = OLD.session_id
      AND position > OLD.position;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.manage_waitlist_positions() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.promote_from_waitlist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_next_user_id uuid;
  v_waitlist_id integer;
  v_session_id integer;
  v_max_capacity integer;
  v_confirmed_count integer;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.booking_status IS DISTINCT FROM 'confirmed' THEN
      RETURN OLD;
    END IF;
    v_session_id := OLD.session_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.booking_status IS DISTINCT FROM 'confirmed' OR NEW.booking_status = 'confirmed' THEN
      RETURN NEW;
    END IF;
    v_session_id := OLD.session_id;
  ELSE
    RETURN NULL;
  END IF;

  SELECT wc.max_capacity
  INTO v_max_capacity
  FROM public.class_sessions cs
  JOIN public.workout_classes wc ON cs.class_id = wc.id
  WHERE cs.id = v_session_id
  FOR UPDATE OF cs;

  IF NOT FOUND THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  SELECT COUNT(*)::integer
  INTO v_confirmed_count
  FROM public.bookings b
  WHERE b.session_id = v_session_id
    AND b.booking_status = 'confirmed';

  IF v_confirmed_count < v_max_capacity THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(v_session_id::text, 0));

    SELECT w.id, w.user_id
    INTO v_waitlist_id, v_next_user_id
    FROM public.waitlist w
    WHERE w.session_id = v_session_id
    ORDER BY w.position ASC, w.joined_at ASC
    LIMIT 1
    FOR UPDATE;

    IF v_next_user_id IS NOT NULL THEN
      DELETE FROM public.waitlist
      WHERE id = v_waitlist_id;

      INSERT INTO public.bookings (user_id, session_id, booking_status, booked_at, cancelled_at)
      VALUES (v_next_user_id, v_session_id, 'confirmed', now(), null)
      ON CONFLICT (user_id, session_id) DO UPDATE
        SET booking_status = 'confirmed',
            booked_at = now(),
            cancelled_at = null;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.promote_from_waitlist() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trigger_promote_from_waitlist ON public.bookings;
CREATE TRIGGER trigger_promote_from_waitlist
  AFTER DELETE OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.promote_from_waitlist();

CREATE INDEX IF NOT EXISTS idx_waitlist_user_id ON public.waitlist USING btree (user_id);

-- 12. Timezone Alignment (`Europe/Budapest`) for Seeded Sessions & Recurring Triggers
--     - Shifts seeded sessions that were generated in UTC (`08:30`, `09:30`, `16:30`, `17:00`, `18:30` UTC)
--       so their local `Europe/Budapest` wall-clock start times are `08:30`, `09:30`, `16:30`, `17:00`, `18:30`.
--     - Preserves `Europe/Budapest` wall-clock time when rolling recurring sessions forward across weeks.
DO $$
BEGIN
  UPDATE public.class_sessions cs
  SET
    start_time = (
      (cs.start_time AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Budapest'
    ),
    end_time = (
      (cs.end_time AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Budapest'
    )
  WHERE to_char(cs.start_time AT TIME ZONE 'UTC', 'HH24:MI') IN ('08:30', '09:30', '16:30', '17:00', '18:30')
    AND to_char(cs.start_time AT TIME ZONE 'Europe/Budapest', 'HH24:MI') IN ('09:30', '10:30', '17:30', '18:00', '19:30');
END $$;

CREATE OR REPLACE FUNCTION private.handle_recurring_session_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_week integer;
  v_new_start timestamptz;
  v_new_end timestamptz;
BEGIN
  IF pg_trigger_depth() > 1
     OR COALESCE(current_setting('app.skip_recurring_trigger', true), '') = 'true' THEN
    RETURN NEW;
  END IF;

  IF NEW.is_recurring = true THEN
    FOR v_week IN 1..3 LOOP
      v_new_start := ((NEW.start_time AT TIME ZONE 'Europe/Budapest') + (v_week * interval '7 days')) AT TIME ZONE 'Europe/Budapest';
      v_new_end   := ((NEW.end_time   AT TIME ZONE 'Europe/Budapest') + (v_week * interval '7 days')) AT TIME ZONE 'Europe/Budapest';

      IF NOT EXISTS (
        SELECT 1
        FROM public.class_sessions cs
        WHERE cs.class_id = NEW.class_id
          AND cs.start_time = v_new_start
      ) THEN
        INSERT INTO public.class_sessions (
          class_id,
          instructor_id,
          start_time,
          end_time,
          current_bookings,
          is_active,
          is_recurring
        ) VALUES (
          NEW.class_id,
          NEW.instructor_id,
          v_new_start,
          v_new_end,
          0,
          NEW.is_active,
          true
        );
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.handle_recurring_session_insert() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.maintain_class_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM set_config('app.skip_recurring_trigger', 'true', true);

  DELETE FROM public.class_sessions
  WHERE end_time < (now() - interval '14 days');

  INSERT INTO public.class_sessions (
    class_id,
    instructor_id,
    start_time,
    end_time,
    current_bookings,
    is_active,
    is_recurring
  )
  SELECT
    cs.class_id,
    cs.instructor_id,
    ((cs.start_time AT TIME ZONE 'Europe/Budapest') + interval '7 days') AT TIME ZONE 'Europe/Budapest',
    ((cs.end_time   AT TIME ZONE 'Europe/Budapest') + interval '7 days') AT TIME ZONE 'Europe/Budapest',
    0,
    cs.is_active,
    true
  FROM public.class_sessions cs
  WHERE cs.is_recurring = true
    AND cs.is_active = true
    AND (((cs.start_time AT TIME ZONE 'Europe/Budapest') + interval '7 days') AT TIME ZONE 'Europe/Budapest') > (now() + interval '21 days')
    AND (((cs.start_time AT TIME ZONE 'Europe/Budapest') + interval '7 days') AT TIME ZONE 'Europe/Budapest') <= (now() + interval '28 days')
    AND NOT EXISTS (
      SELECT 1
      FROM public.class_sessions existing
      WHERE existing.class_id = cs.class_id
        AND existing.start_time = (((cs.start_time AT TIME ZONE 'Europe/Budapest') + interval '7 days') AT TIME ZONE 'Europe/Budapest')
    );
END;
$$;

REVOKE ALL ON FUNCTION private.maintain_class_sessions() FROM PUBLIC, anon, authenticated;

-- 13. Rotate `demo_admin` password away from public `'demo123456'` unless explicitly configured
--     (`demo_member` and `demo_instructor` remain active for portfolio 1-click demo access).
DO $$
DECLARE
  v_custom_admin_pw text := nullif(current_setting('app.demo_admin_password', true), '');
BEGIN
  UPDATE auth.users
  SET
    encrypted_password = extensions.crypt(
      COALESCE(v_custom_admin_pw, gen_random_uuid()::text || gen_random_uuid()::text),
      extensions.gen_salt('bf')
    ),
    updated_at = now()
  WHERE email = 'demo.admin@workoutbooking.demo';
END $$;
