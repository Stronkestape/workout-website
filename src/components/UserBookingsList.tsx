"use client";

import React, { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { formatDateTime, getCancellationInfo } from "@/utils/calendarHelpers";
import { cancelBookingAction, leaveWaitlistAction } from "@/app/calendar/actions";
import type {
  UserBookingWithSession,
  UserWaitlistWithSession,
} from "@/utils/supabaseQueries";

const ConfirmModal = dynamic(() => import("@/components/ConfirmModal"), {
  ssr: false,
});

export interface ConfirmActionData {
  type: "cancelBooking" | "leaveWaitlist";
  sessionId: number;
  title: string;
  message: string;
  confirmLabel: string;
  variant?: "danger" | "warning";
}

export interface UserBookingsListProps {
  userId: string;
  initialBookings?: UserBookingWithSession[] | null;
  initialWaitlist?: UserWaitlistWithSession[] | null;
  serverNow?: string | null;
}

export default function UserBookingsList({
  userId,
  initialBookings = null,
  initialWaitlist = null,
  serverNow = null,
}: UserBookingsListProps) {
  const hasInitialData = Array.isArray(initialBookings) && Array.isArray(initialWaitlist);
  const [bookings, setBookings] = useState<UserBookingWithSession[]>(initialBookings || []);
  const [waitlist, setWaitlist] = useState<UserWaitlistWithSession[]>(initialWaitlist || []);
  const [loading, setLoading] = useState(!hasInitialData);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmAction, setConfirmAction] = useState<ConfirmActionData | null>(null);
  const [referenceTime, setReferenceTime] = useState<Date>(() =>
    serverNow ? new Date(serverNow) : new Date()
  );

  useEffect(() => {
    setReferenceTime(new Date());
  }, []);

  const fetchBookingsData = useCallback(async () => {
    try {
      setLoading(true);

      const { fetchUserBookings } = await import("@/utils/supabaseQueries");
      const {
        bookings: bookingsData,
        waitlist: waitlistData,
        errors,
      } = await fetchUserBookings(userId);

      if (errors.bookingsError) {
        console.error("Error fetching bookings:", errors.bookingsError);
        setError("Nem sikerült betölteni a foglalásaidat.");
      } else {
        setBookings(bookingsData || []);
      }

      if (errors.waitlistError) {
        console.error("Error fetching waitlist:", errors.waitlistError);
      } else {
        setWaitlist(waitlistData || []);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      setError("Váratlan hiba történt az adatok betöltése során.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    if (!hasInitialData) {
      fetchBookingsData();
    }
  }, [userId, hasInitialData, fetchBookingsData]);

  const executeConfirmedAction = async () => {
    if (!confirmAction) return;

    try {
      setActionLoading(true);
      setError("");

      if (confirmAction.type === "cancelBooking") {
        const result = await cancelBookingAction(confirmAction.sessionId);
        if (!result.success) {
          throw new Error(result.error || "Nem sikerült lemondani a foglalást.");
        }
      } else if (confirmAction.type === "leaveWaitlist") {
        const result = await leaveWaitlistAction(confirmAction.sessionId);
        if (!result.success) {
          throw new Error(result.error || "Nem sikerült leiratkozni a várólistáról.");
        }
      }

      setConfirmAction(null);
      await fetchBookingsData();
    } catch (err) {
      console.error("Action error:", err);
      setError(err instanceof Error ? err.message : "Művelet sikertelen.");
      setConfirmAction(null);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div
        className="space-y-4 min-h-[60vh]"
        role="status"
        aria-live="polite"
        aria-label="Foglalások és várólisták betöltése"
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-32 rounded-2xl bg-stone-200/70 animate-pulse"
          />
        ))}
      </div>
    );
  }

  const hasBookings = bookings.length > 0;
  const hasWaitlist = waitlist.length > 0;

  const now = referenceTime;
  const upcomingBookings = bookings.filter(
    (booking) =>
      booking.class_sessions?.start_time &&
      new Date(booking.class_sessions.start_time) >= now
  );
  const pastBookings = bookings.filter(
    (booking) =>
      booking.class_sessions?.start_time &&
      new Date(booking.class_sessions.start_time) < now
  );

  if (!hasBookings && !hasWaitlist) {
    return (
      <div className="text-center py-14 px-4 bg-white rounded-2xl border border-stone-200/80 shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-warm-terracotta/10 text-warm-terracotta mx-auto mb-4 flex items-center justify-center">
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-stone-900 mb-1.5">
          Még nincs aktív foglalásod
        </h2>
        <p className="text-stone-600 text-sm mb-6 max-w-sm mx-auto leading-relaxed">
          Böngészd át heti órarendünket és foglald le a helyed a kedvenc csoportos óráidra!
        </p>
        <Link
          href="/calendar"
          prefetch={false}
          className="inline-flex items-center gap-2 bg-warm-terracotta hover:bg-warm-terracotta-hover text-white px-6 py-3 rounded-xl transition-colors text-sm font-semibold shadow-sm"
        >
          <span>Órarend Megtekintése</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Cancellation Policy Banner */}
      <div className="bg-stone-50/80 rounded-2xl border border-stone-200/90 p-4 sm:p-5 flex items-start gap-3.5">
        <div className="w-9 h-9 rounded-xl bg-warm-terracotta/10 text-warm-terracotta flex items-center justify-center shrink-0 mt-0.5">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="text-xs sm:text-sm leading-relaxed space-y-1">
          <h2 className="font-bold text-stone-900 text-sm">
            Lemondási Szabályzat
          </h2>
          <p className="text-stone-600">
            A lefoglalt óráidat díjmentesen lemondhatod legkésőbb <strong>az edzés kezdete előtt 2 órával</strong>. Az utolsó 2 órában a rendszer lezárja a lemondást, hogy a várólistán lévők időben értesülhessenek a felszabadult helyekről.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3">
          <svg
            className="w-5 h-5 text-rose-600 shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <p className="text-rose-800 text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Upcoming Bookings */}
      {upcomingBookings.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-stone-900">
              Közelgő Edzéseim ({upcomingBookings.length})
            </h2>
            <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full">
              Megerősítve
            </span>
          </div>

          <div className="space-y-4">
            {upcomingBookings.map((booking) => {
              const session = booking.class_sessions;
              const workout = session?.workout_classes;
              const instructor = session?.instructor;
              const instructorName = instructor
                ? instructor.full_name || instructor.username
                : "Nincs kijelölt oktató";
              const { date, time } = formatDateTime(session?.start_time || "");
              const cancelInfo = getCancellationInfo(session?.start_time, referenceTime);

              return (
                <div
                  key={booking.id}
                  className={`rounded-2xl p-4 sm:p-5 border transition-all shadow-xs ${
                    cancelInfo.canCancel
                      ? "bg-white border-stone-200 hover:border-warm-terracotta/40"
                      : "bg-stone-50/80 border-stone-200/70"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-stone-900 break-words text-base">
                          {workout?.title}
                        </h3>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                          Megerősítve
                        </span>
                      </div>
                      <p className="text-sm text-stone-600 mt-1 truncate">
                        Oktató: <span className="font-medium text-stone-800">{instructorName}</span>
                      </p>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs sm:text-sm text-stone-500">
                        <span className="inline-flex items-center gap-1.5 font-medium text-stone-700">
                          <svg className="w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {date}
                        </span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1.5 font-medium text-stone-700">
                          <svg className="w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {time}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Explicit Cancellation Policy status area */}
                  <div className="mt-4 pt-3 border-t border-stone-200/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    {cancelInfo.canCancel ? (
                      <div className="flex items-center gap-2 text-xs text-stone-600">
                        <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>
                          Lemondási határidő: <strong className="text-stone-800">{cancelInfo.deadlineFormatted}</strong>
                          <span className="text-stone-600 ml-1">(edzés előtt 2 órával)</span>
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-amber-900 bg-amber-50/90 px-3 py-1.5 rounded-xl border border-amber-200/80">
                        <svg className="w-4 h-4 text-amber-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span>
                          A lemondás lezárult (határidő: {cancelInfo.deadlineFormatted}).
                        </span>
                      </div>
                    )}

                    <div className="shrink-0 flex items-center justify-end">
                      {cancelInfo.canCancel && session ? (
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmAction({
                              type: "cancelBooking",
                              sessionId: session.id,
                              title: "Foglalás lemondása",
                              message: `Biztosan le szeretnéd mondani a(z) "${workout?.title}" edzésre szóló foglalásodat (${date}, ${time})?\n\nA határidő (${cancelInfo.deadlineFormatted}) előtti lemondás díjmentes.`,
                              confirmLabel: "Igen, lemondom a foglalást",
                            })
                          }
                          className="w-full sm:w-auto text-rose-700 hover:text-rose-800 hover:bg-rose-50 text-xs font-semibold px-3.5 py-2 rounded-xl border border-rose-300 transition-colors text-center"
                        >
                          Foglalás lemondása
                        </button>
                      ) : (
                        <span className="text-[11px] font-semibold text-stone-700 bg-stone-200/90 px-3 py-1.5 rounded-lg border border-stone-300">
                          Nem mondható le
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Waitlist */}
      {hasWaitlist && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-stone-900">
              Várólistás Jelentkezéseim ({waitlist.length})
            </h2>
            <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full">
              Felszabaduló helyre várva
            </span>
          </div>

          <div className="space-y-3">
            {waitlist.map((entry) => {
              const session = entry.class_sessions;
              const workout = session?.workout_classes;
              const instructor = session?.instructor;
              const instructorName = instructor
                ? instructor.full_name || instructor.username
                : "Nincs kijelölt oktató";
              const { date, time } = formatDateTime(session?.start_time || "");

              return (
                <div
                  key={entry.id}
                  className="bg-amber-50/50 rounded-2xl p-4 sm:p-5 border border-amber-200 hover:border-amber-300 transition-colors shadow-2xs"
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-stone-900 text-base">
                          {workout?.title}
                        </h3>
                        <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-0.5 rounded-full font-semibold">
                          #{entry.position}. a várólistán
                        </span>
                      </div>
                      <p className="text-sm text-stone-600 mt-1">
                        Oktató: <span className="font-medium text-stone-800">{instructorName}</span>
                      </p>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2.5 text-xs sm:text-sm text-stone-500">
                        <span className="font-medium text-stone-700">{date}</span>
                        <span>•</span>
                        <span className="font-medium text-stone-700">{time}</span>
                      </div>
                    </div>
                    <div className="sm:ml-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-amber-200/60 flex justify-end shrink-0">
                      {session && (
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmAction({
                              type: "leaveWaitlist",
                              sessionId: session.id,
                              title: "Leiratkozás a várólistáról",
                              message: `Biztosan le szeretnél iratkozni a(z) "${workout?.title}" várólistájáról?`,
                              confirmLabel: "Leiratkozom",
                              variant: "warning",
                            })
                          }
                          className="text-amber-800 hover:text-amber-900 text-sm font-semibold bg-amber-100/80 hover:bg-amber-100 px-3.5 py-1.5 rounded-xl transition-colors"
                        >
                          Leiratkozás
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Past Bookings */}
      {pastBookings.length > 0 && (
        <div className="pt-4 border-t border-stone-200/80">
          <h2 className="text-base font-bold text-stone-700 mb-4">
            Korábbi Edzéseim ({pastBookings.length})
          </h2>
          <div className="space-y-2.5">
            {pastBookings.map((booking) => {
              const session = booking.class_sessions;
              const workout = session?.workout_classes;
              const instructor = session?.instructor;
              const instructorName = instructor
                ? instructor.full_name || instructor.username
                : "Nincs kijelölt oktató";
              const { date, time } = formatDateTime(session?.start_time || "");

              return (
                <div
                  key={booking.id}
                  className="bg-stone-100/70 rounded-xl p-3.5 sm:p-4 border border-stone-200"
                >
                  <div className="flex justify-between items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-stone-800 text-sm truncate">
                        {workout?.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-stone-700 font-medium">
                        <span>{instructorName}</span>
                        <span>•</span>
                        <span>{date} {time}</span>
                      </div>
                    </div>
                    <div className="shrink-0">
                      <span className="text-xs text-stone-700 bg-stone-200/90 px-2 py-0.5 rounded font-medium">
                        Teljesítve
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {confirmAction && (
        <ConfirmModal
          isOpen={!!confirmAction}
          title={confirmAction.title}
          message={confirmAction.message}
          confirmLabel={confirmAction.confirmLabel}
          variant={confirmAction.variant || "danger"}
          loading={actionLoading}
          onConfirm={executeConfirmedAction}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}
