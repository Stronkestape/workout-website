import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getCookieUserId, createSupabaseServerClient } from '@/lib/server';
import AdminDashboardClient from './AdminDashboardClient';

export const metadata = {
  title: 'Vezérlőpult | Mozgás Központ',
  description: 'Edzések, sablonok és foglalások adminisztrációja.',
};

export default async function AdminDashboardPage() {
  const cookieStore = await cookies();
  const cookieUserId = getCookieUserId(cookieStore);

  if (!cookieUserId) {
    redirect('/login');
  }

  const supabase = await createSupabaseServerClient(cookieStore);
  const [authResult, profileResult, sessionsResult, templatesResult] =
    await Promise.all([
      supabase.auth.getUser(),
      supabase
        .from('user_profiles')
        .select('username, full_name, user_tier')
        .eq('id', cookieUserId)
        .single(),
      supabase
        .from('class_sessions')
        .select(
          '*, workout_classes(id, title, max_capacity), instructor:instructor_id(id, username, full_name)'
        )
        .order('start_time', { ascending: true }),
      supabase
        .from('workout_classes')
        .select('*')
        .order('created_at', { ascending: false }),
    ]);

  const user = authResult.data?.user;
  if (!user || user.id !== cookieUserId) {
    redirect('/login');
  }

  const profile = profileResult.data;

  if (
    !profile ||
    (profile.user_tier !== 'admin' && profile.user_tier !== 'instructor')
  ) {
    redirect('/');
  }

  const allSessions = sessionsResult.data || [];
  const initialSessions =
    profile.user_tier === 'instructor'
      ? allSessions.filter((s) => s.instructor_id === user.id)
      : allSessions;
  const initialTemplates = templatesResult.data || [];
  const serverNow = new Date().toISOString();

  return (
    <AdminDashboardClient
      initialUser={{ ...user, profile }}
      initialSessions={initialSessions}
      initialTemplates={initialTemplates}
      serverNow={serverNow}
    />
  );
}
