"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import styles from "./Calendar.module.css";
import CalendarToolbar from "@/components/CalendarToolbar";
import CalendarEvent from "@/components/CalendarEvent";
import {
  CALENDAR_MIN_HOUR,
  CALENDAR_MAX_HOUR,
  CALENDAR_SCROLL_TO_HOUR,
  CALENDAR_STEP_MINUTES,
  CALENDAR_TIMESLOTS,
} from "@/utils/constants";
import { useCalendarSchedule } from "./hooks/useCalendarSchedule";
import CategoryFilterBar from "./components/CategoryFilterBar";
import MobileScheduleView from "./components/MobileScheduleView";
import { DesktopCalendarSkeleton } from "./components/CalendarSkeleton";

// Dynamic imports to optimize initial client bundle size
const DesktopCalendar = dynamic(() => import("@/components/DesktopCalendar"), {
  ssr: false,
  loading: () => <DesktopCalendarSkeleton label="Órarend betöltése..." />,
});

const WorkoutCard = dynamic(() => import("@/components/WorkoutCard"), {
  ssr: false,
});

export default function CalendarClient({
  initialSessions = null,
  serverNow = null,
}) {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mql.matches);
    const handler = (e) => setIsDesktop(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const {
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
  } = useCalendarSchedule({ initialSessions, serverNow });

  return (
    <>
      <div className="container mx-auto px-3 sm:px-6 py-4 sm:py-6">
        {/* Page Title & Context (Hungarian) */}
        <div className="mb-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
            Csoportos Órarend & Foglalás
          </h2>
          <p className="text-sm text-stone-600 mt-1">
            Böngéssz prémium csoportos óráink között, szűrj kategóriák szerint és foglald le a helyed másodpercek alatt!
          </p>
        </div>

        {/* Workout Category Filter & Color Legend Bar */}
        <CategoryFilterBar
          selectedWorkoutType={selectedWorkoutType}
          workoutCounts={workoutCounts}
          onSelectType={handleWorkoutTypeSelect}
        />

        {/* Mobile Schedule View (< 768px) */}
        <MobileScheduleView
          currentDate={currentDate}
          today={today}
          loading={loading}
          filteredEvents={filteredEvents}
          selectedWorkoutType={selectedWorkoutType}
          onNavigate={handleNavigate}
          onSelectEvent={handleSelectEvent}
        />

        {/* Desktop & Tablet Full Calendar Grid (>= 768px) - Conditional on breakpoint to avoid bundle download on mobile */}
        {isDesktop && (
          <div className="hidden md:block">
            <div className={styles.calendarWrapper} key={view}>
              {loading ? (
                <DesktopCalendarSkeleton label="Órarend betöltése..." />
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
        )}
      </div>

      {/* Workout Card Modal - lazily loaded only when a workout is selected */}
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
