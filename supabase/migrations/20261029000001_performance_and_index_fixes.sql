-- ============================================================================
-- Migration: Fix RLS Performance Warnings (auth_rls_initplan & multiple_permissive_policies)
--            and Add Missing Foreign Key Indexes
-- ============================================================================

-- Ensure private.is_admin() helper exists
CREATE SCHEMA IF NOT EXISTS private;

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

-- ============================================================================
-- 1. TABLE: public.workout_classes
-- ============================================================================
DROP POLICY IF EXISTS "Everyone can read workout classes" ON public.workout_classes;
DROP POLICY IF EXISTS "Admins can create workout templates" ON public.workout_classes;
DROP POLICY IF EXISTS "Admins can update workout templates" ON public.workout_classes;
DROP POLICY IF EXISTS "Admins can delete workout templates" ON public.workout_classes;

CREATE POLICY "Everyone can read workout classes"
  ON public.workout_classes
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can create workout templates"
  ON public.workout_classes
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT private.is_admin()));

CREATE POLICY "Admins can update workout templates"
  ON public.workout_classes
  FOR UPDATE
  TO authenticated
  USING ((SELECT private.is_admin()))
  WITH CHECK ((SELECT private.is_admin()));

CREATE POLICY "Admins can delete workout templates"
  ON public.workout_classes
  FOR DELETE
  TO authenticated
  USING ((SELECT private.is_admin()));

-- ============================================================================
-- 2. TABLE: public.class_sessions
-- ============================================================================
DROP POLICY IF EXISTS "Everyone can read class sessions" ON public.class_sessions;
DROP POLICY IF EXISTS "Admins can create sessions" ON public.class_sessions;
DROP POLICY IF EXISTS "Admins can update sessions" ON public.class_sessions;
DROP POLICY IF EXISTS "Admins can delete sessions" ON public.class_sessions;

CREATE POLICY "Everyone can read class sessions"
  ON public.class_sessions
  FOR SELECT
  USING (is_active = true OR (SELECT private.is_admin()));

CREATE POLICY "Admins can create sessions"
  ON public.class_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT private.is_admin()));

CREATE POLICY "Admins can update sessions"
  ON public.class_sessions
  FOR UPDATE
  TO authenticated
  USING ((SELECT private.is_admin()))
  WITH CHECK ((SELECT private.is_admin()));

CREATE POLICY "Admins can delete sessions"
  ON public.class_sessions
  FOR DELETE
  TO authenticated
  USING ((SELECT private.is_admin()));

-- ============================================================================
-- 3. TABLE: public.bookings (Consolidated single policy per action)
-- ============================================================================
DROP POLICY IF EXISTS "Admins can view all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can read own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users and admins can view bookings" ON public.bookings;

DROP POLICY IF EXISTS "Admins can book users manually" ON public.bookings;
DROP POLICY IF EXISTS "Users can create own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users and admins can create bookings" ON public.bookings;

DROP POLICY IF EXISTS "Users can update own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users and admins can update bookings" ON public.bookings;

DROP POLICY IF EXISTS "Admins can delete any booking" ON public.bookings;
DROP POLICY IF EXISTS "Users can delete own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users and admins can delete bookings" ON public.bookings;

CREATE POLICY "Users and admins can view bookings"
  ON public.bookings
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT private.is_admin()));

CREATE POLICY "Users and admins can create bookings"
  ON public.bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) OR (SELECT private.is_admin()));

CREATE POLICY "Users and admins can update bookings"
  ON public.bookings
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT private.is_admin()))
  WITH CHECK (user_id = (SELECT auth.uid()) OR (SELECT private.is_admin()));

CREATE POLICY "Users and admins can delete bookings"
  ON public.bookings
  FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT private.is_admin()));

-- ============================================================================
-- 4. TABLE: public.waitlist (Consolidated single policy per action)
-- ============================================================================
DROP POLICY IF EXISTS "Admins can view all waitlist entries" ON public.waitlist;
DROP POLICY IF EXISTS "Users can read own waitlist entries" ON public.waitlist;
DROP POLICY IF EXISTS "Users and admins can view waitlist" ON public.waitlist;

DROP POLICY IF EXISTS "Users can create own waitlist entries" ON public.waitlist;

DROP POLICY IF EXISTS "Users can delete own waitlist entries" ON public.waitlist;
DROP POLICY IF EXISTS "Users and admins can delete waitlist entries" ON public.waitlist;

CREATE POLICY "Users and admins can view waitlist"
  ON public.waitlist
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT private.is_admin()));

CREATE POLICY "Users can create own waitlist entries"
  ON public.waitlist
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users and admins can delete waitlist entries"
  ON public.waitlist
  FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT private.is_admin()));

-- ============================================================================
-- 5. TABLE: public.user_profiles (Consolidated per role & action)
-- ============================================================================
DROP POLICY IF EXISTS "Everyone can view instructor info" ON public.user_profiles;
DROP POLICY IF EXISTS "Everyone can read instructor profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Anon can read instructor profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Authenticated can read profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;

CREATE POLICY "Anon can read instructor profiles"
  ON public.user_profiles
  FOR SELECT
  TO anon
  USING (user_tier IN ('instructor', 'admin'));

CREATE POLICY "Authenticated can read profiles"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR user_tier IN ('instructor', 'admin')
    OR (SELECT private.is_admin())
  );

CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- ============================================================================
-- 6. FOREIGN KEY COVERING INDEXES (Fixes unindexed_foreign_keys INFOs)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_bookings_session_id
  ON public.bookings USING btree (session_id);

CREATE INDEX IF NOT EXISTS idx_class_sessions_class_id
  ON public.class_sessions USING btree (class_id);
