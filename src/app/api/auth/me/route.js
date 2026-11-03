import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getCookieUserId, createSupabaseServerClient } from '@/lib/server';

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const cookieUserId = getCookieUserId(cookieStore);

    if (!cookieUserId) {
      return NextResponse.json(
        { user: null },
        { headers: { 'Cache-Control': 'private, no-store' } }
      );
    }

    const includeBookings =
      request?.nextUrl?.searchParams?.get('includeBookings') === '1';

    const supabase = await createSupabaseServerClient(cookieStore);
    const [authRes, profileRes, bookingsRes] = await Promise.all([
      supabase.auth.getUser(),
      supabase
        .from('user_profiles')
        .select('username, user_tier')
        .eq('id', cookieUserId)
        .maybeSingle(),
      includeBookings
        ? supabase
            .from('bookings')
            .select('session_id')
            .eq('user_id', cookieUserId)
            .eq('booking_status', 'confirmed')
        : Promise.resolve({ data: [] }),
    ]);

    const user = authRes.data?.user;
    if (!user || user.id !== cookieUserId) {
      return NextResponse.json(
        { user: null },
        { headers: { 'Cache-Control': 'private, no-store' } }
      );
    }

    const profile = profileRes.data;

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          username: profile?.username || null,
          user_tier: profile?.user_tier || 'regular',
        },
        ...(includeBookings
          ? {
              bookedSessionIds: (bookingsRes.data || []).map(
                (b) => b.session_id
              ),
            }
          : {}),
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch {
    return NextResponse.json(
      { user: null },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  }
}

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch {
    // Ignore errors during sign-out cleanup
  }
  return NextResponse.json({ ok: true });
}
