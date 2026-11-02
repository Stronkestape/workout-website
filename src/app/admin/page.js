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
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('username, full_name, user_tier')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.user_tier !== 'admin' && profile.user_tier !== 'instructor')) {
    redirect('/');
  }

  return <AdminDashboardClient initialUser={{ ...user, profile }} />;
}
