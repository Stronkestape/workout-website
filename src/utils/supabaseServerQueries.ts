import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type {
  UserBookingWithSession,
  UserWaitlistWithSession,
} from './supabaseQueries';

/**
 * Server-side Supabase queries for Next.js App Router Server Components
 */

export interface ServerBookingsResult {
  bookings: UserBookingWithSession[];
  waitlist: UserWaitlistWithSession[];
}

export async function fetchUserBookingsServer(
  supabase: SupabaseClient<Database> | null | undefined,
  userId: string | null | undefined
): Promise<ServerBookingsResult> {
  if (!supabase || !userId) return { bookings: [], waitlist: [] };

  const nowIso = new Date().toISOString();

  const [bookingsRes, waitlistRes] = await Promise.all([
    supabase
      .from("bookings")
      .select(`
        id,
        booking_status,
        booked_at,
        class_sessions (
          id,
          start_time,
          end_time,
          instructor:instructor_id (
            username,
            full_name
          ),
          workout_classes (
            title,
            max_capacity
          )
        )
      `)
      .eq("user_id", userId)
      .eq("booking_status", "confirmed")
      .order("class_sessions(start_time)", { ascending: false }),

    supabase
      .from("waitlist")
      .select(`
        id,
        position,
        joined_at,
        class_sessions (
          id,
          start_time,
          end_time,
          instructor:instructor_id (
            username,
            full_name
          ),
          workout_classes (
            title
          )
        )
      `)
      .eq("user_id", userId)
      .gte("class_sessions.start_time", nowIso)
      .order("class_sessions(start_time)", { ascending: true }),
  ]);

  return {
    bookings: (bookingsRes.data as unknown as UserBookingWithSession[]) || [],
    waitlist: (waitlistRes.data as unknown as UserWaitlistWithSession[]) || [],
  };
}
