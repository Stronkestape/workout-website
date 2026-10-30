"use client";

import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";

import {
  format,
  parse,
  startOfWeek,
  endOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  isSameDay,
  getDay,
  isBefore,
  isAfter,
} from "date-fns";
import hu from "date-fns/locale/hu";
import { useState, useEffect, useCallback, useMemo } from "react";
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

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: {
    hu: hu,
  },
});

export default function CalendarPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState("week");
  const [user, setUser] = useState(null);
  const [selectedWorkoutType, setSelectedWorkoutType] = useState("all");

  // Workout card state
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [showWorkoutCard, setShowWorkoutCard] = useState(false);
  const [selectedMobileDay, setSelectedMobileDay] = useState(null);

  const getCurrentUser = async () => {
    const {
      data: { user },
    } = await supabaseBrowser.auth.getUser();
    setUser(user);
  };

  const fetchEvents = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (!silent) {
          setLoading(true);
        }

        const { data, error } = await fetchClassSessions();

        if (error) {
          throw error;
        }

        // Get user's bookings if logged in
        let userBookedSessions = new Set();
        if (user) {
          const { data: bookingsData } = await supabaseBrowser
            .from("bookings")
            .select("session_id")
            .eq("user_id", user.id)
            .eq("booking_status", "confirmed");

          if (bookingsData) {
            userBookedSessions = new Set(bookingsData.map((b) => b.session_id));
          }
        }

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
    [user]
  );

  // Get current user
  useEffect(() => {
    getCurrentUser();
  }, []);

  // Fetch events from Supabase
  useEffect(() => {
    fetchEvents();
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
      return; // Don't navigate if outside limits
    }

    setCurrentDate(newDate);
  };

  const handleViewChange = (newView) => {
    setView(newView);

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

  if (loading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 py-6">
        <h2 className="text-xl sm:text-2xl font-bold mb-4 text-stone-900">
          Workout Calendar
        </h2>
        <div className="flex justify-center items-center h-64 bg-white rounded-xl shadow-xs border border-stone-300">
          <div className="text-base sm:text-lg text-stone-600 font-medium">
            Loading classes...
          </div>
        </div>
      </div>
    );
  }

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

  const mobileWeekEvents = filteredEvents
    .filter((e) => e.start >= mobileWeekStart && e.start <= mobileWeekEnd)
    .sort((a, b) => a.start - b.start);

  const visibleMobileDays = selectedMobileDay
    ? mobileWeekDays.filter((d) => isSameDay(d, selectedMobileDay))
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
            Válaszd ki a számodra megfelelő csoportos órát és foglald le a helyed
          </p>
        </div>

        {/* Workout Category Filter & Color Legend Bar */}
        <div className="mb-4 bg-white rounded-xl shadow-xs border border-stone-300 p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-stone-600">
              <FilterIcon className="w-3.5 h-3.5" />
              <span>Mozgásforma szűrő és színkódok</span>
            </div>
            {selectedWorkoutType !== "all" && (
              <button
                onClick={() => setSelectedWorkoutType("all")}
                className="text-xs text-green-700 hover:text-green-800 font-semibold underline focus-visible:outline-none"
              >
                Szűrő törlése
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hidden">
            <button
              onClick={() => setSelectedWorkoutType("all")}
              aria-pressed={selectedWorkoutType === "all"}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 border ${
                selectedWorkoutType === "all"
                  ? "bg-stone-900 text-white border-stone-900 shadow-xs"
                  : "bg-stone-100 text-stone-800 hover:bg-stone-200 border-stone-300"
              }`}
            >
              <span>Összes edzés</span>
              <span className="text-[10px] opacity-75">({events.length})</span>
            </button>

            {Object.values(WORKOUT_THEMES).map((theme) => {
              const isSelected = selectedWorkoutType === theme.key;
              const count = workoutCounts[theme.key] || 0;
              const displayLabel = theme.label || theme.key;

              return (
                <button
                  key={theme.key}
                  onClick={() =>
                    setSelectedWorkoutType(isSelected ? "all" : theme.key)
                  }
                  aria-pressed={isSelected}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 border ${
                    isSelected
                      ? "ring-2 ring-stone-900 shadow-xs font-bold"
                      : "hover:opacity-95"
                  }`}
                  style={{
                    backgroundColor: theme.calendarBg,
                    borderColor: isSelected
                      ? theme.calendarBorder
                      : `${theme.calendarBorder}60`,
                    color: theme.calendarText,
                  }}
                  title={`Szűrés: ${displayLabel}`}
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
                  {count > 0 && (
                    <span className="text-[10px] font-bold opacity-75">
                      ({count})
                    </span>
                  )}
                </button>
              );
            })}

            {workoutCounts["default"] > 0 && (
              <button
                key="default"
                onClick={() =>
                  setSelectedWorkoutType(
                    selectedWorkoutType === "default" ? "all" : "default"
                  )
                }
                aria-pressed={selectedWorkoutType === "default"}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 border ${
                  selectedWorkoutType === "default"
                    ? "ring-2 ring-stone-900 shadow-xs font-bold"
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
                title={`Szűrés: ${DEFAULT_THEME.label}`}
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
                <span className="text-[10px] font-bold opacity-75">
                  ({workoutCounts["default"]})
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Schedule View (< 768px) */}
        <div className="md:hidden space-y-4">
          {/* Week Navigation Card */}
          <div className="bg-white rounded-xl shadow-xs border border-stone-300 p-3.5">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-1.5">
                <button
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
                  onClick={handleMobileToday}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-stone-200 text-stone-800 hover:bg-stone-300 transition-colors"
                >
                  Ma
                </button>
                <button
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
                onClick={() => setSelectedMobileDay(null)}
                className={`flex flex-col items-center justify-center py-2 rounded-lg text-xs font-semibold transition-colors ${
                  !selectedMobileDay
                    ? "bg-green-600 text-white shadow-xs"
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
                    key={day.toISOString()}
                    onClick={() =>
                      setSelectedMobileDay(isSelected ? null : day)
                    }
                    className={`flex flex-col items-center justify-center py-1.5 rounded-lg transition-colors relative ${
                      isSelected
                        ? "bg-green-600 text-white shadow-xs"
                        : isTodayDay
                        ? "bg-green-100/70 text-green-900 border border-green-300"
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
                          isSelected ? "bg-white" : "bg-green-600"
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
                      isTodayDay ? "bg-green-50/80" : "bg-stone-100"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-stone-900">
                        {format(day, "EEEE, MMM d")}
                      </span>
                      {isTodayDay && (
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-green-600 text-white rounded-full">
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
                      Erre a napra nincs elérhető edzés.
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
                                      title="Lefoglalva"
                                      aria-label="Lefoglalva"
                                    >
                                      <span aria-hidden="true">✓</span>
                                      <span className="sr-only">Lefoglalva</span>
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-stone-600 truncate mt-0.5">
                                  Oktató: {instructorName}
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
                    ? "Nincs a kiválasztott mozgásformához edzés ezen a héten."
                    : "Erre a hétre nincs edzés beütemezve."}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Desktop & Tablet Full Calendar Grid (>= 768px) */}
        <div className="hidden md:block">
          <div className={styles.calendarWrapper} key={view}>
            <Calendar
              localizer={localizer}
              events={filteredEvents}
              startAccessor="start"
              endAccessor="end"
              style={{ height: "100%" }}
              culture="hu"
              view={view}
              onView={handleViewChange}
              date={currentDate}
              onNavigate={handleNavigate}
              views={["month", "week"]}
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
              showMultiDayTimes
              onSelectEvent={handleSelectEvent}
            />
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
