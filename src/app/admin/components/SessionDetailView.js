'use client';

import { useState, useEffect, useRef } from 'react';
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
import { filterSessionsByPeriod } from '../utils/sessionFilters';
import SessionAttendeePanel from './SessionAttendeePanel';

const ConfirmModal = dynamic(() => import('@/components/ConfirmModal'), {
  ssr: false,
});

export default function SessionDetailView({
  currentUser,
  initialSessions = null,
  serverNow = null,
}) {
  const isInstructor = currentUser?.profile?.user_tier === 'instructor';
  const toast = useToast();
  const hasInitialSessions = Array.isArray(initialSessions);
  const [sessions, setSessions] = useState(initialSessions || []);
  const hasInitialSessionsRef = useRef(hasInitialSessions);
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
    if (hasInitialSessionsRef.current) {
      hasInitialSessionsRef.current = false;
      return;
    }
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

      setSessions(data || []);
    } catch (err) {
      console.error('Error loading sessions:', err);
      setError('Nem sikerült betölteni az edzéseket');
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
      setError('Nem sikerült betölteni az edzés részleteit');
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
      const userName = bookingToRemove.user_profiles?.username || 'résztvevő';
      toast.success(
        `@${userName} sikeresen eltávolítva az edzésről és e-mailben értesítve!`,
        'Résztvevő eltávolítva'
      );
      setBookingToRemove(null);
    } catch (err) {
      console.error('Error removing booking:', err);
      const errMsg = err.message || 'Nem sikerült eltávolítani a résztvevőt.';
      setError(errMsg);
      toast.error(errMsg, 'Eltávolítási hiba');
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
        'Ez az edzés már megtelt, nem adható hozzá több résztvevő.',
        'Edzés megtelt'
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
        `${userDisplay} sikeresen regisztrálva az edzésre!`,
        'Résztvevő hozzáadva'
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
        err.message || 'Nem sikerült hozzáadni a résztvevőt.';
      setError(errMsg);
      toast.error(errMsg, 'Hozzáadási hiba');
    } finally {
      setBookingLoading(false);
    }
  };

  const filteredSessions = filterSessionsByPeriod(sessions, filter, serverNow);

  if (loading && sessions.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200/80 p-8">
        <div className="flex justify-center items-center">
          <div className="text-stone-600 font-medium">Edzések betöltése...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-stone-900">
          Résztvevők & Részletek
        </h2>
        <p className="text-sm text-stone-600 mt-1">
          Tekintsd meg a regisztrált résztvevőket, kezeld a várólistát és vegyél fel új vendégeket.
        </p>
      </div>

      {sessions.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-amber-800 text-sm font-medium">
            Nincs megjeleníthető edzés. Hozz létre új órát az Órarend Kezelése fülön!
          </p>
        </div>
      )}

      {sessions.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Session Selection */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-xs border border-stone-200/80 p-5">
              <h3 className="text-base font-bold text-stone-900 mb-3">
                Válassz Edzést
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
                  Összes
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
                  Ma
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
                  Közelgő
                </button>
              </div>

              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {filteredSessions.map((session) => {
                  const instructorName = session.instructor
                    ? session.instructor.full_name ||
                      session.instructor.username
                    : 'Nincs kijelölt oktató';

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
                        <div className="font-bold text-sm text-stone-900 truncate">
                          {session.workout_classes.title}
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ml-2 ${
                            sessionSpotsLeft <= 0
                              ? 'bg-rose-100 text-rose-800'
                              : sessionSpotsLeft <= 3
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {session.current_bookings || 0} /{' '}
                          {session.workout_classes.max_capacity}
                        </span>
                      </div>
                      <div className="text-xs text-stone-600 space-y-1">
                        <div className="font-medium text-stone-700 truncate">
                          {instructorName}
                        </div>
                        <div>
                          {formatDate(session.start_time)} •{' '}
                          {formatTime(session.start_time)}
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
            <SessionAttendeePanel
              selectedSession={selectedSession}
              bookings={bookings}
              waitlist={waitlist}
              error={error}
              selectedUserToBook={selectedUserToBook}
              onSelectUserToBook={setSelectedUserToBook}
              bookingLoading={bookingLoading}
              searchResetKey={searchResetKey}
              onManualBookUser={handleManualBookUser}
              onPromptRemoveBooking={setBookingToRemove}
            />
          </div>
        </div>
      )}

      {!!bookingToRemove && (
        <ConfirmModal
          isOpen={!!bookingToRemove}
          title="Résztvevő eltávolítása"
          message={
            bookingToRemove
              ? `Biztosan el szeretnéd távolítani ${
                  bookingToRemove.user_profiles?.username
                    ? '@' + bookingToRemove.user_profiles.username
                    : 'ezt a résztvevőt'
                } erről az edzésről?\n\nEz a művelet törli a foglalást és e-mailben értesíti a felhasználót.`
              : ''
          }
          confirmLabel="Résztvevő eltávolítása"
          loading={removing}
          onConfirm={confirmRemoveBooking}
          onCancel={() => setBookingToRemove(null)}
        />
      )}
    </div>
  );
}
