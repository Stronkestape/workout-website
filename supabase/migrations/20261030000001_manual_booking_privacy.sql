-- Migration: 20261030000001_manual_booking_privacy.sql
-- Description: Strengthens user privacy for Manual Booking by removing email from search RPC return signature and search predicates.

DROP FUNCTION IF EXISTS public.search_users_for_booking(text);

CREATE OR REPLACE FUNCTION public.search_users_for_booking(search_term text)
RETURNS TABLE (
  id uuid,
  username text,
  full_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_pattern text;
BEGIN
  -- Strict tier guard: admin or instructor only
  IF NOT (private.is_admin() OR private.is_instructor()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  v_pattern := '%' || regexp_replace(btrim(coalesce(search_term, '')), '([%_\\])', '\\\1', 'g') || '%';
  IF length(btrim(coalesce(search_term, ''))) < 2 THEN
    RETURN;
  END IF;

  -- Only search and return username and full_name. NEVER expose email in manual booking search.
  RETURN QUERY
  SELECT
    up.id,
    up.username::text,
    up.full_name::text
  FROM public.user_profiles up
  WHERE up.username ILIKE v_pattern
     OR COALESCE(up.full_name, '') ILIKE v_pattern
  ORDER BY up.username ASC
  LIMIT 10;
END;
$$;

REVOKE ALL ON FUNCTION public.search_users_for_booking(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_users_for_booking(text) TO authenticated, service_role;
