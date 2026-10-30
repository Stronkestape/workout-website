'use client';

import { useState, useEffect } from 'react';
import {
  fetchAllSessions,
  adminBookUser,
  getSessionBookings,
} from '@/utils/adminQueries';
import { formatDate, formatTime } from '@/utils/calendarHelpers';
import UserSearchSelect from './UserSearchSelect';
import { useToast } from '@/context/ToastContext';

export default function ManualBookingManager({ currentUser }) {
  const isInstructor = currentUser?.profile?.user_tier === 'instructor';
  const toast = useToast();
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [existingBookings, setExistingBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchResetKey, setSearchResetKey] = useState(0);

  useEffect(() => {
    if (currentUser?.id) {
      loadSessions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, isInstructor]);

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
      const { data, error } = await fetchAllSessions(
        isInstructor ? currentUser?.id : null
      );

      if (error) throw error;

      const now = new Date();
      const activeSessions = (data || [])
        .filter(
          (s) =>
            s.is_active &&
            new Date(s.start_time) >= now &&
            (!isInstructor || s.instructor_id === currentUser?.id)
        )
        .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
      setSessions(activeSessions);
    } catch (err) {
      console.error('Error loading sessions:', err);
      setError('Nem sikerült betölteni az edzéseket.');
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
      setError('Kérjük, válassz ki egy edzést és egy felhasználót!');
      return;
    }

    const spotsLeft =
      selectedSession.workout_classes.max_capacity -
      (selectedSession.current_bookings || 0);
    if (spotsLeft <= 0) {
      setError('Ez az edzés már betelt, nem lehet további résztvevőt hozzáadni.');
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

      const userDisplay = selectedUser.full_name
        ? `${selectedUser.full_name} (@${selectedUser.username})`
        : `@${selectedUser.username}`;

      const successMsg = `Sikeres feljelentkeztetés: ${userDisplay} hozzáadva az edzéshez!`;
      setSuccess(successMsg);
      toast.success(successMsg, 'Felhasználó rögzítve');

      await loadSessionBookings(selectedSession.id);
      await loadSessions();

      const updatedSession = {
        ...selectedSession,
        current_bookings: (selectedSession.current_bookings || 0) + 1,
      };
      setSelectedSession(updatedSession);
      setSelectedUser(null);
      setSearchResetKey((prev) => prev + 1);
    } catch (err) {
      console.error('Error booking user:', err);
      const errMsg = err.message || 'Nem sikerült a felhasználó feljelentkeztetése.';
      setError(errMsg);
      toast.error(errMsg, 'Foglalási hiba');
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
    setSearchResetKey((prev) => prev + 1);
  };

  const bookedUserIds = existingBookings
    .map((booking) => booking.user_profiles?.id)
    .filter(Boolean);

  if (loading && sessions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8">
        <div className="flex justify-center items-center">
          <div className="text-stone-600">Edzések betöltése...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-stone-900">Manuális feljelentkeztetés</h2>
        <p className="text-sm text-stone-600 mt-1">
          Felhasználók manuális feljelentkeztetése edzésekre (adminisztrátori vagy edzői segítség)
        </p>
      </div>

      {sessions.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-amber-800 text-sm">
            <strong>Nincs elérhető aktív edzés.</strong> Hozz létre egy edzést a feljelentkeztetés előtt.
          </p>
        </div>
      )}

      {sessions.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bal oszlop: Edzés kiválasztása */}
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-stone-900 mb-4">
                1. lépés: Válassz edzést
              </h3>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {sessions.map((session) => {
                  const instructorName = session.instructor
                    ? session.instructor.full_name ||
                      session.instructor.username
                    : 'Nincs kijelölt edző';

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
                          ? 'border-warm-terracotta bg-warm-terracotta/5'
                          : isFull
                          ? 'border-stone-200 bg-stone-50 opacity-50 cursor-not-allowed'
                          : 'border-stone-200 hover:border-warm-terracotta/40 hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-semibold text-stone-900">
                            {session.workout_classes.title}
                          </h4>
                          <p className="text-sm text-stone-600 mt-1">
                            {instructorName}
                          </p>
                          <div className="text-xs text-stone-500 mt-2">
                            {formatDate(session.start_time)} •{' '}
                            {formatTime(session.start_time)}
                          </div>
                        </div>
                        <div
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            isFull
                              ? 'bg-rose-100 text-rose-800'
                              : spotsLeft <= 3
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isFull ? 'Betelt' : `${spotsLeft} szabad hely`}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedSession && existingBookings.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h4 className="font-semibold text-stone-900 mb-3">
                  Jelenlegi résztvevők ({existingBookings.length})
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {existingBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between p-2 bg-stone-50 rounded"
                    >
                      <div className="text-sm">
                        <div className="font-medium text-stone-900">
                          @{booking.user_profiles?.username || 'Ismeretlen'}
                        </div>
                        {booking.user_profiles?.full_name && (
                          <div className="text-stone-600 text-xs">
                            {booking.user_profiles.full_name}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-stone-500">
                        {new Date(booking.booked_at).toLocaleDateString('hu-HU')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Jobb oszlop: Felhasználó keresése és feljelentkeztetés */}
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-stone-900 mb-4">
                2. lépés: Felhasználó kiválasztása
              </h3>

              <UserSearchSelect
                onUserSelect={setSelectedUser}
                excludeUserIds={bookedUserIds}
                placeholder="Keresés felhasználónév vagy teljes név alapján..."
                disabled={!selectedSession}
                resetKey={searchResetKey}
              />

              {!selectedSession && (
                <p className="text-sm text-stone-500 mt-2">
                  Először válassz ki egy edzést a bal oldalon.
                </p>
              )}
            </div>

            {selectedSession && (
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-6">
                <h4 className="font-semibold text-emerald-950 mb-3">
                  Kiválasztott edzés
                </h4>
                <div className="space-y-2">
                  <div className="text-sm text-emerald-950 font-medium">
                    {selectedSession.workout_classes.title}
                  </div>
                  <div className="text-sm text-emerald-800">
                    {formatDate(selectedSession.start_time)} •{' '}
                    {formatTime(selectedSession.start_time)}
                  </div>
                  <div className="text-sm text-emerald-800">
                    Oktató:{' '}
                    {selectedSession.instructor
                      ? selectedSession.instructor.full_name ||
                        selectedSession.instructor.username
                      : 'Nincs kijelölt edző'}
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 flex items-start gap-3">
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
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <p className="text-rose-800 text-sm font-medium">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <p className="text-emerald-800 text-sm font-medium">{success}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 px-6 py-3 border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors font-medium text-stone-700"
              >
                Visszaállítás
              </button>
              <button
                type="button"
                onClick={handleBookUser}
                disabled={!selectedSession || !selectedUser || loading}
                className="flex-1 bg-warm-terracotta text-white px-6 py-3 rounded-lg hover:bg-warm-terracotta/90 disabled:bg-stone-300 disabled:cursor-not-allowed transition-colors font-medium shadow-xs"
              >
                {loading ? 'Feljelentkeztetés...' : 'Feljelentkeztetés'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
