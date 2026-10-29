'use client';

import { useState, useEffect } from 'react';
import {
  fetchAllSessions,
  getSessionBookings,
  getSessionWaitlist,
  adminRemoveBooking,
} from '@/utils/adminQueries';
import { formatDate, formatTime } from '@/utils/calendarHelpers';
import ConfirmModal from '@/components/ConfirmModal';

export default function SessionDetailView({ currentUser }) {
  const isInstructor = currentUser?.profile?.user_tier === 'instructor';
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [bookingToRemove, setBookingToRemove] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  useEffect(() => {
    if (selectedSession) {
      loadSessionDetails(selectedSession.id);
    }
  }, [selectedSession]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const { data, error } = await fetchAllSessions();

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

      setBookings(bookingsResult.data || []);
      setWaitlist(waitlistResult.data || []);
    } catch (err) {
      console.error('Error loading session details:', err);
      setError('Failed to load session details');
    } finally {
      setLoading(false);
    }
  };

  const confirmRemoveBooking = async () => {
    if (!bookingToRemove || !selectedSession) return;

    try {
      setRemoving(true);
      setError('');
      const { error } = await adminRemoveBooking(bookingToRemove.id);

      if (error) throw error;

      await loadSessionDetails(selectedSession.id);
      await loadSessions();

      setSelectedSession({
        ...selectedSession,
        current_bookings: Math.max(
          0,
          (selectedSession.current_bookings || 1) - 1
        ),
      });
      setBookingToRemove(null);
    } catch (err) {
      console.error('Error removing booking:', err);
      setError('Failed to remove booking: ' + err.message);
      setBookingToRemove(null);
    } finally {
      setRemoving(false);
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

  if (loading && sessions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8">
        <div className="flex justify-center items-center">
          <div className="text-gray-600">Loading sessions...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Session Details</h2>
        <p className="text-sm text-gray-600 mt-1">
          View participants and manage bookings for each session
        </p>
      </div>

      {sessions.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 text-sm">
            <strong>No sessions available.</strong> Schedule some sessions first.
          </p>
        </div>
      )}

      {sessions.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Session Selection */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Select Session
              </h3>

              <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setFilter('all')}
                  className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                    filter === 'all'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter('today')}
                  className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                    filter === 'today'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Today
                </button>
                <button
                  onClick={() => setFilter('upcoming')}
                  className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                    filter === 'upcoming'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Upcoming
                </button>
              </div>

              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {filteredSessions.map((session) => {
                  const instructorName = session.instructor
                    ? session.instructor.full_name ||
                      session.instructor.username
                    : 'No instructor';

                  const spotsLeft =
                    session.workout_classes.max_capacity -
                    (session.current_bookings || 0);
                  const isSelected = selectedSession?.id === session.id;

                  return (
                    <button
                      key={session.id}
                      onClick={() => setSelectedSession(session)}
                      className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-sm text-gray-900">
                          {session.workout_classes.title}
                        </h4>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            spotsLeft <= 0
                              ? 'bg-red-100 text-red-800'
                              : spotsLeft <= 3
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {session.current_bookings || 0}/
                          {session.workout_classes.max_capacity}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 space-y-1">
                        <div>{instructorName}</div>
                        <div>
                          {new Date(session.start_time).toLocaleDateString(
                            'en-US',
                            {
                              month: 'short',
                              day: 'numeric',
                              weekday: 'short',
                            }
                          )}{' '}
                          • {formatTime(session.start_time)}
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
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Select a Session
                </h3>
                <p className="text-gray-600">
                  Choose a session from the list to view its participants and
                  details
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-lg p-6">
                  <h3 className="text-2xl font-bold mb-4">
                    {selectedSession.workout_classes.title}
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-blue-100 text-sm">Date</div>
                      <div className="font-semibold">
                        {formatDate(selectedSession.start_time)}
                      </div>
                    </div>
                    <div>
                      <div className="text-blue-100 text-sm">Time</div>
                      <div className="font-semibold">
                        {formatTime(selectedSession.start_time)} -{' '}
                        {formatTime(selectedSession.end_time)}
                      </div>
                    </div>
                    <div>
                      <div className="text-blue-100 text-sm">Instructor</div>
                      <div className="font-semibold">
                        {selectedSession.instructor
                          ? selectedSession.instructor.full_name ||
                            selectedSession.instructor.username
                          : 'Not assigned'}
                      </div>
                    </div>
                    <div>
                      <div className="text-blue-100 text-sm">Capacity</div>
                      <div className="font-semibold">
                        {selectedSession.current_bookings || 0}/
                        {selectedSession.workout_classes.max_capacity}
                      </div>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800 text-sm">{error}</p>
                  </div>
                )}

                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-semibold text-gray-900">
                      Confirmed Bookings ({bookings.length})
                    </h4>
                    {bookings.length === 0 && (
                      <span className="text-sm text-gray-500">
                        No bookings yet
                      </span>
                    )}
                  </div>

                  {bookings.length > 0 ? (
                    <div className="space-y-2">
                      {bookings.map((booking) => (
                        <div
                          key={booking.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                              {booking.user_profiles?.username
                                ?.charAt(0)
                                .toUpperCase() || 'U'}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                {booking.user_profiles?.username || 'Unknown'}
                              </div>
                              {booking.user_profiles?.full_name && (
                                <div className="text-sm text-gray-600">
                                  {booking.user_profiles.full_name}
                                </div>
                              )}
                              <div className="text-xs text-gray-500">
                                {booking.user_profiles?.email}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-xs text-gray-500 text-right">
                              <div>Booked</div>
                              <div>
                                {new Date(
                                  booking.booked_at
                                ).toLocaleDateString()}
                              </div>
                            </div>
                            <button
                              onClick={() => setBookingToRemove(booking)}
                              className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors font-medium text-sm"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>No confirmed bookings for this session</p>
                    </div>
                  )}
                </div>

                {waitlist.length > 0 && (
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">
                      Waitlist ({waitlist.length})
                    </h4>
                    <div className="space-y-2">
                      {waitlist.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between p-3 bg-orange-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                              {entry.position}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                {entry.user_profiles?.username || 'Unknown'}
                              </div>
                              {entry.user_profiles?.full_name && (
                                <div className="text-sm text-gray-600">
                                  {entry.user_profiles.full_name}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-xs text-gray-500">
                            Joined{' '}
                            {new Date(entry.joined_at).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-lg shadow-md p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    Session Statistics
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {bookings.length}
                      </div>
                      <div className="text-sm text-blue-700 mt-1">
                        Confirmed
                      </div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {waitlist.length}
                      </div>
                      <div className="text-sm text-orange-700 mt-1">
                        Waitlist
                      </div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {Math.max(
                          0,
                          selectedSession.workout_classes.max_capacity -
                            (selectedSession.current_bookings || 0)
                        )}
                      </div>
                      <div className="text-sm text-green-700 mt-1">
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
                bookingToRemove.user_profiles?.username || 'this user'
              } from this session?\n\nThis action cannot be undone.`
            : ''
        }
        confirmLabel="Remove User"
        loading={removing}
        onConfirm={confirmRemoveBooking}
        onCancel={() => setBookingToRemove(null)}
      />
    </div>
  );
}
