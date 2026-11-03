import { NextResponse } from 'next/server';
import { fetchPublicScheduleServer } from '@/lib/scheduleServer';

export const revalidate = 30; // 30-second edge cache

export async function GET() {
  try {
    const { data, error } = await fetchPublicScheduleServer();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=300',
      },
    });
  } catch (err) {
    console.error('Error in schedule API route:', err);
    return NextResponse.json({ error: 'Failed to fetch schedule' }, { status: 500 });
  }
}
