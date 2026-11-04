"use client";

import Link from "next/link";
import {
  formatTime,
  formatDate,
  getCancellationInfo,
  canBookWorkout,
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

  const spotsLeft = workout.resource?.spotsLeft ?? 0;
  const maxCapacity = workout.resource?.maxCapacity ?? 0;
  const isAlmostFull =
    spotsLeft <= SPOTS_ALMOST_FULL_THRESHOLD &&
    spotsLeft > SPOTS_FULL_THRESHOLD;
  const isFull = spotsLeft <= SPOTS_FULL_THRESHOLD;

  const isBooked = !!userBooking;
  const cancelInfo = getCancellationInfo(workout.start);
  const canCancel = isBooked && cancelInfo.canCancel;
  const canBook = canBookWorkout(workout.start);

  const workoutTitle = workout.title?.split(" - ")[0] || "Csoportos Edzés";
  const instructorName = workout.resource?.instructorName || "Nincs kijelölve";

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
            <p className="text-stone-600 text-sm">
              Oktató: <strong className="text-stone-800">{instructorName}</strong>
            </p>
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
            <div className="text-xs font-semibold uppercase tracking-wider text-stone-600 font-medium mb-1">
              Időpont & Időtartam
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
                  : "Megtelt"}
              </div>
              <div className="text-xs text-stone-600 font-medium mt-0.5">
                {maxCapacity - spotsLeft} / {maxCapacity} lefoglalva
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
                  <span>Már lefoglaltad ezt az órát!</span>
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
                  <span>Feliratkoztál a várólistára (#{waitlistPosition}. hely)</span>
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
                  Jelentkezz be az edzés lefoglalásához!
                </p>
                <Link
                  href="/login"
                  className="w-full bg-warm-terracotta text-white py-3 px-4 rounded-xl hover:bg-warm-terracotta/90 transition-colors font-semibold inline-block text-center shadow-sm text-sm"
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
                        <span className="text-stone-600 font-medium text-[11px] leading-relaxed">
                          A díjmentes lemondás az edzés kezdete előtt 2 órával zárul.
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCancelBooking}
                      disabled={loading}
                      className="w-full bg-rose-600 text-white py-3 px-4 rounded-xl hover:bg-rose-700 disabled:bg-stone-300 disabled:cursor-not-allowed transition-colors font-semibold text-sm shadow-sm flex items-center justify-center gap-2"
                    >
                      {loading && (
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      )}
                      <span>{loading ? "Lemondás folyamatban..." : "Foglalás lemondása"}</span>
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
                        A lemondási határidő lejárt
                      </span>
                      <span className="text-amber-900 leading-relaxed text-[11px]">
                        Az edzés kevesebb mint 2 órán belül kezdődik ({cancelInfo.deadlineFormatted}), ezért már nem mondható le díjmentesen.
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
                className="w-full bg-amber-600 text-white py-3 px-4 rounded-xl hover:bg-amber-700 disabled:bg-stone-300 disabled:cursor-not-allowed transition-colors font-semibold text-sm shadow-sm flex items-center justify-center gap-2"
              >
                {loading && (
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                )}
                <span>{loading ? "Leiratkozás folyamatban..." : "Leiratkozás a várólistáról"}</span>
              </button>
            ) : !canBook ? (
              <div className="space-y-3">
                <div className="p-3.5 bg-stone-100 rounded-xl border border-stone-200 text-xs text-stone-700 flex items-start gap-2.5">
                  <svg
                    className="w-4 h-4 text-stone-500 shrink-0 mt-0.5"
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
                    <span className="font-bold block text-stone-800 mb-0.5">
                      A foglalás lezárult
                    </span>
                    <span className="text-stone-600 leading-relaxed text-[11px]">
                      A helyfoglalás és a várólistára jelentkezés az edzés kezdete előtt 30 perccel lezárul.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  disabled
                  className="w-full py-3 px-4 rounded-xl font-semibold bg-stone-200 text-stone-500 cursor-not-allowed shadow-none text-sm flex items-center justify-center gap-2"
                >
                  <span>Foglalás Lezárva</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleBookWorkout}
                disabled={loading}
                className={`w-full py-3 px-4 rounded-xl font-semibold transition-all disabled:bg-stone-300 disabled:cursor-not-allowed shadow-sm text-sm flex items-center justify-center gap-2 ${
                  isFull
                    ? "bg-amber-600 text-white hover:bg-amber-700 active:scale-[0.99]"
                    : "bg-warm-terracotta text-white hover:bg-warm-terracotta/90 active:scale-[0.99]"
                }`}
              >
                {loading && (
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                )}
                <span>
                  {loading
                    ? isFull
                      ? "Jelentkezés várólistára..."
                      : "Foglalás folyamatban..."
                    : isFull
                    ? "Jelentkezés várólistára"
                    : "Edzés lefoglalása"}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
