import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getCookieUserId, createSupabaseServerClient } from '@/lib/server';

function createUnauthorizedResponse() {
  const response = NextResponse.json(
    { user: null },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
  response.cookies.delete('mk_role');
  response.cookies.delete('mk_user');
  return response;
}

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const cookieUserId = getCookieUserId(cookieStore);

    if (!cookieUserId) {
      return createUnauthorizedResponse();
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
      return createUnauthorizedResponse();
    }

    const profile = profileRes.data;
    const isProd = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      path: '/',
      maxAge: 604800,
      sameSite: 'lax',
      secure: isProd,
      httpOnly: false,
    };

    const response = NextResponse.json(
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

    response.cookies.set('mk_role', profile?.user_tier || 'regular', cookieOptions);
    response.cookies.set(
      'mk_user',
      encodeURIComponent(profile?.username || ''),
      cookieOptions
    );

    return response;
  } catch {
    return createUnauthorizedResponse();
  }
}

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch {
    // Ignore errors during sign-out cleanup
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.delete('mk_role');
  response.cookies.delete('mk_user');
  return response;
}
