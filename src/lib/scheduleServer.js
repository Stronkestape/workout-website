import { createSupabasePublicClient } from '@/lib/publicSupabase';
import { CALENDAR_MONTHS_BACK } from '@/utils/constants';

/**
 * Fetches active class sessions within the calendar's allowed lookback window
 * using the cookie-free public Supabase client.
 * Safe for ISR Server Components and Edge/Node Route Handlers.
 */
export async function fetchPublicScheduleServer() {
  const supabase = createSupabasePublicClient();

  const minWindowDate = new Date();
  minWindowDate.setMonth(minWindowDate.getMonth() - CALENDAR_MONTHS_BACK);

  const { data, error } = await supabase
    .from('class_sessions')
    .select(`
      id,
      start_time,
      end_time,
      current_bookings,
      is_active,
      instructor_id,
      workout_classes (
        id,
        title,
        description,
        duration,
        max_capacity
      ),
      instructor:instructor_id (
        id,
        username,
        full_name
      )
    `)
    .gte('start_time', minWindowDate.toISOString())
    .eq('is_active', true)
    .order('start_time', { ascending: true });

  return { data: data || [], error };
}
