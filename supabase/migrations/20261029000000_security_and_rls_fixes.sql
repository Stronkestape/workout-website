-- ============================================================================
-- Migration: Fix Supabase Security Advisor Warnings & Missing RLS Policies
-- ============================================================================

-- 1. Disable unused GraphQL extension (clears all 10 pg_graphql_* warnings)
DROP EXTENSION IF EXISTS pg_graphql;

-- 2. Revoke unnecessary table permissions from `anon` role
REVOKE ALL ON TABLE public.bookings FROM anon;
REVOKE ALL ON TABLE public.waitlist FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.class_sessions FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.workout_classes FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.user_profiles FROM anon;

-- 3. Lock down trigger functions so they cannot be called via HTTP RPC
-- (Triggers still execute normally when fired by PostgreSQL table events)
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.manage_waitlist_positions() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.promote_from_waitlist() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_current_bookings() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_user_tier_change() FROM PUBLIC, anon, authenticated;

-- 4. Create a non-exposed `private` schema for internal RLS helper functions
-- Functions in `private` are not exposed to PostgREST (/rest/v1/rpc),
-- preventing both infinite RLS recursion on `user_profiles` and linter warnings.
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
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated;

-- 5. Add missing RLS policies on `user_profiles` and `waitlist`

-- Allow everyone (calendar visitors & signed-in users) to see instructor/admin names
DROP POLICY IF EXISTS "Everyone can read instructor profiles" ON public.user_profiles;
CREATE POLICY "Everyone can read instructor profiles"
  ON public.user_profiles
  FOR SELECT
  USING (user_tier IN ('instructor', 'admin'));

-- Allow admins to read all user profiles (needed for Manual Booking search & Session Details)
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.user_profiles;
CREATE POLICY "Admins can read all profiles"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (private.is_admin());

-- Allow admins to view all waitlist entries (needed for Session Details tab)
DROP POLICY IF EXISTS "Admins can view all waitlist entries" ON public.waitlist;
CREATE POLICY "Admins can view all waitlist entries"
  ON public.waitlist
  FOR SELECT
  TO authenticated
  USING (private.is_admin());

-- 6. Switch `get_available_instructors()` to SECURITY INVOKER and restrict to `authenticated`
-- Now that admins can read `user_profiles` via RLS, SECURITY DEFINER is no longer needed!
ALTER FUNCTION public.get_available_instructors() SECURITY INVOKER;
REVOKE ALL ON FUNCTION public.get_available_instructors() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_available_instructors() TO authenticated;
