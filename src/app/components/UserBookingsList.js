"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDateTime, canCancelBooking } from "@/utils/calendarHelpers";
import { fetchUserBookings, cancelBooking, leaveWaitlist } from "@/utils/supabaseQueries";

export default function UserBookingsList({ userId }) {
  const [bookings, setBookings] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) {
      return;
    }
    const fetchBookingsData = async () => {
    try {
      setLoading(true);

      const { bookings: bookingsData, waitlist: waitlistData, errors } = await fetchUserBookings(userId);

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
  };
    fetchBookingsData();
  }, [userId]);

  

  const handleCancelBooking = async (bookingId, sessionId) => {
    if (!confirm("Are you sure you want to cancel this booking?")) {
      return;
    }

    try {
      const { error } = await cancelBooking(userId, sessionId);

      if (error) {
        console.error("Error cancelling booking:", error);
        alert("Failed to cancel booking");
        return;
      }

      // Refresh bookings
      fetchBookingsData();
    } catch (err) {
      console.error("Unexpected error:", err);
      alert("An unexpected error occurred");
    }
  };

  const handleLeaveWaitlist = async (waitlistId, sessionId) => {
    if (!confirm("Are you sure you want to leave the waitlist?")) {
      return;
    }

    try {
      const { error } = await leaveWaitlist(userId, sessionId);

      if (error) {
        console.error("Error leaving waitlist:", error);
        alert("Failed to leave waitlist");
        return;
      }

      // Refresh waitlist
      fetchBookingsData();
    } catch (err) {
      console.error("Unexpected error:", err);
      alert("An unexpected error occurred");
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-600">Loading bookings...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  const hasBookings = bookings.length > 0;
  const hasWaitlist = waitlist.length > 0;

  if (!hasBookings && !hasWaitlist) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <svg
            className="w-16 h-16 mx-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <p className="text-gray-600 mb-4">No upcoming bookings</p>
        <Link
          href="/calendar"
          className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Browse Workouts
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Confirmed Bookings */}
      {hasBookings && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Upcoming Workouts ({bookings.length})
          </h3>
          <div className="space-y-3">
            {bookings.map((booking) => {
              const session = booking.class_sessions;
              const workout = session?.workout_classes;
              const { date, time } = formatDateTime(session?.start_time);
              const canCancel = canCancelBooking(session?.start_time);

              return (
                <div
                  key={booking.id}
                  className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-blue-300 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">
                        {workout?.title}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        with {workout?.instructor}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          {date}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          {time}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      {canCancel ? (
                        <button
                          onClick={() =>
                            handleCancelBooking(booking.id, session.id)
                          }
                          className="text-red-600 hover:text-red-700 text-sm font-medium"
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
                        with {workout?.instructor}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span>{date}</span>
                        <span>{time}</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <button
                        onClick={() => handleLeaveWaitlist(entry.id, session.id)}
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
    </div>
  );
};
              