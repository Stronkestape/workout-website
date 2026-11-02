'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabaseBrowser } from '@/lib/browser';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import UserBookingsList from '@/components/UserBookingsList';

export default function BookingsPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const checkUser = useCallback(async () => {
    try {
      setLoading(true);
      const {
        data: { user: authUser },
        error,
      } = await supabaseBrowser.auth.getUser();

      if (error || !authUser) {
        router.push('/login');
        return;
      }

      setUser(authUser);
    } catch (err) {
      console.error('Error verifying user session:', err);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    checkUser();
  }, [checkUser]);

  if (loading) {
    return (
      <div className="container mx-auto max-w-5xl p-4 sm:p-6 lg:p-8 min-h-[85vh]">
        <div className="mb-6 sm:mb-8 border-b border-stone-200/80 pb-6 animate-pulse">
          <div className="h-3 w-20 bg-stone-300 rounded-full mb-2" />
          <div className="h-8 w-44 bg-stone-300 rounded-xl mb-2" />
          <div className="h-4 w-72 bg-stone-200 rounded-lg" />
        </div>
        <div className="space-y-4 animate-pulse">
          <div className="h-36 bg-stone-200/70 rounded-2xl border border-stone-300" />
          <div className="h-36 bg-stone-200/70 rounded-2xl border border-stone-300" />
          <div className="h-36 bg-stone-200/70 rounded-2xl border border-stone-300" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <div className="min-h-[85vh]" />;
  }

  return (
    <div className="container mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
      {/* Header with Title and Action to Calendar */}
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-warm-terracotta mb-1">
            <span className="w-2 h-2 rounded-full bg-warm-terracotta" aria-hidden="true" />
            <span>My Account</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
            My Bookings
          </h1>
          <p className="text-sm sm:text-base text-stone-600 mt-1">
            Review your upcoming confirmed workouts, active waitlist positions, and past session history.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/calendar"
            className="inline-flex items-center gap-2 bg-warm-terracotta hover:bg-warm-terracotta-hover text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm"
          >
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span>Book New Class</span>
          </Link>
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 px-4 py-2.5 rounded-xl font-medium text-sm transition-colors shadow-2xs"
          >
            <span>Profile Settings</span>
          </Link>
        </div>
      </div>

      <UserBookingsList userId={user.id} />
    </div>
  );
}
