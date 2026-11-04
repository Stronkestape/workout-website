"use client";

import dynamic from "next/dynamic";
import styles from "./Calendar.module.css";
import CalendarToolbar from "@/components/CalendarToolbar";
import CalendarEvent from "@/components/CalendarEvent";
import DesktopCalendar from "@/components/DesktopCalendar";
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

const WorkoutCard = dynamic(() => import("@/components/WorkoutCard"), {
  ssr: false,
});

export default function CalendarClient({
  initialSessions = null,
  serverNow = null,
}) {
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
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
            Csoportos Órarend & Foglalás
          </h1>
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

        {/* Desktop & Tablet Full Calendar Grid (>= 768px) */}
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
