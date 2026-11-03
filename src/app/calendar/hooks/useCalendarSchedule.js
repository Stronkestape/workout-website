import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  startTransition,
} from "react";
import { isBefore, isAfter } from "date-fns";
import { getDateLimits, toGymLocalTime } from "@/utils/calendarHelpers";
import {
  fetchClassSessions,
  fetchUserBookedSessionIds,
  hasSupabaseAuthCookie,
} from "@/utils/supabaseQueries";
import {
  getWorkoutTheme,
  WORKOUT_THEMES,
  normalizeWorkoutKey,
} from "@/utils/workoutThemes";

/**
 * Transforms raw Supabase session rows into react-big-calendar event objects.
 */
function transformSessionsToEvents(
  sessions = [],
  userBookedSessions = new Set()
) {
  return (sessions || []).map((session) => {
    const spotsLeft = Math.max(
      0,
      session.workout_classes.max_capacity - (session.current_bookings || 0)
    );

    const instructorName = session.instructor
      ? session.instructor.full_name || session.instructor.username
      : "TBA";

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

export function useCalendarSchedule({
  initialSessions = null,
  serverNow = null,
} = {}) {
  const hasInitialSessions = Array.isArray(initialSessions);

  const [events, setEvents] = useState(() =>
    hasInitialSessions
      ? transformSessionsToEvents(initialSessions, new Set())
      : []
  );
  const [loading, setLoading] = useState(() => !hasInitialSessions);
  const [currentDate, setCurrentDate] = useState(() =>
    toGymLocalTime(serverNow ? new Date(serverNow) : new Date())
  );
  const [view, setView] = useState("week");
  const [user, setUser] = useState(null);
  const userRef = useRef(user);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const [selectedWorkoutType, setSelectedWorkoutType] = useState("all");
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [showWorkoutCard, setShowWorkoutCard] = useState(false);

  // Scroll to top instantly on mount and read optional "?filter=..." query parameter without triggering Next.js CSR bailout
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    try {
      const params = new URLSearchParams(window.location.search);
      const filterParam = params.get("filter");
      if (filterParam) {
        const normalizedKey = normalizeWorkoutKey(filterParam);
        if (WORKOUT_THEMES[normalizedKey] || normalizedKey === "default") {
          setSelectedWorkoutType(normalizedKey);
        }
      }
    } catch {
      // Ignore URL parsing errors
    }
  }, []);

  const handleWorkoutTypeSelect = useCallback((type) => {
    startTransition(() => {
      setSelectedWorkoutType(type);
    });
  }, []);

  const fetchEvents = useCallback(
    async ({
      silent = false,
      bypassCache = false,
      currentUser = undefined,
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
        const userBookedSessions = new Set(
          (bookingsResult.data || []).map((b) => b.session_id)
        );

        const calendarEvents = transformSessionsToEvents(
          data,
          userBookedSessions
        );

        setEvents(calendarEvents);
        setSelectedWorkout((prev) =>
          prev
            ? calendarEvents.find((event) => event.id === prev.id) || prev
            : null
        );
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    []
  );

  // Hydrate user bookings only when an auth cookie exists (zero @supabase/supabase-js download on initial load)
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

    window.addEventListener("app:auth-signed-out", handleSignOut);

    async function initCalendar() {
      const hasCookie = hasSupabaseAuthCookie();

      // Fast path: schedule already server-rendered AND visitor is logged out -> 0 network requests
      if (hasInitialSessions && !hasCookie) {
        return;
      }

      if (!hasCookie) {
        await fetchEvents({ currentUser: null });
        return;
      }

      if (hasInitialSessions) {
        try {
          const res = await fetch("/api/auth/me?includeBookings=1", {
            cache: "no-store",
          });
          if (!isMounted || !res.ok) return;
          const data = await res.json();
          if (!isMounted) return;

          const initialUser = data?.user || null;
          setUser(initialUser);

          if (initialUser && Array.isArray(data?.bookedSessionIds)) {
            const bookedSet = new Set(data.bookedSessionIds);
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
            fetch("/api/auth/me?includeBookings=1", { cache: "no-store" }).then(
              (r) => (r.ok ? r.json() : null)
            ),
          ]);
          if (!isMounted) return;
          const initialUser = authRes?.user || null;
          setUser(initialUser);
          const bookedSet = new Set(authRes?.bookedSessionIds || []);
          const calendarEvents = transformSessionsToEvents(
            sessionsResult.data || [],
            bookedSet
          );
          setEvents(calendarEvents);
        } catch (err) {
          console.error("Error initializing calendar:", err);
        } finally {
          if (isMounted) setLoading(false);
        }
      }
    }

    initCalendar();

    return () => {
      isMounted = false;
      window.removeEventListener("app:auth-signed-out", handleSignOut);
    };
  }, [hasInitialSessions, fetchEvents]);

  // Filtered events based on selected workout type
  const filteredEvents = useMemo(() => {
    if (selectedWorkoutType === "all") return events;
    return events.filter((e) => {
      const title = e.resource?.workoutTitle || e.title;
      return getWorkoutTheme(title).key === selectedWorkoutType;
    });
  }, [events, selectedWorkoutType]);

  // Memoized workout counts for the filter bar pills
  const workoutCounts = useMemo(() => {
    const counts = {};
    for (const event of events) {
      const title = event.resource?.workoutTitle || event.title;
      const key = getWorkoutTheme(title).key;
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, [events]);

  // Dynamic event styles for react-big-calendar
  const eventPropGetter = useCallback((event) => {
    const workoutTitle = event.resource?.workoutTitle || event.title;
    const theme = getWorkoutTheme(workoutTitle);
    return {
      style: {
        backgroundColor: theme.calendarBg,
        color: theme.calendarText,
        borderLeft: `4px solid ${theme.calendarBorder}`,
        borderTop: `1px solid ${theme.calendarBorder}40`,
        borderRight: `1px solid ${theme.calendarBorder}40`,
        borderBottom: `1px solid ${theme.calendarBorder}40`,
      },
    };
  }, []);

  const today = useMemo(() => {
    const d = toGymLocalTime(serverNow ? new Date(serverNow) : new Date());
    d.setHours(0, 0, 0, 0);
    return d;
  }, [serverNow]);

  const handleNavigate = (newDate, newView) => {
    const limits = getDateLimits(newView || view, today);
    const dateToCheck = new Date(newDate);
    dateToCheck.setHours(0, 0, 0, 0);

    if (isBefore(dateToCheck, limits.min) || isAfter(dateToCheck, limits.max)) {
      return;
    }

    setCurrentDate(newDate);
  };

  const handleViewChange = (newView) => {
    startTransition(() => {
      setView(newView);
    });

    const limits = getDateLimits(newView, today);
    const todayForView = new Date(today);

    if (
      isBefore(todayForView, limits.min) ||
      isAfter(todayForView, limits.max)
    ) {
      setCurrentDate(limits.min);
    } else {
      setCurrentDate(todayForView);
    }
  };

  const handleSelectEvent = useCallback((event) => {
    setSelectedWorkout(event);
    setShowWorkoutCard(true);
  }, []);

  const handleCloseWorkoutCard = useCallback(() => {
    setShowWorkoutCard(false);
    setSelectedWorkout(null);
  }, []);

  const handleBookingChange = useCallback(async () => {
    await fetchEvents({ silent: true, bypassCache: true });
  }, [fetchEvents]);

  return {
    loading,
    currentDate,
    today,
    view,
    user,
    selectedWorkoutType,
    selectedWorkout,
    showWorkoutCard,
    filteredEvents,
    workoutCounts,
    eventPropGetter,
    handleWorkoutTypeSelect,
    handleNavigate,
    handleViewChange,
    handleSelectEvent,
    handleCloseWorkoutCard,
    handleBookingChange,
  };
}
