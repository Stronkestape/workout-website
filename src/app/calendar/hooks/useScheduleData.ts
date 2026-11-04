import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchClassSessions,
  fetchUserBookedSessionIds,
  hasSupabaseAuthCookie,
} from '@/utils/supabaseQueries';

export interface CalendarEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
  resource: {
    workoutTitle: string;
    instructorId: string | null;
    instructorName: string;
    spotsLeft: number;
    maxCapacity: number;
    currentBookings: number;
    isBooked: boolean;
  };
}

export function transformSessionsToEvents(
  sessions: any[] = [],
  userBookedSessions: Set<number> = new Set()
): CalendarEvent[] {
  return (sessions || []).map((session) => {
    const spotsLeft = Math.max(
      0,
      session.workout_classes.max_capacity - (session.current_bookings || 0)
    );

    const instructorName = session.instructor
      ? session.instructor.full_name || session.instructor.username
      : 'Hamarosan';

    return {
      id: session.id,
      title: `${session.workout_classes.title} - ${instructorName}`,
      start: new Date(session.start_time),
      end: new Date(session.end_time),
      resource: {
        workoutTitle: session.workout_classes.title,
        instructorId: session.instructor_id,
        instructorName,
        spotsLeft,
        maxCapacity: session.workout_classes.max_capacity,
        currentBookings: session.current_bookings || 0,
        isBooked: userBookedSessions.has(session.id),
      },
    };
  });
}

export function useScheduleData({
  initialSessions = null,
}: {
  initialSessions?: any[] | null;
} = {}) {
  const hasInitialSessions = Array.isArray(initialSessions);

  const [events, setEvents] = useState<CalendarEvent[]>(() =>
    hasInitialSessions
      ? transformSessionsToEvents(initialSessions, new Set())
      : []
  );
  const [loading, setLoading] = useState<boolean>(() => !hasInitialSessions);
  const [user, setUser] = useState<any>(null);
  const userRef = useRef(user);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const fetchEvents = useCallback(
    async ({
      silent = false,
      bypassCache = false,
      currentUser = undefined,
    }: {
      silent?: boolean;
      bypassCache?: boolean;
      currentUser?: any;
    } = {}) => {
      try {
        if (!silent) {
          setLoading(true);
        }

        const activeUser =
          currentUser !== undefined ? currentUser : userRef.current;

        const [sessionsResult, bookingsResult] = await Promise.all([
          fetchClassSessions({ bypassCache }),
          fetchUserBookedSessionIds(activeUser?.id),
        ]);

        if (sessionsResult.error) {
          throw sessionsResult.error;
        }

        const data = sessionsResult.data || [];
        const userBookedSessions = new Set<number>(
          (bookingsResult.data || []).map((b: any) => b.session_id)
        );

        const calendarEvents = transformSessionsToEvents(
          data,
          userBookedSessions
        );

        setEvents(calendarEvents);
        return calendarEvents;
      } catch (error) {
        console.error('Error fetching events:', error);
        return null;
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    let isMounted = true;

    const handleSignOut = () => {
      if (!isMounted) return;
      setUser(null);
      setEvents((prev) =>
        prev.map((ev) => ({
          ...ev,
          resource: { ...ev.resource, isBooked: false },
        }))
      );
    };

    window.addEventListener('app:auth-signed-out', handleSignOut);

    async function initCalendar() {
      const hasCookie = hasSupabaseAuthCookie();

      if (hasInitialSessions && !hasCookie) {
        return;
      }

      if (!hasCookie) {
        await fetchEvents({ currentUser: null });
        return;
      }

      if (hasInitialSessions) {
        try {
          const res = await fetch('/api/auth/me?includeBookings=1', {
            cache: 'no-store',
          });
          if (!isMounted || !res.ok) return;
          const data = await res.json();
          if (!isMounted) return;

          const initialUser = data?.user || null;
          setUser(initialUser);

          if (initialUser && Array.isArray(data?.bookedSessionIds)) {
            const bookedSet = new Set<number>(data.bookedSessionIds);
            setEvents((prevEvents) =>
              prevEvents.map((ev) => ({
                ...ev,
                resource: {
                  ...ev.resource,
                  isBooked: bookedSet.has(ev.id),
                },
              }))
            );
          }
        } catch {
          // Ignore network error during background booking badge hydration
        }
      } else {
        try {
          const [sessionsResult, authRes] = await Promise.all([
            fetchClassSessions(),
            fetch('/api/auth/me?includeBookings=1', { cache: 'no-store' }).then(
              (r) => (r.ok ? r.json() : null)
            ),
          ]);
          if (!isMounted) return;
          const initialUser = authRes?.user || null;
          setUser(initialUser);
          const bookedSet = new Set<number>(authRes?.bookedSessionIds || []);
          const calendarEvents = transformSessionsToEvents(
            sessionsResult.data || [],
            bookedSet
          );
          setEvents(calendarEvents);
        } catch (err) {
          console.error('Error initializing calendar:', err);
        } finally {
          if (isMounted) setLoading(false);
        }
      }
    }

    initCalendar();

    return () => {
      isMounted = false;
      window.removeEventListener('app:auth-signed-out', handleSignOut);
    };
  }, [hasInitialSessions, fetchEvents]);

  return {
    events,
    setEvents,
    loading,
    setLoading,
    user,
    setUser,
    fetchEvents,
  };
}
