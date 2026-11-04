import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { getCookieUserId, createSupabaseServerClient } from '@/lib/server';
import ProfileForm from '@/components/ProfileForm';
import PasswordChangeForm from '@/components/PasswordChangeForm';

export const metadata = {
  title: 'Profile Settings | Mozgás Központ',
  description: 'Manage your profile details, password, and account settings.',
};

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const cookieUserId = getCookieUserId(cookieStore);

  if (!cookieUserId) {
    redirect('/login');
  }

  const supabase = await createSupabaseServerClient(cookieStore);
  const [authRes, profileRes] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('user_profiles').select('*').eq('id', cookieUserId).single(),
  ]);

  const user = authRes.data?.user;
  if (!user || user.id !== cookieUserId) {
    redirect('/login');
  }

  const { data: profile, error } = profileRes;

  if (error || !profile) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-800 text-sm font-medium">
          Failed to load profile details. Please try refreshing or logging in again.
        </div>
      </div>
    );
  }

  const isAdmin = profile.user_tier === 'admin';
  const isInstructor = profile.user_tier === 'instructor';

  return (
    <div className="container mx-auto max-w-6xl p-4 sm:p-6 lg:p-8 min-h-[85vh]">
      {/* Header */}
      <div className="mb-6 sm:mb-8 pb-6 border-b border-stone-200/80">
        <div className="flex items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#8c3010] mb-1">
              <span className="w-2 h-2 rounded-full bg-[#8c3010]" aria-hidden="true" />
              <span>My Account</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
              Profile Settings
            </h1>
            <p className="text-sm sm:text-base text-stone-600 mt-1">
              Manage your personal information, contact email, and account password.
            </p>
          </div>
          {isAdmin && (
            <div className="bg-purple-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl font-semibold shadow-xs text-xs sm:text-sm shrink-0">
              Administrator
            </div>
          )}
          {isInstructor && !isAdmin && (
            <div className="bg-indigo-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl font-semibold shadow-xs text-xs sm:text-sm shrink-0">
              Instructor
            </div>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Account Settings Forms */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200/80 p-6">
            <h2 className="text-xl font-bold mb-4 text-stone-900">
              Personal Information
            </h2>
            <ProfileForm profile={profile} />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-stone-200/80 p-6">
            <h2 className="text-xl font-bold mb-4 text-stone-900">
              Change Password
            </h2>
            <PasswordChangeForm />
          </div>

          {isAdmin && (
            <div className="bg-purple-50/70 rounded-2xl shadow-sm p-6 border border-purple-200">
              <h2 className="text-xl font-bold mb-2 text-purple-950">
                Administration Console
              </h2>
              <p className="text-purple-800 mb-4 text-sm">
                As an administrator, you can configure workout templates, schedule classes, and manage participant rosters.
              </p>
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-xl hover:bg-purple-700 transition-colors font-medium text-sm shadow-xs"
              >
                <span>Open Admin Dashboard</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          )}

          {isInstructor && !isAdmin && (
            <div className="bg-indigo-50/70 rounded-2xl shadow-sm p-6 border border-indigo-200">
              <h2 className="text-xl font-bold mb-2 text-indigo-950">
                Instructor Dashboard
              </h2>
              <p className="text-indigo-800 text-sm">
                You are registered as an instructor. You can schedule sessions, manage your assigned classes, and view participant rosters.
              </p>
              <div className="mt-4">
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors font-medium text-sm shadow-xs"
                >
                  <span>Open Instructor Dashboard</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - User Info Card (Instant Server Render) */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200/80 p-6">
            <div className="text-center">
              <div
                className={`w-20 h-20 ${
                  isAdmin
                    ? 'bg-purple-600'
                    : isInstructor
                    ? 'bg-indigo-600'
                    : 'bg-warm-terracotta'
                } rounded-full mx-auto mb-4 flex items-center justify-center text-white text-2xl font-bold shadow-xs`}
              >
                {profile.username?.charAt(0).toUpperCase() || 'U'}
              </div>
              <h3 className="text-xl font-bold text-stone-900">
                @{profile.username}
              </h3>
              {profile.full_name && (
                <p className="text-stone-700 font-medium text-sm mt-0.5">
                  {profile.full_name}
                </p>
              )}
              <p className="text-stone-700 text-xs mt-1">{profile.email}</p>

              <div className="mt-5 pt-5 border-t border-stone-200">
                <div className="flex justify-between text-sm py-1">
                  <span className="text-stone-700">Member since</span>
                  <span className="font-semibold text-stone-900">
                    {new Date(profile.created_at).toLocaleDateString('en-US', {
                      timeZone: 'Europe/Budapest',
                      year: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </div>
                <div className="flex justify-between text-sm py-1 mt-1">
                  <span className="text-stone-700">Account tier</span>
                  <span
                    className={`font-semibold ${
                      isAdmin
                        ? 'text-purple-600'
                        : isInstructor
                        ? 'text-indigo-600'
                        : 'text-stone-800'
                    }`}
                  >
                    {isAdmin
                      ? 'Admin'
                      : isInstructor
                      ? 'Instructor'
                      : 'Member'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick link to My Bookings */}
          <div className="bg-stone-50/80 rounded-2xl border border-stone-200/80 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-warm-terracotta/10 text-warm-terracotta flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-stone-900 text-base">My Bookings</h3>
                <p className="text-xs text-stone-600">Review your class bookings & waitlist</p>
              </div>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed mb-4">
              View your confirmed upcoming workout schedule and manage your active waitlist spots.
            </p>
            <Link
              href="/bookings"
              className="w-full inline-flex items-center justify-center gap-2 bg-warm-terracotta hover:bg-warm-terracotta-hover text-white font-semibold text-sm py-2.5 px-4 rounded-xl transition-colors shadow-xs"
            >
              <span>View My Bookings</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
