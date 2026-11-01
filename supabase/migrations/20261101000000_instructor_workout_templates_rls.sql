-- Migration: 20261101000000_instructor_workout_templates_rls.sql
-- Description: Allow instructors to create, update, and manage workout templates (workout_classes) alongside admins

-- 1. Ensure Table Grants for Authenticated Users
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.workout_classes TO authenticated;

-- 2. Drop legacy admin-only policies on workout_classes
DROP POLICY IF EXISTS "Admins can create workout templates" ON public.workout_classes;
DROP POLICY IF EXISTS "Admins can update workout templates" ON public.workout_classes;
DROP POLICY IF EXISTS "Admins can delete workout templates" ON public.workout_classes;
DROP POLICY IF EXISTS "Staff can create workout templates" ON public.workout_classes;
DROP POLICY IF EXISTS "Staff can update workout templates" ON public.workout_classes;
DROP POLICY IF EXISTS "Staff can delete workout templates" ON public.workout_classes;

-- 3. Create staff policies allowing both admins and instructors to manage templates
CREATE POLICY "Staff can create workout templates"
  ON public.workout_classes
  FOR INSERT
  TO authenticated
  WITH CHECK (private.is_admin() OR private.is_instructor());

CREATE POLICY "Staff can update workout templates"
  ON public.workout_classes
  FOR UPDATE
  TO authenticated
  USING (private.is_admin() OR private.is_instructor())
  WITH CHECK (private.is_admin() OR private.is_instructor());

CREATE POLICY "Staff can delete workout templates"
  ON public.workout_classes
  FOR DELETE
  TO authenticated
  USING (private.is_admin() OR private.is_instructor());
