"use client";

import dynamic from "next/dynamic";
import {
  format,
  startOfWeek,
  endOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  isSameDay,
  isBefore,
  isAfter,
} from "date-fns";

const DesktopCalendar = dynamic(() => import("@/components/DesktopCalendar"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-stone-200/50 rounded-2xl animate-pulse flex items-center justify-center border border-stone-300">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-warm-terracotta border-t-transparent animate-spin" />
        <span className="text-stone-500 font-medium text-sm">
          Loading calendar view...
        </span>
      </div>
    </div>
  ),
});
import { useState, useEffect, useCallback, useMemo, useRef, Suspense, startTransition } from "react";
import { useSearchParams } from "next/navigation";
import styles from "./Calendar.module.css";
import { supabaseBrowser } from "@/lib/browser";
import WorkoutCard from "@/components/WorkoutCard";
import CalendarToolbar from "@/components/CalendarToolbar";
import CalendarEvent from "@/components/CalendarEvent";
import WorkoutIcon from "@/components/WorkoutIcon";
import { getDateLimits } from "@/utils/calendarHelpers";
import { fetchClassSessions } from "@/utils/supabaseQueries";
import {
  getWorkoutTheme,
  WORKOUT_THEMES,
  DEFAULT_THEME,
  normalizeWorkoutKey,
} from "@/utils/workoutThemes";
import {
  CALENDAR_MIN_HOUR,
  CALENDAR_MAX_HOUR,
  CALENDAR_SCROLL_TO_HOUR,
  CALENDAR_STEP_MINUTES,
  CALENDAR_TIMESLOTS,
  SPOTS_FULL_THRESHOLD,
  SPOTS_ALMOST_FULL_THRESHOLD,
} from "@/utils/constants";



