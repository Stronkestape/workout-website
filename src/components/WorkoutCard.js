"use client";

import Link from "next/link";
import {
  formatTime,
  formatDate,
  getCancellationInfo,
} from "@/utils/calendarHelpers";
import {
  SPOTS_ALMOST_FULL_THRESHOLD,
  SPOTS_FULL_THRESHOLD,
} from "@/utils/constants";
import { useWorkoutBooking } from "@/hooks/useWorkoutBooking";

export default function WorkoutCard({
  workout,
  user,
  onClose,
  onBookingChange,
}) {
  const {
    loading,
    userBooking,
    isOnWaitlist,
    waitlistPosition,
    error,
    handleBookWorkout,
    handleCancelBooking,
    handleLeaveWaitlist,
  } = useWorkoutBooking(workout, user, onBookingChange);

  if (!workout) return null;

  const spotsLeft = workout.resource.spotsLeft;
  const isAlmostFull =
    spotsLeft <= SPOTS_ALMOST_FULL_THRESHOLD &&
    spotsLeft > SPOTS_FULL_THRESHOLD;
  const isFull = spotsLeft <= SPOTS_FULL_THRESHOLD;

  const isBooked = !!userBooking;
  const cancelInfo = getCancellationInfo(workout.start);
  const canCancel = isBooked && cancelInfo.canCancel;

  // Extract workout title and instructor from the event title
  const workoutTitle = workout.title?.split(" - ")[0] || "Workout Class";
  const instructorName = workout.resource?.instructorName || "Nincs megadva";

  return (
    <div
      className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-stone-200/80 shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b border-stone-200/80">
          <div className="flex-1 min-w-0 pr-3">
            <h3 className="text-xl font-bold text-stone-900 mb-1 truncate">
              {workoutTitle}
            </h3>
            <p className="text-stone-600 text-sm">Oktató: <strong className="text-stone-800">{instructorName}</strong></p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg transition-colors leading-none"
            aria-label="Ablak bezárása"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Date and Time */}
          <div className="bg-stone-50 rounded-xl p-4 border border-stone-200/70">
            <div className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1">
              Időpont
            </div>
            <div className="font-bold text-stone-900">
              {formatDate(workout.start)}
            </div>
            <div className="text-stone-600 text-sm mt-0.5">
              {formatTime(workout.start)} - {formatTime(workout.end)}
            </div>
          </div>

          {/* Capacity Status */}
          <div className="flex items-center justify-between py-1">
            <span className="text-sm font-semibold text-stone-700">Férőhelyek</span>
            <div className="text-right">
              <div
                className={`font-bold text-sm ${
                  isFull
                    ? "text-rose-600"
                    : isAlmostFull
                    ? "text-amber-600"
                    : "text-emerald-600"
                }`}
              >
                {spotsLeft > SPOTS_FULL_THRESHOLD
                  ? `${spotsLeft} szabad hely`
                  : "Betelt"}
              </div>
              <div className="text-xs text-stone-500 mt-0.5">
                {workout.resource?.maxCapacity - spotsLeft}/
                {workout.resource?.maxCapacity} foglalva
              </div>
            </div>
          </div>

          {/* User Status */}
          {user && (isBooked || isOnWaitlist) && (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5">
              {isBooked && (
                <div className="flex items-center text-emerald-900 text-sm font-semibold gap-2">
                  <svg
                    className="w-5 h-5 text-emerald-600 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>Sikeresen feljelentkeztél erre az órára</span>
                </div>
              )}
              {isOnWaitlist && (
                <div className="flex items-center text-amber-900 text-sm font-semibold gap-2">
                  <svg
                    className="w-5 h-5 text-amber-600 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>Várólistán vagy ({waitlistPosition}. pozíció)</span>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-rose-800 text-sm font-medium">
              {error}
            </div>
          )}

          {/* Action Buttons & Cancellation Policy Feedback */}
          <div className="pt-2">
            {!user ? (
              <div className="text-center pt-2">
                <p className="text-stone-600 text-sm mb-3">
                  Jelentkezz be a foglaláshoz!
                </p>
                <Link
                  href="/login"
                  className="w-full bg-warm-terracotta text-white py-2.5 px-4 rounded-xl hover:bg-warm-terracotta/90 transition-colors font-semibold inline-block text-center shadow-xs text-sm"
                >
                  Bejelentkezés
                </Link>
              </div>
            ) : isBooked ? (
              <div className="space-y-3">
                {canCancel ? (
                  <>
                    <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-3.5 text-xs text-stone-600 flex items-start gap-2.5">
                      <svg
                        className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <div>
                        <span className="font-bold text-stone-800 block text-xs">
                          Lemondási határidő: {cancelInfo.deadlineFormatted}
                        </span>
                        <span className="text-stone-500 text-[11px] leading-relaxed">
                          A kezdés előtti 2 órán belül a lemondási lehetőség automatikusan lezárul.
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCancelBooking}
                      disabled={loading}
                      className="w-full bg-rose-600 text-white py-2.5 px-4 rounded-xl hover:bg-rose-700 disabled:bg-stone-300 disabled:cursor-not-allowed transition-colors font-semibold text-sm shadow-xs flex items-center justify-center gap-2"
                    >
                      {loading && (
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      )}
                      <span>{loading ? "Lemondás folyamatban..." : "Jelentkezés lemondása"}</span>
                    </button>
                  </>
                ) : (
                  <div className="p-3.5 bg-amber-50/80 rounded-xl border border-amber-200/90 text-xs text-amber-950 flex items-start gap-2.5">
                    <svg
                      className="w-4 h-4 text-amber-700 shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                    <div>
                      <span className="font-bold block text-amber-950 mb-0.5">
                        A lemondási határidő lezárult
                      </span>
                      <span className="text-amber-900 leading-relaxed text-[11px]">
                        Ez az edzés a kezdés előtti 2 órán belül van ({cancelInfo.deadlineFormatted}), ezért már nem lemondható.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : isOnWaitlist ? (
              <button
                type="button"
                onClick={handleLeaveWaitlist}
                disabled={loading}
                className="w-full bg-amber-600 text-white py-2.5 px-4 rounded-xl hover:bg-amber-700 disabled:bg-stone-300 disabled:cursor-not-allowed transition-colors font-semibold text-sm shadow-xs flex items-center justify-center gap-2"
              >
                {loading && (
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                )}
                <span>{loading ? "Leiratkozás..." : "Várólista elhagyása"}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleBookWorkout}
                disabled={loading}
                className={`w-full py-2.5 px-4 rounded-xl font-semibold transition-colors disabled:bg-stone-300 disabled:cursor-not-allowed shadow-xs text-sm flex items-center justify-center gap-2 ${
                  isFull
                    ? "bg-amber-600 text-white hover:bg-amber-700"
                    : "bg-warm-terracotta text-white hover:bg-warm-terracotta/90"
                }`}
              >
                {loading && (
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                )}
                <span>
                  {loading
                    ? isFull
                      ? "Feliratkozás a várólistára..."
                      : "Foglalás folyamatban..."
                    : isFull
                    ? "Feliratkozás a várólistára"
                    : "Jelentkezés az edzésre"}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
