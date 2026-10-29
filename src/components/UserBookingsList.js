"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { formatDateTime, canCancelBooking } from "@/utils/calendarHelpers";
import {
  fetchUserBookings,
  cancelBooking,
  leaveWaitlist,
} from "@/utils/supabaseQueries";
import ConfirmModal from "@/components/ConfirmModal";

export default function UserBookingsList({ userId }) {
  const [bookings, setBookings] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmAction, setConfirmAction] = useState(null);

  const fetchBookingsData = useCallback(async () => {
    try {
      setLoading(true);

      const {
        bookings: bookingsData,
        waitlist: waitlistData,
        errors,
      } = await fetchUserBookings(userId);

      if (errors.bookingsError) {
        console.error("Error fetching bookings:", errors.bookingsError);
        setError("Failed to load bookings");
      } else {
        setBookings(bookingsData);
      }

      if (errors.waitlistError) {
        console.error("Error fetching waitlist:", errors.waitlistError);
      } else {
        setWaitlist(waitlistData);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    fetchBookingsData();
  }, [userId, fetchBookingsData]);

  const executeConfirmedAction = async () => {
    if (!confirmAction) return;

    try {
      setActionLoading(true);
      setError("");

      if (confirmAction.type === "cancelBooking") {
        const { error: cancelErr } = await cancelBooking(
          userId,
          confirmAction.sessionId
        );
        if (cancelErr) throw cancelErr;
      } else if (confirmAction.type === "leaveWaitlist") {
        const { error: leaveErr } = await leaveWaitlist(
          userId,
          confirmAction.sessionId
        );
        if (leaveErr) throw leaveErr;
      }

      setConfirmAction(null);
      await fetchBookingsData();
    } catch (err) {
      console.error("Action error:", err);
      setError(err.message || "Failed to update booking");
      setConfirmAction(null);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-600">Loading bookings...</div>
      </div>
    );
  }

  const hasBookings = bookings.length > 0;
  const hasWaitlist = waitlist.length > 0;

  const now = new Date();
  const upcomingBookings = bookings.filter(
    (booking) => new Date(booking.class_sessions?.start_time) >= now
  );
  const pastBookings = bookings.filter(
    (booking) => new Date(booking.class_sessions?.start_time) < now
  );

  if (!hasBookings && !hasWaitlist) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 mx-auto mb-4 flex items-center justify-center">
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <p className="text-gray-600 mb-4">No bookings yet</p>
        <Link
          href="/calendar"
          className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          Browse Workouts
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Upcoming Bookings */}
      {upcomingBookings.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Upcoming Workouts ({upcomingBookings.length})
          </h3>
          <div className="space-y-3">
            {upcomingBookings.map((booking) => {
              const session = booking.class_sessions;
              const workout = session?.workout_classes;
              const instructor = session?.instructor;
              const instructorName = instructor
                ? instructor.full_name || instructor.username
                : "TBA";
              const { date, time } = formatDateTime(session?.start_time);
              const canCancel = canCancelBooking(session?.start_time);

              return (
                <div
                  key={booking.id}
                  className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-blue-300 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 break-words">
                        {workout?.title}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1 truncate">
                        with {instructorName}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs sm:text-sm text-gray-500">
                        <span>{date}</span>
                        <span>•</span>
                        <span>{time}</span>
                      </div>
                    </div>
                    <div className="sm:ml-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-200/70 flex justify-end shrink-0">
                      {canCancel ? (
                        <button
                          onClick={() =>
                            setConfirmAction({
                              type: "cancelBooking",
                              sessionId: session.id,
                              title: "Cancel Booking",
                              message: `Are you sure you want to cancel your booking for "${workout?.title}" on ${date} at ${time}?`,
                              confirmLabel: "Cancel Booking",
                            })
                          }
                          className="text-red-600 hover:text-red-700 text-sm font-medium bg-red-50 sm:bg-transparent px-3 py-1.5 sm:p-0 rounded-md"
                        >
                          Cancel
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">
                          Cannot cancel
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

      {/* Past Bookings */}
      {pastBookings.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Past Workouts ({pastBookings.length})
          </h3>
          <div className="space-y-3">
            {pastBookings.map((booking) => {
              const session = booking.class_sessions;
              const workout = session?.workout_classes;
              const instructor = session?.instructor;
              const instructorName = instructor
                ? instructor.full_name || instructor.username
                : "TBA";
              const { date, time } = formatDateTime(session?.start_time);

              return (
                <div
                  key={booking.id}
                  className="bg-gray-100 rounded-lg p-4 border border-gray-300 opacity-75"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-700">
                        {workout?.title}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        with {instructorName}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span>{date}</span>
                        <span>•</span>
                        <span>{time}</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <span className="text-xs text-gray-500">Completed</span>
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
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Waitlist ({waitlist.length})
          </h3>
          <div className="space-y-3">
            {waitlist.map((entry) => {
              const session = entry.class_sessions;
              const workout = session?.workout_classes;
              const instructor = session?.instructor;
              const instructorName = instructor
                ? instructor.full_name || instructor.username
                : "TBA";
              const { date, time } = formatDateTime(session?.start_time);

              return (
                <div
                  key={entry.id}
                  className="bg-orange-50 rounded-lg p-4 border border-orange-200"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-900">
                          {workout?.title}
                        </h4>
                        <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full font-medium">
                          Position {entry.position}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        with {instructorName}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span>{date}</span>
                        <span>•</span>
                        <span>{time}</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <button
                        onClick={() =>
                          setConfirmAction({
                            type: "leaveWaitlist",
                            sessionId: session.id,
                            title: "Leave Waitlist",
                            message: `Are you sure you want to leave the waitlist for "${workout?.title}"?`,
                            confirmLabel: "Leave Waitlist",
                            variant: "warning",
                          })
                        }
                        className="text-orange-600 hover:text-orange-700 text-sm font-medium"
                      >
                        Leave
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmAction}
        title={confirmAction?.title}
        message={confirmAction?.message}
        confirmLabel={confirmAction?.confirmLabel}
        variant={confirmAction?.variant || "danger"}
        loading={actionLoading}
        onConfirm={executeConfirmedAction}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
