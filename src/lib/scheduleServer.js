import { createSupabasePublicClient } from '@/lib/publicSupabase';
import { CALENDAR_MONTHS_BACK } from '@/utils/constants';
import { unstable_cache } from 'next/cache';

/**
 * Low-level query that fetches active class sessions from Supabase.
 */
async function queryPublicSchedule() {
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

  return { data: data || [], error: error ? error.message : null };
}

/**
 * Cached public schedule provider with Next.js Data Cache.
 * Enables instant (<20ms TTFB) server response for Edge ISR and route handlers.
 */
export const fetchPublicScheduleServer = unstable_cache(
  queryPublicSchedule,
  ['public-schedule-cache'],
  {
    revalidate: 60,
    tags: ['public-schedule'],
  }
);