function CalendarContent() {
  const searchParams = useSearchParams();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  // Scroll to top instantly on mount so users navigating from scrolled pages land at the calendar top
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState("week");
  const [user, setUser] = useState(null);
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const [selectedWorkoutType, setSelectedWorkoutType] = useState("all");

  // Workout card state
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [showWorkoutCard, setShowWorkoutCard] = useState(false);
  const [selectedMobileDay, setSelectedMobileDay] = useState(null);

  const handleWorkoutTypeSelect = (type) => {
    startTransition(() => {
      setSelectedWorkoutType(type);
    });
  };

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
    async ({ silent = false, currentUser = undefined } = {}) => {
      try {
        if (!silent) {
          setLoading(true);
        }

        const activeUser = currentUser !== undefined ? currentUser : userRef.current;

        const [sessionsResult, bookingsResult] = await Promise.all([
          fetchClassSessions(),
          activeUser
            ? supabaseBrowser
                .from("bookings")
                .select("session_id")
                .eq("user_id", activeUser.id)
                .eq("booking_status", "confirmed")
            : Promise.resolve({ data: [] }),
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
            session.workout_classes.max_capacity - (session.current_bookings || 0)
          );

          // Get instructor display name
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
              instructorName: instructorName,
              spotsLeft: spotsLeft,
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

  // Get current date without time for comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const handleNavigate = (newDate, newView) => {
    const limits = getDateLimits(newView || view, today);
    const dateToCheck = new Date(newDate);
    dateToCheck.setHours(0, 0, 0, 0);

    // Check if the new date is within allowed range
    if (isBefore(dateToCheck, limits.min) || isAfter(dateToCheck, limits.max)) {
      return;
    }

    setCurrentDate(newDate);
  };

  const handleViewChange = (newView) => {
    startTransition(() => {
      setView(newView);
    });

    // Reset to today when changing views to ensure we're within limits
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

  const handleSelectEvent = (event) => {
    setSelectedWorkout(event);
    setShowWorkoutCard(true);
  };

  const handleCloseWorkoutCard = () => {
    setShowWorkoutCard(false);
    setSelectedWorkout(null);
  };

  const handleBookingChange = async () => {
    await fetchEvents({ silent: true }); // Refresh calendar and selectedWorkout without full-page loading flash
  };

  // Mobile week calculation (Monday start)
  const mobileWeekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const mobileWeekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const mobileWeekDays = Array.from({ length: 7 }, (_, i) =>
    addDays(mobileWeekStart, i)
  );

  const weekLimits = getDateLimits("week", today);
  const prevWeekDate = subWeeks(currentDate, 1);
  prevWeekDate.setHours(0, 0, 0, 0);
  const nextWeekDate = addWeeks(currentDate, 1);
  nextWeekDate.setHours(0, 0, 0, 0);
  const canMobileGoPrev = !isBefore(prevWeekDate, weekLimits.min);
  const canMobileGoNext = !isAfter(nextWeekDate, weekLimits.max);

  const handleMobilePrevWeek = () => {
    if (canMobileGoPrev) {
      setSelectedMobileDay(null);
      handleNavigate(subWeeks(currentDate, 1), "week");
    }
  };

  const handleMobileNextWeek = () => {
    if (canMobileGoNext) {
      setSelectedMobileDay(null);
      handleNavigate(addWeeks(currentDate, 1), "week");
    }
  };

  const handleMobileToday = () => {
    setSelectedMobileDay(null);
    handleNavigate(new Date(), "week");
  };

  const isCurrentWeek = today >= mobileWeekStart && today <= mobileWeekEnd;

  const mobileWeekEvents = filteredEvents
    .filter((e) => {
      if (e.start < mobileWeekStart || e.start > mobileWeekEnd) return false;
      if (!selectedMobileDay && isCurrentWeek) {
        return isSameDay(e.start, today) || isAfter(e.start, today);
      }
      return true;
    })
    .sort((a, b) => a.start - b.start);

  const visibleMobileDays = selectedMobileDay
    ? mobileWeekDays.filter((d) => isSameDay(d, selectedMobileDay))
    : isCurrentWeek
    ? mobileWeekDays.filter((d) => isSameDay(d, today) || isAfter(d, today))
    : mobileWeekDays;

  return (
    <>
      <div className="container mx-auto px-3 sm:px-6 py-4 sm:py-6">
        {/* Page Title & Context */}
        <div className="mb-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
            Workout Calendar
          </h2>
          <p className="text-sm text-stone-600 mt-1">
            Browse group classes, filter by workout category, and book your spot.
          </p>
        </div>

        {/* Workout Category Filter & Color Legend Bar */}
        <div className="mb-4 bg-white rounded-xl shadow-xs border border-stone-300 p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-stone-600">
              <FilterIcon className="w-3.5 h-3.5" />
              <span>Category Filter & Color Legend</span>
            </div>
            {selectedWorkoutType !== "all" && (
              <button
                type="button"
                onClick={() => handleWorkoutTypeSelect("all")}
                className="text-xs text-warm-terracotta hover:underline font-semibold focus-visible:outline-none"
              >
                Clear Filter
              </button>
            )}
          </div>

          {/* Desktop and Mobile: Flex wrap with ample vertical clearance so active rings are never clipped */}
          <div className="flex flex-wrap items-center gap-2 py-1.5 px-0.5">
            <button
              type="button"
              onClick={() => handleWorkoutTypeSelect("all")}
              aria-pressed={selectedWorkoutType === "all"}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 border ${
                selectedWorkoutType === "all"
                  ? "bg-stone-900 text-white border-stone-900 shadow-xs ring-2 ring-stone-900 ring-offset-1"
                  : "bg-stone-100 text-stone-800 hover:bg-stone-200 border-stone-300"
              }`}
            >
              <span>All Workouts</span>
            </button>

            {Object.values(WORKOUT_THEMES).map((theme) => {
              const isSelected = selectedWorkoutType === theme.key;
              const count = workoutCounts[theme.key] || 0;
              const displayLabel = theme.label || theme.key;

              return (
                <button
                  type="button"
                  key={theme.key}
                  onClick={() =>
                    handleWorkoutTypeSelect(isSelected ? "all" : theme.key)
                  }
                  aria-pressed={isSelected}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 border ${
                    isSelected
                      ? "ring-2 ring-stone-900 ring-offset-1 shadow-sm font-bold"
                      : "hover:opacity-95"
                  }`}
                  style={{
                    backgroundColor: theme.calendarBg,
                    borderColor: isSelected
                      ? theme.calendarBorder
                      : `${theme.calendarBorder}60`,
                    color: theme.calendarText,
                  }}
                  title={`Filter by: ${displayLabel}`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: theme.calendarBorder }}
                    aria-hidden="true"
                  />
                  <WorkoutIcon
                    title={theme.key}
                    className="w-3.5 h-3.5 shrink-0 opacity-85"
                  />
                  <span>{displayLabel}</span>
                </button>
              );
            })}

            {workoutCounts["default"] > 0 && (
              <button
                type="button"
                key="default"
                onClick={() =>
                  handleWorkoutTypeSelect(
                    selectedWorkoutType === "default" ? "all" : "default"
                  )
                }
                aria-pressed={selectedWorkoutType === "default"}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 border ${
                  selectedWorkoutType === "default"
                    ? "ring-2 ring-stone-900 ring-offset-1 shadow-sm font-bold"
                    : "hover:opacity-95"
                }`}
                style={{
                  backgroundColor: DEFAULT_THEME.calendarBg,
                  borderColor:
                    selectedWorkoutType === "default"
                      ? DEFAULT_THEME.calendarBorder
                      : `${DEFAULT_THEME.calendarBorder}60`,
                  color: DEFAULT_THEME.calendarText,
                }}
                title={`Filter by: ${DEFAULT_THEME.label}`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: DEFAULT_THEME.calendarBorder }}
                  aria-hidden="true"
                />
                <WorkoutIcon
                  title="default"
                  className="w-3.5 h-3.5 shrink-0 opacity-85"
                />
                <span>{DEFAULT_THEME.label}</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Schedule View (< 768px) */}
        <div className="md:hidden space-y-4">
          {loading ? (
            <div className="space-y-4 animate-pulse">
              <div className="bg-white rounded-xl border border-stone-300 h-28 p-4 flex flex-col justify-between">
                <div className="h-5 bg-stone-200 rounded w-1/3" />
                <div className="grid grid-cols-8 gap-1">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-10 bg-stone-100 rounded" />
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-xl border border-stone-300 h-36 p-4 flex items-center justify-center">
                <div className="w-6 h-6 rounded-full border-2 border-warm-terracotta border-t-transparent animate-spin" />
              </div>
              <div className="bg-white rounded-xl border border-stone-300 h-36 p-4" />
            </div>
          ) : (
            <>
          {/* Week Navigation Card */}
          <div className="bg-white rounded-xl shadow-xs border border-stone-300 p-3.5">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleMobilePrevWeek}
                  disabled={!canMobileGoPrev}
                  aria-label="Previous week"
                  className={`p-2 rounded-lg text-sm font-semibold transition-colors ${
                    canMobileGoPrev
                      ? "bg-stone-800 text-white active:bg-stone-700"
                      : "bg-stone-200 text-stone-400 cursor-not-allowed"
                  }`}
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleMobileToday}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-stone-200 text-stone-800 hover:bg-stone-300 transition-colors"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={handleMobileNextWeek}
                  disabled={!canMobileGoNext}
                  aria-label="Next week"
                  className={`p-2 rounded-lg text-sm font-semibold transition-colors ${
                    canMobileGoNext
                      ? "bg-stone-800 text-white active:bg-stone-700"
                      : "bg-stone-200 text-stone-400 cursor-not-allowed"
                  }`}
                >
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>
              <div className="text-xs font-bold text-stone-800 text-right">
                {format(mobileWeekStart, "MMM d")} –{" "}
                {format(mobileWeekEnd, "MMM d, yyyy")}
              </div>
            </div>

            {/* 7-Day Filter Strip */}
            <div className="grid grid-cols-8 gap-1">
              <button
                type="button"
                onClick={() => setSelectedMobileDay(null)}
                className={`flex flex-col items-center justify-center py-2 rounded-lg text-xs font-semibold transition-colors ${
                  !selectedMobileDay
                    ? "bg-warm-terracotta text-white shadow-xs"
                    : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                }`}
              >
                <span className="text-[10px] uppercase">All</span>
                <span className="text-xs font-bold mt-0.5">
                  {mobileWeekEvents.length}
                </span>
              </button>
              {mobileWeekDays.map((day) => {
                const isSelected =
                  selectedMobileDay && isSameDay(day, selectedMobileDay);
                const isTodayDay = isSameDay(day, new Date());
                const dayCount = mobileWeekEvents.filter((e) =>
                  isSameDay(e.start, day)
                ).length;

                return (
                  <button
                    type="button"
                    key={day.toISOString()}
                    onClick={() =>
                      setSelectedMobileDay(isSelected ? null : day)
                    }
                    className={`flex flex-col items-center justify-center py-1.5 rounded-lg transition-colors relative ${
                      isSelected
                        ? "bg-warm-terracotta text-white shadow-xs"
                        : isTodayDay
                        ? "bg-warm-terracotta/15 text-stone-900 border border-warm-terracotta/40 font-bold"
                        : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                    }`}
                  >
                    <span className="text-[10px] font-medium uppercase opacity-80">
                      {format(day, "EEE").slice(0, 2)}
                    </span>
                    <span className="text-xs font-bold mt-0.5">
                      {format(day, "d")}
                    </span>
                    {dayCount > 0 && (
                      <span
                        className={`w-1.5 h-1.5 rounded-full mt-1 ${
                          isSelected ? "bg-white" : "bg-warm-terracotta"
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mobile Sessions List grouped by day */}
          <div className="space-y-4">
            {visibleMobileDays.map((day) => {
              const dayEvents = mobileWeekEvents.filter((e) =>
                isSameDay(e.start, day)
              );
              if (dayEvents.length === 0 && !selectedMobileDay) return null;

              const isTodayDay = isSameDay(day, new Date());

              return (
                <div
                  key={day.toISOString()}
                  className="bg-white rounded-xl shadow-xs border border-stone-300 overflow-hidden"
                >
                  <div
                    className={`px-4 py-2.5 border-b border-stone-200 flex items-center justify-between ${
                      isTodayDay ? "bg-warm-terracotta/10" : "bg-stone-100"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-stone-900">
                        {format(day, "EEEE, MMM d")}
                      </span>
                      {isTodayDay && (
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-warm-terracotta text-white rounded-full">
                          Today
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-stone-500 font-medium">
                      {dayEvents.length}{" "}
                      {dayEvents.length === 1 ? "class" : "classes"}
                    </span>
                  </div>

                  {dayEvents.length === 0 ? (
                    <div className="p-6 text-center text-sm text-stone-500 font-medium">
                      No classes scheduled for this day.
                    </div>
                  ) : (
                    <div className="divide-y divide-stone-200">
                      {dayEvents.map((event) => {
                        const {
                          spotsLeft,
                          maxCapacity,
                          isBooked,
                          instructorName,
                          workoutTitle,
                        } = event.resource || {};
                        const isFull = spotsLeft <= SPOTS_FULL_THRESHOLD;
                        const isAlmostFull =
                          spotsLeft <= SPOTS_ALMOST_FULL_THRESHOLD &&
                          spotsLeft > SPOTS_FULL_THRESHOLD;
                        const displayTitle =
                          workoutTitle || event.title.split(" - ")[0];
                        const theme = getWorkoutTheme(displayTitle);

                        return (
                          <button
                            type="button"
                            key={event.id}
                            onClick={() => handleSelectEvent(event)}
                            className="w-full text-left p-3.5 hover:bg-stone-50 active:bg-stone-100 transition-colors flex items-center justify-between gap-3 border-l-4"
                            style={{ borderLeftColor: theme.calendarBorder }}
                          >
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              {/* Time Pill */}
                              <div className="bg-stone-200/90 text-stone-900 rounded-lg px-2.5 py-1.5 text-center shrink-0 min-w-[64px] border border-stone-300/80">
                                <div className="text-xs font-bold leading-tight">
                                  {format(event.start, "HH:mm")}
                                </div>
                                <div className="text-[10px] text-stone-600 leading-tight mt-0.5">
                                  {format(event.end, "HH:mm")}
                                </div>
                              </div>

                              {/* Title & Instructor */}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <WorkoutIcon
                                    title={displayTitle}
                                    className="w-4 h-4 shrink-0 opacity-80"
                                  />
                                  <h4 className="font-bold text-sm text-stone-900 truncate">
                                    {displayTitle}
                                  </h4>
                                  {isBooked && (
                                    <span
                                      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-800 shrink-0 border border-green-300"
                                      title="Booked"
                                      aria-label="Booked"
                                    >
                                      <span aria-hidden="true">✓</span>
                                      <span className="sr-only">Booked</span>
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-stone-600 truncate mt-0.5">
                                  Instructor: {instructorName}
                                </p>
                              </div>
                            </div>

                            {/* Right Side Spots Badge */}
                            <div className="shrink-0 flex items-center gap-1.5">
                              <span
                                className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                  isFull
                                    ? "bg-red-100 text-red-800 border border-red-300"
                                    : isAlmostFull
                                    ? "bg-amber-100 text-amber-900 border border-amber-300"
                                    : "bg-green-100 text-green-900 border border-green-300"
                                }`}
                              >
                                {isFull ? "Full" : `${spotsLeft}/${maxCapacity}`}
                              </span>
                              <ChevronRightIcon className="w-4 h-4 text-stone-400" />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {mobileWeekEvents.length === 0 && (
              <div className="bg-white rounded-xl shadow-xs border border-stone-300 p-8 text-center">
                <p className="text-stone-600 font-medium text-sm">
                  {selectedWorkoutType !== "all"
                    ? "No classes found for the selected category this week."
                    : "No classes scheduled for this week."}
                </p>
              </div>
            )}
          </div>
        </>
          )}
        </div>

        {/* Desktop & Tablet Full Calendar Grid (>= 768px) */}
        <div className="hidden md:block">
          <div className={styles.calendarWrapper} key={view}>
            {loading ? (
              <div className="h-full w-full bg-stone-200/50 rounded-2xl animate-pulse flex items-center justify-center border border-stone-300">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-warm-terracotta border-t-transparent animate-spin" />
                  <span className="text-stone-500 font-medium text-sm">
                    Loading classes...
                  </span>
                </div>
              </div>
            ) : (
              <DesktopCalendar
              events={filteredEvents}
              view={view}
              onView={handleViewChange}
              date={currentDate}
              onNavigate={handleNavigate}
              components={{
                toolbar: CalendarToolbar,
                event: CalendarEvent,
              }}
              eventPropGetter={eventPropGetter}
              step={CALENDAR_STEP_MINUTES}
              timeslots={CALENDAR_TIMESLOTS}
              min={new Date(1970, 1, 1, CALENDAR_MIN_HOUR, 0)}
              max={new Date(1970, 1, 1, CALENDAR_MAX_HOUR, 0)}
              scrollToTime={new Date(1970, 1, 1, CALENDAR_SCROLL_TO_HOUR, 0)}
              onSelectEvent={handleSelectEvent}
            />
            )}
          </div>
        </div>
      </div>

      {/* Workout Card Modal - outside calendar wrapper */}
      {showWorkoutCard && (
        <WorkoutCard
          workout={selectedWorkout}
          user={user}
          onClose={handleCloseWorkoutCard}
          onBookingChange={handleBookingChange}
        />
      )}
    </>
  );
}

export default function CalendarPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-3 sm:px-6 py-4 sm:py-6">
          <div className="mb-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
              Workout Calendar
            </h2>
            <p className="text-sm text-stone-600 mt-1">
              Browse group classes, filter by workout category, and book your spot.
            </p>
          </div>
          <div className="mb-4 bg-white rounded-xl shadow-xs border border-stone-300 p-3 sm:p-4 h-24 animate-pulse" />
          <div className="hidden md:block">
            <div className={styles.calendarWrapper}>
              <div className="h-full w-full bg-stone-200/50 rounded-2xl animate-pulse flex items-center justify-center border border-stone-300">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-warm-terracotta border-t-transparent animate-spin" />
                  <span className="text-stone-500 font-medium text-sm">
                    Loading calendar view...
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="md:hidden space-y-4 animate-pulse">
            <div className="bg-white rounded-xl border border-stone-300 h-28 p-4" />
            <div className="bg-white rounded-xl border border-stone-300 h-36 p-4" />
            <div className="bg-white rounded-xl border border-stone-300 h-36 p-4" />
          </div>
        </div>
      }
    >
      <CalendarContent />
    </Suspense>
  );
}

function FilterIcon({ className = "w-4 h-4" }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
      />
    </svg>
  );
}

function ChevronLeftIcon({ className = "w-4 h-4" }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 19l-7-7 7-7"
      />
    </svg>
  );
}

function ChevronRightIcon({ className = "w-4 h-4" }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5l7 7-7 7"
      />
    </svg>
  );
}
