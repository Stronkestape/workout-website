--
-- PostgreSQL database dump
--

\restrict 3MEkUWpiw1bHjeUYmjjY94YyZ4Az0XgAt8FBrZ9U0GbzvKoLcdD6pABlb5JRxAw

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: get_user_by_username_or_email(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_by_username_or_email(identifier text) RETURNS TABLE(id uuid, email text, username text)
    LANGUAGE plpgsql SECURITY DEFINER
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
     OR up.email = LOWER(identifier);
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
declare
  v_username text := lower(coalesce(new.raw_user_meta_data->>'username', ''));
  v_email text := new.email;
begin
  -- Validate username is present and matches the DB-side rules
  if v_username !~ '^[a-z0-9_.]{3,20}$' then
    raise exception 'Invalid or missing username. Must be 3–20 chars, lowercase letters, numbers, underscores, or dots.';
  end if;

  -- Insert the profile. Unique constraint on username will enforce uniqueness.
  insert into public.user_profiles (id, email, username)
  values (new.id, v_email, v_username);

  return new;
exception
  when unique_violation then
    -- Translate the unique violation into a clearer message
    raise exception 'Username is already taken';
end;
$_$;


--
-- Name: manage_waitlist_positions(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.manage_waitlist_positions() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  -- ... rest of your function
END;
$$;


--
-- Name: prevent_user_tier_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prevent_user_tier_change() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  -- If user_tier is being changed
  IF NEW.user_tier IS DISTINCT FROM OLD.user_tier THEN
    -- Only allow if request is from service role (bypasses RLS anyway)
    -- Otherwise block it
    IF current_setting('request.jwt.claim.role', true) <> 'service_role' THEN
      RAISE EXCEPTION 'You are not allowed to change user_tier';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: promote_from_waitlist(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.promote_from_waitlist() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_next_user_id UUID;
  v_session_id INT4;
BEGIN
  -- ... rest of your function
END;
$$;


--
-- Name: update_current_bookings(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_current_bookings() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  session_id_to_update INTEGER;
BEGIN
  -- ... rest of your function
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: bookings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bookings (
    id integer NOT NULL,
    user_id uuid,
    session_id integer,
    booking_status character varying(20) DEFAULT 'confirmed'::character varying,
    booked_at timestamp with time zone DEFAULT now(),
    cancelled_at timestamp with time zone,
    CONSTRAINT bookings_booking_status_check CHECK (((booking_status)::text = ANY ((ARRAY['confirmed'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: bookings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bookings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bookings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bookings_id_seq OWNED BY public.bookings.id;


--
-- Name: class_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.class_sessions (
    id integer NOT NULL,
    class_id integer,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    current_bookings integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: class_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.class_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: class_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.class_sessions_id_seq OWNED BY public.class_sessions.id;


--
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_profiles (
    id uuid NOT NULL,
    email character varying(255) NOT NULL,
    full_name character varying(255),
    user_tier character varying(20) DEFAULT 'regular'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    username character varying(50) NOT NULL,
    CONSTRAINT user_profiles_user_tier_check CHECK (((user_tier)::text = ANY ((ARRAY['regular'::character varying, 'premium'::character varying])::text[]))),
    CONSTRAINT user_profiles_username_check CHECK (((username)::text ~ '^[a-z0-9_.]{3,20}$'::text)),
    CONSTRAINT username_format CHECK (((username)::text ~ '^[a-z0-9_]+$'::text))
);


--
-- Name: waitlist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.waitlist (
    id integer NOT NULL,
    user_id uuid,
    session_id integer,
    joined_at timestamp with time zone DEFAULT now(),
    "position" integer
);


--
-- Name: waitlist_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.waitlist_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: waitlist_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.waitlist_id_seq OWNED BY public.waitlist.id;


--
-- Name: workout_classes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workout_classes (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    instructor character varying(255),
    duration integer NOT NULL,
    max_capacity integer DEFAULT 20 NOT NULL,
    created_by uuid,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    recurrence_rule jsonb
);


--
-- Name: workout_classes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.workout_classes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: workout_classes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.workout_classes_id_seq OWNED BY public.workout_classes.id;


--
-- Name: bookings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings ALTER COLUMN id SET DEFAULT nextval('public.bookings_id_seq'::regclass);


--
-- Name: class_sessions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_sessions ALTER COLUMN id SET DEFAULT nextval('public.class_sessions_id_seq'::regclass);


--
-- Name: waitlist id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.waitlist ALTER COLUMN id SET DEFAULT nextval('public.waitlist_id_seq'::regclass);


--
-- Name: workout_classes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workout_classes ALTER COLUMN id SET DEFAULT nextval('public.workout_classes_id_seq'::regclass);


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- Name: bookings bookings_user_id_session_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_user_id_session_id_key UNIQUE (user_id, session_id);


--
-- Name: class_sessions class_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_sessions
    ADD CONSTRAINT class_sessions_pkey PRIMARY KEY (id);


--
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (id);


--
-- Name: user_profiles user_profiles_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_username_key UNIQUE (username);


--
-- Name: waitlist waitlist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.waitlist
    ADD CONSTRAINT waitlist_pkey PRIMARY KEY (id);


--
-- Name: waitlist waitlist_user_id_session_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.waitlist
    ADD CONSTRAINT waitlist_user_id_session_id_key UNIQUE (user_id, session_id);


--
-- Name: workout_classes workout_classes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workout_classes
    ADD CONSTRAINT workout_classes_pkey PRIMARY KEY (id);


--
-- Name: idx_bookings_user_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_user_session ON public.bookings USING btree (user_id, session_id);


--
-- Name: idx_bookings_user_session_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_bookings_user_session_unique ON public.bookings USING btree (user_id, session_id) WHERE ((booking_status)::text = 'confirmed'::text);


--
-- Name: idx_class_sessions_start_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_class_sessions_start_time ON public.class_sessions USING btree (start_time);


--
-- Name: idx_user_profiles_username; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_profiles_username ON public.user_profiles USING btree (username);


--
-- Name: idx_waitlist_session_position; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_waitlist_session_position ON public.waitlist USING btree (session_id, "position");


--
-- Name: idx_workout_classes_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workout_classes_created_by ON public.workout_classes USING btree (created_by);


--
-- Name: user_profiles prevent_user_tier_change_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER prevent_user_tier_change_trigger BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.prevent_user_tier_change();


--
-- Name: waitlist trigger_manage_waitlist; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_manage_waitlist AFTER INSERT OR DELETE ON public.waitlist FOR EACH ROW EXECUTE FUNCTION public.manage_waitlist_positions();


--
-- Name: bookings trigger_promote_from_waitlist; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_promote_from_waitlist AFTER DELETE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.promote_from_waitlist();


--
-- Name: bookings trigger_update_bookings; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_bookings AFTER INSERT OR DELETE OR UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_current_bookings();


--
-- Name: bookings bookings_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.class_sessions(id) ON DELETE CASCADE;


--
-- Name: bookings bookings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;


--
-- Name: class_sessions class_sessions_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_sessions
    ADD CONSTRAINT class_sessions_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.workout_classes(id) ON DELETE CASCADE;


--
-- Name: user_profiles user_profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: waitlist waitlist_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.waitlist
    ADD CONSTRAINT waitlist_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.class_sessions(id) ON DELETE CASCADE;


--
-- Name: waitlist waitlist_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.waitlist
    ADD CONSTRAINT waitlist_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;


--
-- Name: workout_classes workout_classes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workout_classes
    ADD CONSTRAINT workout_classes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id) ON DELETE SET NULL;


--
-- Name: class_sessions Everyone can read class sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can read class sessions" ON public.class_sessions FOR SELECT USING ((is_active = true));


--
-- Name: workout_classes Everyone can read workout classes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can read workout classes" ON public.workout_classes FOR SELECT USING ((is_active = true));


--
-- Name: class_sessions Premium users can create own workout sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Premium users can create own workout sessions" ON public.class_sessions FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.workout_classes wc
     JOIN public.user_profiles up ON ((up.id = wc.created_by)))
  WHERE ((wc.id = class_sessions.class_id) AND (wc.created_by = ( SELECT auth.uid() AS uid)) AND ((up.user_tier)::text = 'premium'::text)))));


--
-- Name: workout_classes Premium users can create workouts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Premium users can create workouts" ON public.workout_classes FOR INSERT TO authenticated WITH CHECK (((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND ((user_profiles.user_tier)::text = 'premium'::text)))) AND (created_by = ( SELECT auth.uid() AS uid))));


--
-- Name: class_sessions Premium users can delete own workout sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Premium users can delete own workout sessions" ON public.class_sessions FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.workout_classes wc
  WHERE ((wc.id = class_sessions.class_id) AND (wc.created_by = ( SELECT auth.uid() AS uid))))));


--
-- Name: workout_classes Premium users can delete own workouts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Premium users can delete own workouts" ON public.workout_classes FOR DELETE TO authenticated USING ((created_by = ( SELECT auth.uid() AS uid)));


--
-- Name: class_sessions Premium users can update own workout sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Premium users can update own workout sessions" ON public.class_sessions FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.workout_classes wc
  WHERE ((wc.id = class_sessions.class_id) AND (wc.created_by = ( SELECT auth.uid() AS uid)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.workout_classes wc
  WHERE ((wc.id = class_sessions.class_id) AND (wc.created_by = ( SELECT auth.uid() AS uid))))));


--
-- Name: workout_classes Premium users can update own workouts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Premium users can update own workouts" ON public.workout_classes FOR UPDATE TO authenticated USING ((created_by = ( SELECT auth.uid() AS uid))) WITH CHECK ((created_by = ( SELECT auth.uid() AS uid)));


--
-- Name: bookings Users can create own bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own bookings" ON public.bookings FOR INSERT TO authenticated WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: waitlist Users can create own waitlist entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own waitlist entries" ON public.waitlist FOR INSERT TO authenticated WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: bookings Users can delete own bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own bookings" ON public.bookings FOR DELETE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: waitlist Users can delete own waitlist entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own waitlist entries" ON public.waitlist FOR DELETE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: bookings Users can read own bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own bookings" ON public.bookings FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: user_profiles Users can read own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own profile" ON public.user_profiles FOR SELECT TO authenticated USING ((id = ( SELECT auth.uid() AS uid)));


--
-- Name: waitlist Users can read own waitlist entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own waitlist entries" ON public.waitlist FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: bookings Users can update own bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own bookings" ON public.bookings FOR UPDATE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: user_profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.user_profiles FOR UPDATE TO authenticated USING ((id = ( SELECT auth.uid() AS uid))) WITH CHECK ((id = ( SELECT auth.uid() AS uid)));


--
-- Name: bookings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

--
-- Name: class_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.class_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: user_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: waitlist; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

--
-- Name: workout_classes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workout_classes ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict 3MEkUWpiw1bHjeUYmjjY94YyZ4Az0XgAt8FBrZ9U0GbzvKoLcdD6pABlb5JRxAw

