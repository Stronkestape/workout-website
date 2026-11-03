'use client';

import { formatDate, formatTime } from '@/utils/calendarHelpers';
import UserSearchSelect from './UserSearchSelect';

export default function SessionAttendeePanel({
  selectedSession,
  bookings,
  waitlist,
  error,
  selectedUserToBook,
  onSelectUserToBook,
  bookingLoading,
  searchResetKey,
  onManualBookUser,
  onPromptRemoveBooking,
}) {
  if (!selectedSession) {
    return (
      <div className="bg-white rounded-2xl shadow-xs border border-stone-200/80 p-12 text-center">
        <h3 className="text-xl font-bold text-stone-900 mb-2">
          Select a Session
        </h3>
        <p className="text-stone-600 text-sm">
          Choose a session from the list on the left to view participants and manage attendees.
        </p>
      </div>
    );
  }

  const bookedUserIds = bookings
    .map((b) => b.user_profiles?.id)
    .filter(Boolean);

  const spotsLeft =
    selectedSession.workout_classes.max_capacity -
    (selectedSession.current_bookings || 0);
  const isSessionFull = spotsLeft <= 0;

  return (
    <div className="space-y-6">
      <div className="bg-stone-900 text-white rounded-2xl shadow-md p-6">
        <h3 className="text-2xl font-bold mb-4">
          {selectedSession.workout_classes.title}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <div className="text-stone-400 text-xs uppercase tracking-wider font-semibold">
              Date
            </div>
            <div className="font-semibold text-stone-100 mt-0.5">
              {formatDate(selectedSession.start_time)}
            </div>
          </div>
          <div>
            <div className="text-stone-400 text-xs uppercase tracking-wider font-semibold">
              Time
            </div>
            <div className="font-semibold text-stone-100 mt-0.5">
              {formatTime(selectedSession.start_time)} –{' '}
              {formatTime(selectedSession.end_time)}
            </div>
          </div>
          <div>
            <div className="text-stone-400 text-xs uppercase tracking-wider font-semibold">
              Coach
            </div>
            <div className="font-semibold text-stone-100 mt-0.5 truncate">
              {selectedSession.instructor
                ? selectedSession.instructor.full_name ||
                  selectedSession.instructor.username
                : 'Unassigned'}
            </div>
          </div>
          <div>
            <div className="text-stone-400 text-xs uppercase tracking-wider font-semibold">
              Capacity
            </div>
            <div className="font-semibold text-stone-100 mt-0.5">
              {selectedSession.current_bookings || 0} /{' '}
              {selectedSession.workout_classes.max_capacity}
            </div>
          </div>
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

      {/* Manual Booking Section */}
      <div className="bg-white rounded-2xl shadow-xs p-5 sm:p-6 border border-stone-200/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h4 className="text-base sm:text-lg font-bold text-stone-900">
              Add Participant
            </h4>
            <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
              Manually register a member for this workout session.
            </p>
          </div>
          <span
            className={`self-start sm:self-auto px-3 py-1 rounded-full text-xs font-semibold ${
              isSessionFull
                ? 'bg-rose-100 text-rose-800'
                : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {isSessionFull ? 'Class Full' : `${spotsLeft} spots available`}
          </span>
        </div>

        {isSessionFull ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs sm:text-sm text-amber-800 flex items-center gap-2.5">
            <svg
              className="w-4 h-4 text-amber-600 shrink-0"
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
            <span>
              This session has reached maximum capacity. No additional participants can be added.
            </span>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-start">
              <div className="flex-1">
                <UserSearchSelect
                  onUserSelect={onSelectUserToBook}
                  excludeUserIds={bookedUserIds}
                  placeholder="Search member by name or @username..."
                  disabled={bookingLoading}
                  resetKey={searchResetKey}
                />
              </div>
              <button
                type="button"
                onClick={onManualBookUser}
                disabled={!selectedUserToBook || bookingLoading}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-warm-terracotta hover:bg-warm-terracotta-hover disabled:bg-stone-300 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-medium rounded-xl shadow-xs transition-colors shrink-0"
              >
                {bookingLoading ? (
                  <>
                    <svg
                      className="animate-spin w-4 h-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Registering...</span>
                  </>
                ) : (
                  <>
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
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                    <span>Add Participant</span>
                  </>
                )}
              </button>
            </div>
            {selectedUserToBook && (
              <p className="text-xs text-stone-600">
                Selected:{' '}
                <strong className="text-stone-900 font-semibold">
                  {selectedUserToBook.full_name ||
                    `@${selectedUserToBook.username}`}
                </strong>{' '}
                (@{selectedUserToBook.username})
              </p>
            )}
          </div>
        )}
      </div>

      {/* Confirmed Bookings */}
      <div className="bg-white rounded-2xl shadow-xs p-5 sm:p-6 border border-stone-200/80 overflow-hidden">
        <div className="flex justify-between items-center mb-4 gap-2">
          <h4 className="text-base sm:text-lg font-bold text-stone-900">
            Confirmed Bookings ({bookings.length})
          </h4>
          {bookings.length === 0 && (
            <span className="text-xs sm:text-sm text-stone-500">
              No bookings yet
            </span>
          )}
        </div>

        {bookings.length > 0 ? (
          <div className="space-y-2.5">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-stone-50 rounded-xl hover:bg-stone-100/80 transition-colors border border-stone-200/60"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 bg-warm-terracotta rounded-full flex items-center justify-center text-white font-bold shrink-0">
                    {booking.user_profiles?.username
                      ?.charAt(0)
                      .toUpperCase() || 'U'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-stone-900 truncate">
                      {booking.user_profiles?.username || 'Unknown'}
                    </div>
                    {booking.user_profiles?.full_name && (
                      <div className="text-xs text-stone-600 truncate">
                        {booking.user_profiles.full_name}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-stone-200/70 shrink-0">
                  <div className="text-xs text-stone-500 sm:text-right">
                    <span className="sm:block text-stone-400">Booked on</span>
                    <span className="font-medium text-stone-700">
                      {formatDate(booking.booked_at)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onPromptRemoveBooking(booking)}
                    className="bg-rose-50 text-rose-700 hover:bg-rose-100 px-3.5 py-1.5 rounded-lg transition-colors font-semibold text-xs sm:text-sm shrink-0"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-stone-500 text-sm">
            <p>No confirmed bookings for this session</p>
          </div>
        )}
      </div>

      {/* Waitlist */}
      {waitlist.length > 0 && (
        <div className="bg-white rounded-2xl shadow-xs p-5 sm:p-6 border border-stone-200/80 overflow-hidden">
          <h4 className="text-base sm:text-lg font-bold text-stone-900 mb-4">
            Waitlist ({waitlist.length})
          </h4>
          <div className="space-y-2">
            {waitlist.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-amber-50/80 rounded-xl border border-amber-200/70"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {entry.position}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-stone-900 truncate">
                      {entry.user_profiles?.username || 'Unknown'}
                    </div>
                    {entry.user_profiles?.full_name && (
                      <div className="text-xs text-stone-600 truncate">
                        {entry.user_profiles.full_name}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-xs text-stone-500 shrink-0 pl-11 sm:pl-0">
                  Joined {formatDate(entry.joined_at)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Session Statistics */}
      <div className="bg-white rounded-2xl shadow-xs p-5 sm:p-6 border border-stone-200/80">
        <h4 className="text-base sm:text-lg font-bold text-stone-900 mb-4">
          Session Statistics
        </h4>
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="text-center p-3 sm:p-4 bg-stone-100 rounded-xl">
            <div className="text-xl sm:text-2xl font-bold text-stone-900">
              {bookings.length}
            </div>
            <div className="text-xs text-stone-600 mt-1 font-medium">
              Confirmed
            </div>
          </div>
          <div className="text-center p-3 sm:p-4 bg-amber-50 rounded-xl">
            <div className="text-xl sm:text-2xl font-bold text-amber-700">
              {waitlist.length}
            </div>
            <div className="text-xs text-amber-800 mt-1 font-medium">
              Waitlist
            </div>
          </div>
          <div className="text-center p-3 sm:p-4 bg-emerald-50 rounded-xl">
            <div className="text-xl sm:text-2xl font-bold text-emerald-700">
              {Math.max(0, spotsLeft)}
            </div>
            <div className="text-xs text-emerald-800 mt-1 font-medium">
              Available
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
