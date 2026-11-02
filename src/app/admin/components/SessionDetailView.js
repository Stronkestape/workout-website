'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  fetchAllSessions,
  getSessionBookings,
  getSessionWaitlist,
  adminBookUser,
} from '@/utils/adminQueries';
import { adminRemoveParticipantAction } from '../actions';
import { formatDate, formatTime } from '@/utils/calendarHelpers';
import { useToast } from '@/context/ToastContext';
import UserSearchSelect from './UserSearchSelect';

const ConfirmModal = dynamic(() => import('@/components/ConfirmModal'), { ssr: false });

export default function SessionDetailView({ currentUser }) {
  const isInstructor = currentUser?.profile?.user_tier === 'instructor';
  const toast = useToast();
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [bookingToRemove, setBookingToRemove] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedUserToBook, setSelectedUserToBook] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [searchResetKey, setSearchResetKey] = useState(0);

  useEffect(() => {
    if (currentUser?.id) {
      loadSessions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, isInstructor]);

  const selectedSessionId = selectedSession?.id;
  useEffect(() => {
    if (selectedSessionId) {
      loadSessionDetails(selectedSessionId);
      setSelectedUserToBook(null);
      setSearchResetKey((k) => k + 1);
    }
  }, [selectedSessionId]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const { data, error } = await fetchAllSessions(
        isInstructor ? currentUser?.id : null
      );

      if (error) throw error;

      const allSessions = data || [];
      setSessions(
        isInstructor
          ? allSessions.filter((s) => s.instructor_id === currentUser?.id)
          : allSessions
      );
    } catch (err) {
      console.error('Error loading sessions:', err);
      setError('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const loadSessionDetails = async (sessionId) => {
    try {
      setLoading(true);
      setError('');

      const [bookingsResult, waitlistResult] = await Promise.all([
        getSessionBookings(sessionId),
        getSessionWaitlist(sessionId),
      ]);

      if (bookingsResult.error) throw bookingsResult.error;
      if (waitlistResult.error) throw waitlistResult.error;

      const nextBookings = bookingsResult.data || [];
      setBookings(nextBookings);
      setWaitlist(waitlistResult.data || []);
      return nextBookings.length;
    } catch (err) {
      console.error('Error loading session details:', err);
      setError('Failed to load session details');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const confirmRemoveBooking = async () => {
    if (!bookingToRemove || !selectedSession) return;

    try {
      setRemoving(true);
      setError('');
      const result = await adminRemoveParticipantAction(bookingToRemove.id);

      if (!result.success) {
        throw new Error(result.error);
      }

      const updatedCount = await loadSessionDetails(selectedSession.id);
      await loadSessions();

      setSelectedSession({
        ...selectedSession,
        current_bookings:
          typeof updatedCount === 'number'
            ? updatedCount
            : Math.max(0, (selectedSession.current_bookings || 1) - 1),
      });
      const userName = bookingToRemove.user_profiles?.username || 'participant';
      toast.success(
        `@${userName} successfully removed and notified via email!`,
        'Participant Removed'
      );
      setBookingToRemove(null);
    } catch (err) {
      console.error('Error removing booking:', err);
      const errMsg = err.message || 'Failed to remove participant.';
      setError(errMsg);
      toast.error(errMsg, 'Removal Error');
      setBookingToRemove(null);
    } finally {
      setRemoving(false);
    }
  };

  const handleManualBookUser = async () => {
    if (!selectedSession || !selectedUserToBook) return;

    const spotsRemaining =
      selectedSession.workout_classes.max_capacity -
      (selectedSession.current_bookings || 0);

    if (spotsRemaining <= 0) {
      toast.error(
        'This session is full, no additional participants can be added.',
        'Session Full'
      );
      return;
    }

    try {
      setBookingLoading(true);
      setError('');

      const { error } = await adminBookUser(
        selectedUserToBook.id,
        selectedSession.id
      );

      if (error) throw error;

      const userDisplay = selectedUserToBook.full_name
        ? `${selectedUserToBook.full_name} (@${selectedUserToBook.username})`
        : `@${selectedUserToBook.username}`;

      toast.success(
        `${userDisplay} successfully registered for the session!`,
        'Participant Added'
      );

      const updatedCount = await loadSessionDetails(selectedSession.id);
      await loadSessions();

      setSelectedSession((prev) => ({
        ...prev,
        current_bookings:
          typeof updatedCount === 'number'
            ? updatedCount
            : (prev.current_bookings || 0) + 1,
      }));

      setSelectedUserToBook(null);
      setSearchResetKey((prev) => prev + 1);
    } catch (err) {
      console.error('Error booking user:', err);
      const errMsg =
        err.message || 'Failed to add participant to session.';
      setError(errMsg);
      toast.error(errMsg, 'Booking Error');
    } finally {
      setBookingLoading(false);
    }
  };

  const getFilteredSessions = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const byNearestFirst = (a, b) =>
      new Date(a.start_time) - new Date(b.start_time);

    switch (filter) {
      case 'today':
        return sessions
          .filter((s) => {
            const sessionDate = new Date(s.start_time);
            return sessionDate >= today && sessionDate < tomorrow;
          })
          .sort(byNearestFirst);
      case 'upcoming':
        return sessions
          .filter((s) => new Date(s.start_time) >= now)
          .sort(byNearestFirst);
      case 'all':
      default: {
        const upcoming = sessions
          .filter((s) => new Date(s.start_time) >= now)
          .sort(byNearestFirst);
        const past = sessions
          .filter((s) => new Date(s.start_time) < now)
          .sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
        return [...upcoming, ...past];
      }
    }
  };

  const filteredSessions = getFilteredSessions();

  const bookedUserIds = bookings
    .map((b) => b.user_profiles?.id)
    .filter(Boolean);

  const spotsLeft = selectedSession
    ? selectedSession.workout_classes.max_capacity -
      (selectedSession.current_bookings || 0)
    : 0;
  const isSessionFull = spotsLeft <= 0;

  if (loading && sessions.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200/80 p-8">
        <div className="flex justify-center items-center">
          <div className="text-stone-600 font-medium">Loading sessions...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-stone-900">
          Session Details & Attendees
        </h2>
        <p className="text-sm text-stone-600 mt-1">
          View registered participants, manage waitlists, and add or remove attendees.
        </p>
      </div>

      {sessions.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-amber-800 text-sm font-medium">
            No sessions available. Schedule some class sessions first.
          </p>
        </div>
      )}

      {sessions.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Session Selection */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-xs border border-stone-200/80 p-5">
              <h3 className="text-base font-bold text-stone-900 mb-3">
                Select Session
              </h3>

              <div className="flex gap-1 mb-4 bg-stone-100 p-1 rounded-xl border border-stone-200/80">
                <button
                  type="button"
                  onClick={() => setFilter('all')}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    filter === 'all'
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('today')}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    filter === 'today'
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('upcoming')}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    filter === 'upcoming'
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
                  }`}
                >
                  Upcoming
                </button>
              </div>

              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {filteredSessions.map((session) => {
                  const instructorName = session.instructor
                    ? session.instructor.full_name ||
                      session.instructor.username
                    : 'Unassigned coach';

                  const sessionSpotsLeft =
                    session.workout_classes.max_capacity -
                    (session.current_bookings || 0);
                  const isSelected = selectedSession?.id === session.id;

                  return (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => setSelectedSession(session)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                        isSelected
                          ? 'border-warm-terracotta bg-warm-terracotta/5 shadow-xs'
                          : 'border-stone-200/80 hover:border-stone-300 hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-sm text-stone-900 truncate">
                          {session.workout_classes.title}
                        </h4>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ml-2 ${
                            sessionSpotsLeft <= 0
                              ? 'bg-rose-100 text-rose-800'
                              : sessionSpotsLeft <= 3
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {session.current_bookings || 0}/
                          {session.workout_classes.max_capacity}
                        </span>
                      </div>
                      <div className="text-xs text-stone-600 space-y-1">
                        <div className="font-medium text-stone-700 truncate">{instructorName}</div>
                        <div>
                          {formatDate(session.start_time)} • {formatTime(session.start_time)}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Session Details */}
          <div className="lg:col-span-2">
            {!selectedSession ? (
              <div className="bg-white rounded-2xl shadow-xs border border-stone-200/80 p-12 text-center">
                <h3 className="text-xl font-bold text-stone-900 mb-2">
                  Select a Session
                </h3>
                <p className="text-stone-600 text-sm">
                  Choose a session from the list on the left to view participants and manage attendees.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-stone-900 text-white rounded-2xl shadow-md p-6">
                  <h3 className="text-2xl font-bold mb-4">
                    {selectedSession.workout_classes.title}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <div className="text-stone-400 text-xs uppercase tracking-wider font-semibold">Date</div>
                      <div className="font-semibold text-stone-100 mt-0.5">
                        {formatDate(selectedSession.start_time)}
                      </div>
                    </div>
                    <div>
                      <div className="text-stone-400 text-xs uppercase tracking-wider font-semibold">Time</div>
                      <div className="font-semibold text-stone-100 mt-0.5">
                        {formatTime(selectedSession.start_time)} –{' '}
                        {formatTime(selectedSession.end_time)}
                      </div>
                    </div>
                    <div>
                      <div className="text-stone-400 text-xs uppercase tracking-wider font-semibold">Coach</div>
                      <div className="font-semibold text-stone-100 mt-0.5 truncate">
                        {selectedSession.instructor
                          ? selectedSession.instructor.full_name ||
                            selectedSession.instructor.username
                          : 'Unassigned'}
                      </div>
                    </div>
                    <div>
                      <div className="text-stone-400 text-xs uppercase tracking-wider font-semibold">Capacity</div>
                      <div className="font-semibold text-stone-100 mt-0.5">
                        {selectedSession.current_bookings || 0} /{' '}
                        {selectedSession.workout_classes.max_capacity}
                      </div>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3">
                    <svg className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
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
                            onUserSelect={setSelectedUserToBook}
                            excludeUserIds={bookedUserIds}
                            placeholder="Search member by name or @username..."
                            disabled={bookingLoading}
                            resetKey={searchResetKey}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleManualBookUser}
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
                              onClick={() => setBookingToRemove(booking)}
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
                        {Math.max(
                          0,
                          selectedSession.workout_classes.max_capacity -
                            (selectedSession.current_bookings || 0)
                        )}
                      </div>
                      <div className="text-xs text-emerald-800 mt-1 font-medium">
                        Available
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!bookingToRemove}
        title="Remove Participant"
        message={
          bookingToRemove
            ? `Are you sure you want to remove ${
                bookingToRemove.user_profiles?.username
                  ? '@' + bookingToRemove.user_profiles.username
                  : 'this user'
              } from this session?\n\nThis will cancel their booking and send them an email notification.`
            : ''
        }
        confirmLabel="Remove Participant"
        loading={removing}
        onConfirm={confirmRemoveBooking}
        onCancel={() => setBookingToRemove(null)}
      />
    </div>
  );
}
