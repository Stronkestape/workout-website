import { NextResponse } from 'next/server';
import { dispatchPendingOutboxNotifications } from '@/lib/notifications/outboxDispatcher';
import { createSupabaseServerClient } from '@/lib/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Allow Cron Secret authorization OR Admin session authorization
    const isAuthorizedBySecret = cronSecret && authHeader === `Bearer ${cronSecret}`;

    if (!isAuthorizedBySecret) {
      const supabase = await createSupabaseServerClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: 'Nem engedélyezett hozzáférés.' }, { status: 401 });
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('user_tier')
        .eq('id', user.id)
        .single();

      if (profile?.user_tier !== 'admin') {
        return NextResponse.json({ error: 'Adminisztrátori jogosultság szükséges.' }, { status: 403 });
      }
    }

    const result = await dispatchPendingOutboxNotifications();
    return NextResponse.json({ ok: true, ...result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Ismeretlen hiba';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
