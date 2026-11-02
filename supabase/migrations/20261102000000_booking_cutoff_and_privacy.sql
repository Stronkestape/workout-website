-- 20261102000000_booking_cutoff_and_privacy.sql
-- Enforce 30-minute booking and waitlist cutoff, and remove email from manual booking search

-- 1. Update private.validate_booking_insert()
CREATE OR REPLACE FUNCTION private.validate_booking_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
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

  -- Disallow bookings if class starts in less than 30 minutes, or is ongoing / past
  IF v_start_time <= (now() + interval '30 minutes') AND NOT v_is_privileged THEN
    RAISE EXCEPTION 'Cannot book a workout session less than 30 minutes before it starts, or that has already started';
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
$function$;

-- 2. Create private.validate_waitlist_insert() and attach trigger to public.waitlist
CREATE OR REPLACE FUNCTION private.validate_waitlist_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_is_active boolean;
  v_start_time timestamptz;
  v_is_privileged boolean;
BEGIN
  SELECT
    cs.is_active,
    cs.start_time
  INTO
    v_is_active,
    v_start_time
  FROM public.class_sessions cs
  WHERE cs.id = NEW.session_id;

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

  -- Disallow waitlist if class starts in less than 30 minutes, or is ongoing / past
  IF v_start_time <= (now() + interval '30 minutes') AND NOT v_is_privileged THEN
    RAISE EXCEPTION 'Cannot join waitlist less than 30 minutes before workout starts, or after it has started';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_validate_waitlist_insert
  BEFORE INSERT ON public.waitlist
  FOR EACH ROW
  EXECUTE FUNCTION private.validate_waitlist_insert();

-- 3. Redefine public.search_users_for_booking to completely exclude email
CREATE OR REPLACE FUNCTION public.search_users_for_booking(search_term text)
RETURNS TABLE(id uuid, username text, email text, full_name text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_clean text;
  v_pattern text;
BEGIN
  IF NOT (private.is_admin() OR private.is_instructor()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  v_clean := btrim(coalesce(search_term, ''));

  -- Reject email searches or terms containing '@'
  IF v_clean LIKE '%@%' OR length(v_clean) < 2 THEN
    RETURN;
  END IF;

  v_pattern := '%' || regexp_replace(v_clean, '([%_\\])', '\\\1', 'g') || '%';

  RETURN QUERY
  SELECT
    up.id,
    up.username::text,
    NULL::text AS email,
    up.full_name::text
  FROM public.user_profiles up
  WHERE up.username ILIKE v_pattern
     OR COALESCE(up.full_name, '') ILIKE v_pattern
  ORDER BY up.username ASC
  LIMIT 10;
END;
$function$;
