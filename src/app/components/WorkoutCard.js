"use client";

import Link from "next/link";
import {
  formatTime,
  formatDate,
  canCancelBooking,
} from "@/utils/calendarHelpers";
import {
  SPOTS_ALMOST_FULL_THRESHOLD,
  SPOTS_FULL_THRESHOLD,
} from "@/utils/constans";
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
  const canCancel = userBooking && canCancelBooking(workout.start);

  // Extract workout title and instructor from the event title
  const workoutTitle = workout.title?.split(" - ")[0] || "Workout Class";
  const instructorName = workout.resource?.instructorName || "TBA";

  return (
    <div className="fixed inset-0 flex items-center justify-center z-30 p-4">
      <div className="bg-white bg-opacity-95 rounded-xl border-1 shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-1">
              {workoutTitle}
            </h3>
            <p className="text-gray-600">
              with {instructorName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold p-1"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Date and Time */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Date & Time</div>
            <div className="font-semibold">{formatDate(workout.start)}</div>
            <div className="text-gray-700">
              {formatTime(workout.start)} - {formatTime(workout.end)}
            </div>
          </div>

          {/* Capacity Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Capacity</span>
            <div className="text-right">
              <div
                className={`font-semibold ${
                  isFull
                    ? "text-red-600"
                    : isAlmostFull
                    ? "text-orange-600"
                    : "text-green-600"
                }`}
              >
                {spotsLeft > SPOTS_FULL_THRESHOLD
                  ? `${spotsLeft} spots left`
                  : "Full"}
              </div>
              <div className="text-xs text-gray-500">
                {workout.resource?.maxCapacity - spotsLeft}/
                {workout.resource?.maxCapacity}
              </div>
            </div>
          </div>

          {/* User Status */}
          {user && (userBooking || isOnWaitlist) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              {userBooking && (
                <div className="flex items-center text-blue-800">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-medium"> 
                    You are booked for this class
                  </span>
                </div>
              )}
              {isOnWaitlist && (
                <div className="flex items-center text-blue-800">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-medium">
                    You are on the waitlist (Position: {waitlistPosition})
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="text-red-800 text-sm">{error}</div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2 pt-4">
            {!user ? (
              /* Not logged in */
              <div className="text-center">
                <p className="text-gray-600 mb-3">
                  Sign in to book this workout
                </p>
                <Link
                  href="/login"
                  className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors font-medium inline-block text-center"
                >
                  Sign In
                </Link>
              </div>
            ) : userBooking ? (
              /* User has booking */
              <div>
                {canCancel ? (
                  <button
                    onClick={handleCancelBooking}
                    disabled={loading}
                    className="w-full bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {loading ? "Cancelling..." : "Cancel Booking"}
                  </button>
                ) : (
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                      You can only cancel bookings at least 2 hours before the
                      workout
                    </p>
                  </div>
                )}
              </div>
            ) : isOnWaitlist ? (
              /* User on waitlist */
              <button
                onClick={handleLeaveWaitlist}
                disabled={loading}
                className="w-full bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {loading ? "Leaving..." : "Leave Waitlist"}
              </button>
            ) : (
              /* User can book or join waitlist */
              <button
                onClick={handleBookWorkout}
                disabled={loading}
                className={`w-full py-2 px-4 rounded-lg font-medium transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed ${
                  isFull
                    ? "bg-orange-500 text-white hover:bg-orange-600"
                    : "bg-green-500 text-white hover:bg-green-600"
                }`}
              >
                {loading
                  ? isFull
                    ? "Joining Waitlist..."
                    : "Booking..."
                  : isFull
                  ? "Join Waitlist"
                  : "Book This Class"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}