-- Initial Database Schema for Workout Booking Platform

-- 1. Core Functions & Trigger Handlers

CREATE OR REPLACE FUNCTION public.get_available_instructors()
RETURNS TABLE(id uuid, username text, full_name text, email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_tier = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can fetch instructors list';
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

CREATE OR REPLACE FUNCTION public.get_user_by_username_or_email(identifier text)
RETURNS TABLE(id uuid, email text, username text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    up.id,
    up.email::TEXT,
    up.username::TEXT
  FROM public.user_profiles up
  WHERE up.username = LOWER(identifier)
     OR LOWER(up.email) = LOWER(identifier)
     OR (up.full_name IS NOT NULL AND LOWER(up.full_name) = LOWER(identifier));
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $_$
DECLARE
  v_username text := lower(coalesce(new.raw_user_meta_data->>'username', ''));
  v_email text := new.email;
BEGIN
  IF v_username !~ '^[a-z0-9_. ]{3,100}$' THEN
    RAISE EXCEPTION 'Invalid or missing username. Must be 3–100 chars, lowercase letters, numbers, underscores, dots, or spaces.';
  END IF;

  INSERT INTO public.user_profiles (id, email, username)
  VALUES (new.id, v_email, v_username);

  RETURN new;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Username is already taken';
END;
$_$;

CREATE OR REPLACE FUNCTION public.manage_waitlist_positions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.position := COALESCE(
      (SELECT MAX(position) + 1
       FROM public.waitlist
       WHERE session_id = NEW.session_id),
      1
    );
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.waitlist
    SET position = position - 1
    WHERE session_id = OLD.session_id
      AND position > OLD.position;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_user_tier_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF NEW.user_tier IS DISTINCT FROM OLD.user_tier THEN
    IF current_setting('request.jwt.claim.role', true) <> 'service_role' THEN
      RAISE EXCEPTION 'You are not allowed to change user_tier';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.promote_from_waitlist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_next_user_id uuid;
  v_session_id integer;
  v_max_capacity integer;
  v_current_bookings integer;
BEGIN
  IF OLD.booking_status IS NULL OR OLD.booking_status != 'confirmed' THEN
    RETURN OLD;
  END IF;

  v_session_id := OLD.session_id;

  SELECT wc.max_capacity, cs.current_bookings
  INTO v_max_capacity, v_current_bookings
  FROM public.class_sessions cs
  JOIN public.workout_classes wc ON cs.class_id = wc.id
  WHERE cs.id = v_session_id;

  IF v_current_bookings < v_max_capacity THEN
    SELECT user_id INTO v_next_user_id
    FROM public.waitlist
    WHERE session_id = v_session_id
      AND position = 1
    LIMIT 1;

    IF v_next_user_id IS NOT NULL THEN
      INSERT INTO public.bookings (user_id, session_id, booking_status)
      VALUES (v_next_user_id, v_session_id, 'confirmed');

      DELETE FROM public.waitlist
      WHERE user_id = v_next_user_id
        AND session_id = v_session_id;
    END IF;
  END IF;

  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_current_bookings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_session_id integer;
  v_new_count integer;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_session_id := OLD.session_id;
  ELSE
    v_session_id := NEW.session_id;
  END IF;

  SELECT COUNT(*)::integer INTO v_new_count
  FROM public.bookings
  WHERE session_id = v_session_id
    AND booking_status = 'confirmed';

  UPDATE public.class_sessions
  SET current_bookings = v_new_count
  WHERE id = v_session_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- 2. Tables & Sequences

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email character varying(255) NOT NULL,
  full_name character varying(255),
  user_tier character varying(20) DEFAULT 'regular'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  username character varying(100) NOT NULL UNIQUE,
  CONSTRAINT user_profiles_user_tier_check CHECK (user_tier::text = ANY (ARRAY['regular', 'instructor', 'admin'])),
  CONSTRAINT user_profiles_username_check CHECK (username::text ~ '^[a-z0-9_. ]{3,100}$')
);

CREATE TABLE IF NOT EXISTS public.workout_classes (
  id serial PRIMARY KEY,
  title character varying(255) NOT NULL,
  description text,
  duration integer NOT NULL,
  max_capacity integer DEFAULT 20 NOT NULL,
  created_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  recurrence_rule jsonb
);

CREATE TABLE IF NOT EXISTS public.class_sessions (
  id serial PRIMARY KEY,
  class_id integer REFERENCES public.workout_classes(id) ON DELETE CASCADE,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  current_bookings integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  instructor_id uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.bookings (
  id serial PRIMARY KEY,
  user_id uuid REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  session_id integer REFERENCES public.class_sessions(id) ON DELETE CASCADE,
  booking_status character varying(20) DEFAULT 'confirmed'::character varying,
  booked_at timestamp with time zone DEFAULT now(),
  cancelled_at timestamp with time zone,
  CONSTRAINT bookings_booking_status_check CHECK (booking_status::text = ANY (ARRAY['confirmed', 'cancelled'])),
  CONSTRAINT bookings_user_id_session_id_key UNIQUE (user_id, session_id)
);

CREATE TABLE IF NOT EXISTS public.waitlist (
  id serial PRIMARY KEY,
  user_id uuid REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  session_id integer REFERENCES public.class_sessions(id) ON DELETE CASCADE,
  joined_at timestamp with time zone DEFAULT now(),
  "position" integer,
  CONSTRAINT waitlist_user_id_session_id_key UNIQUE (user_id, session_id)
);

-- 3. Indexes

CREATE INDEX IF NOT EXISTS idx_bookings_user_session ON public.bookings USING btree (user_id, session_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_user_session_unique ON public.bookings USING btree (user_id, session_id) WHERE (booking_status::text = 'confirmed');
CREATE INDEX IF NOT EXISTS idx_class_sessions_instructor_id ON public.class_sessions USING btree (instructor_id);
CREATE INDEX IF NOT EXISTS idx_class_sessions_start_time ON public.class_sessions USING btree (start_time);
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON public.user_profiles USING btree (username);
CREATE INDEX IF NOT EXISTS idx_waitlist_session_position ON public.waitlist USING btree (session_id, "position");
CREATE INDEX IF NOT EXISTS idx_workout_classes_created_by ON public.workout_classes USING btree (created_by);

-- 4. Triggers

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS prevent_user_tier_change_trigger ON public.user_profiles;
CREATE TRIGGER prevent_user_tier_change_trigger
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_user_tier_change();

DROP TRIGGER IF EXISTS trigger_manage_waitlist ON public.waitlist;
CREATE TRIGGER trigger_manage_waitlist
  BEFORE INSERT OR DELETE ON public.waitlist
  FOR EACH ROW
  EXECUTE FUNCTION public.manage_waitlist_positions();

DROP TRIGGER IF EXISTS trigger_promote_from_waitlist ON public.bookings;
CREATE TRIGGER trigger_promote_from_waitlist
  AFTER DELETE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.promote_from_waitlist();

DROP TRIGGER IF EXISTS trigger_update_bookings ON public.bookings;
CREATE TRIGGER trigger_update_bookings
  AFTER INSERT OR DELETE OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_current_bookings();

-- 5. Row Level Security (Base Policies)

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_classes ENABLE ROW LEVEL SECURITY;
