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
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-stone-600 font-medium text-base">
          Foglalások betöltése...
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
      {/* Header with Title and Action to Calendar */}
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-warm-terracotta mb-1">
            <span className="w-2 h-2 rounded-full bg-warm-terracotta" aria-hidden="true" />
            <span>Fiókom</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
            My Bookings
          </h1>
          <p className="text-sm sm:text-base text-stone-600 mt-1">
            Tekintsd át az aktív edzésjelentkezéseidet, várólistás státuszaidat és előzményeidet.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/calendar"
            className="inline-flex items-center gap-2 bg-warm-terracotta hover:bg-warm-terracotta/90 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-colors shadow-xs"
          >
            <svg
              className="w-4 h-4"
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
            <span>Új edzés foglalása</span>
          </Link>
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 px-4 py-2.5 rounded-xl font-medium text-sm transition-colors"
          >
            <span>Profile beállítások</span>
          </Link>
        </div>
      </div>

      {/* Bookings Card Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200/80 p-5 sm:p-7">
        <UserBookingsList userId={user.id} />
      </div>
    </div>
  );
}
