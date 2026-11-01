-- ============================================================================
-- Migration: High-Performance Composite Indexes for Sub-2ms Queries
-- Target: class_sessions schedule queries, bookings status lookups, and waitlist
-- ============================================================================

-- 1. Composite index for calendar schedule fetching: filters active sessions and orders by start_time
CREATE INDEX IF NOT EXISTS idx_class_sessions_active_start
  ON public.class_sessions (is_active, start_time ASC);

-- 2. Composite covering index for user booking state: resolves user's confirmed bookings directly from index
CREATE INDEX IF NOT EXISTS idx_bookings_user_status_session
  ON public.bookings (user_id, booking_status, session_id);

-- 3. Composite index for session capacity and participant lookups
CREATE INDEX IF NOT EXISTS idx_bookings_session_status
  ON public.bookings (session_id, booking_status);

-- 4. Composite index for waitlist position queries
CREATE INDEX IF NOT EXISTS idx_waitlist_session_position
  ON public.waitlist (session_id, position ASC);
