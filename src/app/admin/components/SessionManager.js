'use client';

import { useState, useEffect } from 'react';
import {
  fetchAllSessions,
  fetchWorkoutTemplates,
} from '@/utils/adminQueries';
import { deleteSessionAction } from '../actions';
import SessionForm from './SessionForm';
import ConfirmModal from '@/components/ConfirmModal';
import { formatDate, formatTime } from '@/utils/calendarHelpers';
import { useToast } from '@/context/ToastContext';

export default function SessionManager({ currentUser }) {
  const isInstructor = currentUser?.profile?.user_tier === 'instructor';
  const [sessions, setSessions] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const toast = useToast();

  useEffect(() => {
    if (currentUser?.id) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, isInstructor]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [sessionsResult, templatesResult] = await Promise.all([
        fetchAllSessions(isInstructor ? currentUser?.id : null),
        fetchWorkoutTemplates(),
      ]);

      if (sessionsResult.error) throw sessionsResult.error;
      if (templatesResult.error) throw templatesResult.error;

      const allSessions = sessionsResult.data || [];
      setSessions(
        isInstructor
          ? allSessions.filter((s) => s.instructor_id === currentUser?.id)
          : allSessions
      );
      setTemplates(templatesResult.data || []);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Nem sikerült betölteni az edzéseket.');
      toast.error('Nem sikerült betölteni az edzéseket.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingSession(null);
    setShowForm(true);
  };

  const handleEdit = (session) => {
    setEditingSession(session);
    setShowForm(true);
  };

  const confirmDeleteSession = async () => {
    if (!sessionToDelete) return;

    try {
      setDeleting(true);
      setError('');
      const result = await deleteSessionAction(sessionToDelete.id);

      if (!result.success) {
        throw new Error(result.error);
      }

      const sessionTitle = sessionToDelete.workout_classes?.title || 'Edzés';
      setSessions(sessions.filter((s) => s.id !== sessionToDelete.id));
      setSessionToDelete(null);
      toast.success(
        `A(z) "${sessionTitle}" edzésidőpont sikeresen törölve!`,
        'Edzés törölve'
      );
    } catch (err) {
      console.error('Error deleting session:', err);
      const errMsg = err.message || 'Nem sikerült az edzés törlése.';
      setError(errMsg);
      toast.error(errMsg, 'Törlési hiba');
      setSessionToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleFormSubmit = async () => {
    setShowForm(false);
    setEditingSession(null);
    await loadData();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingSession(null);
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

  if (loading) {
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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-stone-900">
            {isInstructor ? 'Saját meghirdetett edzéseim' : 'Edzésidőpontok kezelése'}
          </h2>
          <p className="text-sm text-stone-600 mt-1">
            {isInstructor
              ? 'Kezeld a saját óráidat, időpontjaidat és feliratkozóidat.'
              : 'Ütemezz edzéseket a sablonokból, és rendelj hozzájuk oktatókat.'}
          </p>
        </div>
        <button
          type="button"
          onClick={handleCreate}
          className="w-full sm:w-auto justify-center bg-warm-terracotta text-white px-5 py-2.5 rounded-xl hover:bg-warm-terracotta/90 transition-colors font-medium text-sm flex items-center gap-2 shrink-0 shadow-xs"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>+ Új edzés ütemezése</span>
        </button>
      </div>

      {/* Szűrő fülek */}
      <div className="bg-white rounded-xl shadow-xs border border-stone-200/80 p-1 flex sm:inline-flex w-full sm:w-auto overflow-x-auto">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm transition-colors whitespace-nowrap ${
            filter === 'all'
              ? 'bg-warm-terracotta text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          Összes ({sessions.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('today')}
          className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm transition-colors whitespace-nowrap ${
            filter === 'today'
              ? 'bg-warm-terracotta text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          Mai nap
        </button>
        <button
          type="button"
          onClick={() => setFilter('upcoming')}
          className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm transition-colors whitespace-nowrap ${
            filter === 'upcoming'
              ? 'bg-warm-terracotta text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          Közelgő edzések
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-rose-800 text-sm font-medium">{error}</p>
        </div>
      )}

      {templates.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-amber-800 text-sm font-medium">
            Nincs elérhető sablon. Kérjük, hozz létre legalább egy edzéssablont a sablonok menüpontban az időpontok ütemezése előtt.
          </p>
        </div>
      )}

      {filteredSessions.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-xs border border-stone-200/80 p-12 text-center">
          <h3 className="text-xl font-bold text-stone-900 mb-2">
            Nincsenek megjeleníthető edzések
          </h3>
          <p className="text-stone-600 mb-6 text-sm max-w-sm mx-auto">
            {templates.length === 0
              ? 'Először hozz létre egy sablont a kezdéshez.'
              : 'Ütemezz be egy új edzésidőpontot a fenti gombra kattintva.'}
          </p>
          {templates.length > 0 && (
            <button
              type="button"
              onClick={handleCreate}
              className="inline-flex items-center gap-2 bg-warm-terracotta text-white px-5 py-2.5 rounded-xl hover:bg-warm-terracotta/90 transition-colors font-medium text-sm shadow-xs"
            >
              <span>+ Új edzés ütemezése</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSessions.map((session) => {
            const instructorName = session.instructor
              ? session.instructor.full_name || session.instructor.username
              : 'Nincs kijelölt oktató';
            const isPast = new Date(session.start_time) < new Date();
            const spotsLeft =
              session.workout_classes.max_capacity -
              (session.current_bookings || 0);

            return (
              <div
                key={session.id}
                className={`bg-white rounded-2xl shadow-xs border transition-shadow ${
                  isPast
                    ? 'border-stone-200/60 opacity-60'
                    : 'border-stone-200/80 hover:shadow-md'
                }`}
              >
                <div className="p-5 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="text-lg font-bold text-stone-900 truncate">
                          {session.workout_classes.title}
                        </h3>
                        {session.is_recurring && (
                          <span className="bg-stone-100 text-stone-700 text-xs px-2.5 py-0.5 rounded-md font-medium">
                            Heti ismétlődő
                          </span>
                        )}
                        {!session.is_active && (
                          <span className="bg-rose-100 text-rose-800 text-xs px-2.5 py-0.5 rounded-md font-medium">
                            Inaktív
                          </span>
                        )}
                        {isPast && (
                          <span className="bg-stone-200 text-stone-600 text-xs px-2.5 py-0.5 rounded-md font-medium">
                            Lezárult
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm text-stone-600 mt-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-stone-400 font-medium">Időpont:</span>
                          <span className="font-semibold text-stone-800">
                            {formatDate(session.start_time)} •{' '}
                            {formatTime(session.start_time)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-stone-400 font-medium">Oktató:</span>
                          <span className="font-semibold text-stone-800 truncate">
                            {instructorName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-stone-400 font-medium">Férőhely:</span>
                          <span className="font-semibold text-stone-800">
                            {spotsLeft} szabad / {session.workout_classes.max_capacity}
                          </span>
                        </div>
                      </div>

                      {session.current_bookings > 0 && (
                        <div className="mt-2 text-xs text-stone-500 font-medium">
                          {session.current_bookings} regisztrált résztvevő
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 sm:mt-1 pt-3 sm:pt-0 border-t sm:border-t-0 border-stone-200/60 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleEdit(session)}
                        className="flex-1 sm:flex-initial bg-stone-100 hover:bg-stone-200 text-stone-800 px-4 py-2 rounded-xl transition-colors font-semibold text-xs text-center"
                      >
                        Szerkesztés
                      </button>
                      <button
                        type="button"
                        onClick={() => setSessionToDelete(session)}
                        className="flex-1 sm:flex-initial bg-rose-50 hover:bg-rose-100 text-rose-700 px-4 py-2 rounded-xl transition-colors font-semibold text-xs text-center"
                      >
                        Törlés
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <SessionForm
          session={editingSession}
          templates={templates}
          currentUser={currentUser}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
        />
      )}

      <ConfirmModal
        isOpen={!!sessionToDelete}
        title="Edzésidőpont törlése"
        message={
          sessionToDelete
            ? `Biztosan törölni szeretnéd a(z) "${sessionToDelete.workout_classes.title}" órát (${formatDate(
                sessionToDelete.start_time
              )}, ${formatTime(
                sessionToDelete.start_time
              )})?\n\nEz a művelet lemondja a már meglévő foglalásokat és e-mailben értesíti a résztvevőket.`
            : ''
        }
        confirmLabel="Edzés törlése"
        loading={deleting}
        onConfirm={confirmDeleteSession}
        onCancel={() => setSessionToDelete(null)}
      />
    </div>
  );
}
