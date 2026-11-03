"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import styles from "./Calendar.module.css";
import WorkoutCard from "@/components/WorkoutCard";
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
import {
  DesktopCalendarSkeleton,
  CalendarPageSkeleton,
} from "./components/CalendarSkeleton";

const DesktopCalendar = dynamic(() => import("@/components/DesktopCalendar"), {
  ssr: false,
  loading: () => <DesktopCalendarSkeleton label="Loading calendar view..." />,
});

function CalendarContent() {
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
  } = useCalendarSchedule();

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

        {/* Desktop & Tablet Full Calendar Grid (>= 768px) */}
        <div className="hidden md:block">
          <div className={styles.calendarWrapper} key={view}>
            {loading ? (
              <DesktopCalendarSkeleton label="Loading classes..." />
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
      fallback={<CalendarPageSkeleton wrapperClassName={styles.calendarWrapper} />}
    >
      <CalendarContent />
    </Suspense>
  );
}
