-- ============================================================================
-- Migration: 4-Week Recurring Sessions & Automatic 2-Week Expired Session Cleanup
-- ============================================================================

-- 1. Add `is_recurring` column to `public.class_sessions`
ALTER TABLE public.class_sessions
  ADD COLUMN IF NOT EXISTS is_recurring boolean NOT NULL DEFAULT true;

-- 2. Trigger function: When a new recurring session is created, automatically
--    generate its weekly replicas for the next 3 weeks (4 weeks total).
CREATE OR REPLACE FUNCTION private.handle_recurring_session_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week integer;
  v_new_start timestamptz;
  v_new_end timestamptz;
BEGIN
  -- Prevent recursive trigger execution when inserting the replicas
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  IF NEW.is_recurring = true THEN
    FOR v_week IN 1..3 LOOP
      v_new_start := NEW.start_time + (v_week * interval '7 days');
      v_new_end   := NEW.end_time   + (v_week * interval '7 days');

      -- Only insert if an identical class session at the same start_time doesn't exist yet
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

DROP TRIGGER IF EXISTS trigger_generate_recurring_sessions ON public.class_sessions;
CREATE TRIGGER trigger_generate_recurring_sessions
  AFTER INSERT ON public.class_sessions
  FOR EACH ROW
  EXECUTE FUNCTION private.handle_recurring_session_insert();

-- 3. Maintenance function:
--    a) Deletes sessions that ended more than 14 days ago (cascades to bookings/waitlist)
--    b) Rolls active recurring sessions forward so a 4-week window is always maintained
CREATE OR REPLACE FUNCTION private.maintain_class_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- A) Delete sessions that ended more than 2 weeks (14 days) ago
  DELETE FROM public.class_sessions
  WHERE end_time < (now() - interval '14 days');

  -- B) Roll recurring sessions forward into the 4th week window (21 to 28 days ahead)
  --    Using the 3rd-week session as the source ensures that if an admin manually
  --    deleted an earlier week (e.g. for a holiday), it won't be recreated.
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
    cs.start_time + interval '7 days',
    cs.end_time + interval '7 days',
    0,
    cs.is_active,
    true
  FROM public.class_sessions cs
  WHERE cs.is_recurring = true
    AND cs.is_active = true
    AND (cs.start_time + interval '7 days') > (now() + interval '21 days')
    AND (cs.start_time + interval '7 days') <= (now() + interval '28 days')
    AND NOT EXISTS (
      SELECT 1
      FROM public.class_sessions existing
      WHERE existing.class_id = cs.class_id
        AND existing.start_time = (cs.start_time + interval '7 days')
    );
END;
$$;

REVOKE ALL ON FUNCTION private.maintain_class_sessions() FROM PUBLIC, anon, authenticated;

-- 4. Enable pg_cron and schedule daily maintenance at 03:00 UTC
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

DO $$
BEGIN
  -- Remove existing job with the same name if present so migration is idempotent
  PERFORM cron.unschedule('maintain-workout-sessions')
  WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'maintain-workout-sessions'
  );

  PERFORM cron.schedule(
    'maintain-workout-sessions',
    '0 3 * * *',
    'SELECT private.maintain_class_sessions();'
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron scheduling skipped or requires dashboard enablement: %', SQLERRM;
END;
$$;

-- 5. Run maintenance once immediately
SELECT private.maintain_class_sessions();
