import { NextResponse } from 'next/server';
import { getSafeUser, createSupabaseServerClient } from '@/lib/server';

export async function GET() {
  try {
    const { user, supabase: authSupabase } = await getSafeUser();

    if (!user) {
      return NextResponse.json(
        { user: null },
        { headers: { 'Cache-Control': 'private, no-store' } }
      );
    }

    const supabase = authSupabase || (await createSupabaseServerClient());
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('username, user_tier')
      .eq('id', user.id)
      .maybeSingle();

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          username: profile?.username || null,
          user_tier: profile?.user_tier || 'regular',
        },
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
