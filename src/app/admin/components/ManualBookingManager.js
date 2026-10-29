'use client';

import { useState, useEffect } from 'react';
import {
  fetchAllSessions,
  adminBookUser,
  getSessionBookings,
} from '@/utils/adminQueries';
import { formatDate, formatTime } from '@/utils/calendarHelpers';
import UserSearchSelect from './UserSearchSelect';

export default function ManualBookingManager() {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [existingBookings, setExistingBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (selectedSession) {
      loadSessionBookings(selectedSession.id);
    } else {
      setExistingBookings([]);
    }
  }, [selectedSession]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const { data, error } = await fetchAllSessions();

      if (error) throw error;

      const activeSessions = (data || []).filter((s) => s.is_active);
      setSessions(activeSessions);
    } catch (err) {
      console.error('Error loading sessions:', err);
      setError('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const loadSessionBookings = async (sessionId) => {
    try {
      const { data, error } = await getSessionBookings(sessionId);

      if (error) throw error;

      setExistingBookings(data || []);
    } catch (err) {
      console.error('Error loading bookings:', err);
    }
  };

  const handleBookUser = async () => {
    if (!selectedSession || !selectedUser) {
      setError('Please select both a session and a user');
      return;
    }

    const spotsLeft =
      selectedSession.workout_classes.max_capacity -
      (selectedSession.current_bookings || 0);
    if (spotsLeft <= 0) {
      setError('This session is already full. Cannot add more bookings.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const { error } = await adminBookUser(
        selectedUser.id,
        selectedSession.id
      );

      if (error) throw error;

      setSuccess(
        `Successfully booked ${selectedUser.username} into the session!`
      );

      await loadSessionBookings(selectedSession.id);
      await loadSessions();

      const updatedSession = {
        ...selectedSession,
        current_bookings: (selectedSession.current_bookings || 0) + 1,
      };
      setSelectedSession(updatedSession);
      setSelectedUser(null);
    } catch (err) {
      console.error('Error booking user:', err);
      setError(err.message || 'Failed to book user');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedSession(null);
    setSelectedUser(null);
    setExistingBookings([]);
    setError('');
    setSuccess('');
  };

  const bookedUserIds = existingBookings
    .map((booking) => booking.user_profiles?.id)
    .filter(Boolean);

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
        <h2 className="text-2xl font-bold text-gray-900">Manual Booking</h2>
        <p className="text-sm text-gray-600 mt-1">
          Book users into workout sessions manually (for those who need
          assistance)
        </p>
      </div>

      {sessions.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 text-sm">
            <strong>No active sessions available.</strong> Schedule some
            sessions first before manually booking users.
          </p>
        </div>
      )}

      {sessions.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Session Selection */}
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Step 1: Select Session
              </h3>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {sessions.map((session) => {
                  const instructorName = session.instructor
                    ? session.instructor.full_name ||
                      session.instructor.username
                    : 'No instructor';

                  const spotsLeft =
                    session.workout_classes.max_capacity -
                    (session.current_bookings || 0);
                  const isFull = spotsLeft <= 0;
                  const isSelected = selectedSession?.id === session.id;

                  return (
                    <button
                      key={session.id}
                      onClick={() => setSelectedSession(session)}
                      disabled={isFull}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : isFull
                          ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">
                            {session.workout_classes.title}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {instructorName}
                          </p>
                          <div className="text-xs text-gray-500 mt-2">
                            {formatDate(session.start_time)} •{' '}
                            {formatTime(session.start_time)}
                          </div>
                        </div>
                        <div
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            isFull
                              ? 'bg-red-100 text-red-800'
                              : spotsLeft <= 3
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {isFull ? 'Full' : `${spotsLeft} spots`}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedSession && existingBookings.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h4 className="font-semibold text-gray-900 mb-3">
                  Current Bookings ({existingBookings.length})
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {existingBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded"
                    >
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">
                          {booking.user_profiles?.username || 'Unknown'}
                        </div>
                        {booking.user_profiles?.full_name && (
                          <div className="text-gray-600 text-xs">
                            {booking.user_profiles.full_name}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(booking.booked_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: User Selection and Booking */}
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Step 2: Search User
              </h3>

              <UserSearchSelect
                onUserSelect={setSelectedUser}
                excludeUserIds={bookedUserIds}
                placeholder="Search by username, email, or name..."
                disabled={!selectedSession}
              />

              {!selectedSession && (
                <p className="text-sm text-gray-500 mt-2">
                  Please select a session first
                </p>
              )}
            </div>

            {selectedSession && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h4 className="font-semibold text-green-900 mb-3">
                  Selected Session
                </h4>
                <div className="space-y-2">
                  <div className="text-sm text-green-900 font-medium">
                    {selectedSession.workout_classes.title}
                  </div>
                  <div className="text-sm text-green-700">
                    {formatDate(selectedSession.start_time)} at{' '}
                    {formatTime(selectedSession.start_time)}
                  </div>
                  <div className="text-sm text-green-700">
                    Instructor:{' '}
                    {selectedSession.instructor
                      ? selectedSession.instructor.full_name ||
                        selectedSession.instructor.username
                      : 'Not assigned'}
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 text-sm">{success}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700"
              >
                Reset
              </button>
              <button
                onClick={handleBookUser}
                disabled={!selectedSession || !selectedUser || loading}
                className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {loading ? 'Booking...' : 'Book User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
