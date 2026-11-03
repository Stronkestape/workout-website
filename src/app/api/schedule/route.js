import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CALENDAR_MONTHS_BACK } from '@/utils/constants';

export const revalidate = 30; // 30-second edge cache

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // Only fetch sessions within the calendar's allowed lookback window
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

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || [], {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=300',
      },
    });
  } catch (err) {
    console.error('Error in schedule API route:', err);
    return NextResponse.json({ error: 'Failed to fetch schedule' }, { status: 500 });
  }
}
