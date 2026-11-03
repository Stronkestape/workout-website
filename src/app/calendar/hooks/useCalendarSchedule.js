import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  startTransition,
} from "react";
import { useSearchParams } from "next/navigation";
import { isBefore, isAfter } from "date-fns";
import { supabaseBrowser } from "@/lib/browser";
import { getDateLimits } from "@/utils/calendarHelpers";
import {
  fetchClassSessions,
  fetchUserBookedSessionIds,
} from "@/utils/supabaseQueries";
import {
  getWorkoutTheme,
  WORKOUT_THEMES,
  normalizeWorkoutKey,
} from "@/utils/workoutThemes";

export function useCalendarSchedule() {
  const searchParams = useSearchParams();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState("week");
  const [user, setUser] = useState(null);
  const userRef = useRef(user);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const [selectedWorkoutType, setSelectedWorkoutType] = useState("all");
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [showWorkoutCard, setShowWorkoutCard] = useState(false);

  // Scroll to top instantly on mount so users navigating from scrolled pages land at the calendar top
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  const handleWorkoutTypeSelect = useCallback((type) => {
    startTransition(() => {
      setSelectedWorkoutType(type);
    });
  }, []);

  // Synchronize workout type filter with URL search param "?filter=..."
  useEffect(() => {
    const filterParam = searchParams.get("filter");
    if (filterParam) {
      const normalizedKey = normalizeWorkoutKey(filterParam);
      if (WORKOUT_THEMES[normalizedKey] || normalizedKey === "default") {
        setSelectedWorkoutType(normalizedKey);
      }
    }
  }, [searchParams]);

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

        // Transform data for react-big-calendar
        const calendarEvents = data.map((session) => {
          const spotsLeft = Math.max(
            0,
            session.workout_classes.max_capacity -
              (session.current_bookings || 0)
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

  // Initialize session and fetch events in parallel once on mount (no double-fetching)
  useEffect(() => {
    let isMounted = true;

    async function initCalendar() {
      const {
        data: { session },
      } = await supabaseBrowser.auth.getSession();
      const initialUser = session?.user || null;
      if (isMounted) {
        setUser(initialUser);
        await fetchEvents({ currentUser: initialUser });
      }
    }

    initCalendar();

    const { data: authListener } = supabaseBrowser.auth.onAuthStateChange(
      (_event, session) => {
        if (!isMounted) return;
        const updatedUser = session?.user || null;
        setUser(updatedUser);
        fetchEvents({ silent: true, currentUser: updatedUser });
      }
    );

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, [fetchEvents]);

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

  const today = new Date();
  today.setHours(0, 0, 0, 0);

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
    const todayForView = new Date();

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
