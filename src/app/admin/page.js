import { redirect } from 'next/navigation';
import { getSafeUser, createSupabaseServerClient } from '@/lib/server';
import AdminDashboardClient from './AdminDashboardClient';

export const metadata = {
  title: 'Dashboard | Mozgás Központ',
  description: 'Manage class sessions, templates, and bookings.',
};

export default async function AdminDashboardPage() {
  const { user, supabase: authSupabase } = await getSafeUser();

  if (!user) {
    redirect('/login');
  }

  const supabase = authSupabase || (await createSupabaseServerClient());
  const [profileResult, sessionsResult, templatesResult] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('username, full_name, user_tier')
      .eq('id', user.id)
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
