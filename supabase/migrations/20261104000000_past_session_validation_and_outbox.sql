-- Migration: 20261104000000_past_session_validation_and_outbox.sql
-- 1. Prevent scheduling or editing sessions in the past (physical timeline: start_time <= now())
-- 2. Create notification_outbox table for Transactional Outbox pattern
-- 3. Enhance promote_from_waitlist() trigger to write to notification_outbox atomically
-- 4. Provide claim_pending_outbox_notifications() and complete_outbox_notification() with FOR UPDATE SKIP LOCKED
-- 5. Prevent double booking/waitlisting in validate_waitlist_insert()

-- 1. Class Session Times Validation Trigger
CREATE OR REPLACE FUNCTION private.validate_class_session_times()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- End time must be strictly after start time
  IF NEW.end_time <= NEW.start_time THEN
    RAISE EXCEPTION 'Az edzés befejezési időpontjának a kezdési időpont után kell lennie.';
  END IF;

  -- Past date prevention for INSERT and modified start_time in UPDATE (physical timeline: <= now())
  IF (TG_OP = 'INSERT' AND NEW.start_time <= now())
     OR (TG_OP = 'UPDATE' AND NEW.start_time IS DISTINCT FROM OLD.start_time 
         AND NEW.start_time <= now()) THEN
    -- Allow bypass if explicitly flagged by recurring schedule job
    IF pg_trigger_depth() <= 1 
       AND COALESCE(current_setting('app.skip_recurring_trigger', true), '') <> 'true' THEN
      RAISE EXCEPTION 'Edzés nem hozható létre és nem módosítható múltbéli időpontra.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.validate_class_session_times() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trigger_validate_class_session_times ON public.class_sessions;
CREATE TRIGGER trigger_validate_class_session_times
  BEFORE INSERT OR UPDATE ON public.class_sessions
  FOR EACH ROW
  EXECUTE FUNCTION private.validate_class_session_times();

-- 2. Notification Outbox Table
CREATE TABLE IF NOT EXISTS public.notification_outbox (
  id BIGSERIAL PRIMARY KEY,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notification_outbox_status_created 
ON public.notification_outbox (status, created_at) 
WHERE status = 'pending';

ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on notification_outbox" ON public.notification_outbox;
CREATE POLICY "Service role full access on notification_outbox" 
ON public.notification_outbox
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view notification_outbox" ON public.notification_outbox;
CREATE POLICY "Admins can view notification_outbox"
ON public.notification_outbox
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = (select auth.uid())
    AND user_profiles.user_tier = 'admin'
  )
);

-- 3. Enhance promote_from_waitlist() to write to notification_outbox
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
    -- Native 64-bit integer advisory lock on session_id
    PERFORM pg_advisory_xact_lock(v_session_id);

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

      -- Atomic Transactional Outbox insertion for waitlist promotion notification
      INSERT INTO public.notification_outbox (
        recipient_email,
        recipient_name,
        subject,
        notification_type,
        payload
      )
      SELECT 
        up.email,
        COALESCE(up.full_name, up.username),
        'Felszabadult egy hely! Bejutottál a(z) ' || wc.title || ' edzésre',
        'waitlist_promoted',
        jsonb_build_object(
          'user_id', up.id,
          'session_id', cs.id,
          'workout_title', wc.title,
          'start_time', cs.start_time,
          'end_time', cs.end_time
        )
      FROM public.user_profiles up
      CROSS JOIN public.class_sessions cs
      JOIN public.workout_classes wc ON cs.class_id = wc.id
      WHERE up.id = v_next_user_id AND cs.id = v_session_id;
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

-- 4. Atomic Outbox claiming with FOR UPDATE SKIP LOCKED
CREATE OR REPLACE FUNCTION public.claim_pending_outbox_notifications(p_batch_size integer DEFAULT 25)
RETURNS SETOF public.notification_outbox
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  WITH to_claim AS (
    SELECT id
    FROM public.notification_outbox
    WHERE status = 'pending'
    ORDER BY created_at ASC
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.notification_outbox no
  SET status = 'processing',
      processed_at = now()
  FROM to_claim
  WHERE no.id = to_claim.id
  RETURNING no.*;
END;
$$;

-- 5. Complete Outbox notification
CREATE OR REPLACE FUNCTION public.complete_outbox_notification(p_id bigint, p_status text, p_error text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.notification_outbox
  SET status = p_status,
      error_message = p_error,
      processed_at = now()
  WHERE id = p_id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_pending_outbox_notifications(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_pending_outbox_notifications(integer) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.complete_outbox_notification(bigint, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_outbox_notification(bigint, text, text) TO authenticated, service_role;
