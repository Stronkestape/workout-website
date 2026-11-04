import { useState, useCallback } from "react";
import { useScheduleData, type CalendarEvent } from "./useScheduleData";
import { useScheduleNavigation } from "./useScheduleNavigation";
import { useScheduleFilters } from "./useScheduleFilters";
import { useCalendarThemes } from "./useCalendarThemes";
import type { ClassSessionWithDetails } from "@/utils/supabaseQueries";
import type { User } from "@supabase/supabase-js";

export interface UseCalendarScheduleProps {
  initialSessions?: ClassSessionWithDetails[] | null;
  serverNow?: string | null;
}

export interface UseCalendarScheduleReturn {
  loading: boolean;
  currentDate: Date;
  today: Date;
  view: string;
  user: User | null;
  selectedWorkoutType: string;
  selectedWorkout: CalendarEvent | null;
  showWorkoutCard: boolean;
  filteredEvents: CalendarEvent[];
  workoutCounts: Record<string, number>;
  eventPropGetter: (event: any) => { style: React.CSSProperties };
  handleWorkoutTypeSelect: (type: string) => void;
  handleNavigate: (newDate: Date | string, newView?: string) => void;
  handleViewChange: (newView: string) => void;
  handleSelectEvent: (event: CalendarEvent) => void;
  handleCloseWorkoutCard: () => void;
  handleBookingChange: () => Promise<void>;
}

/**
 * High-level orchestration hook for the Workout Calendar.
 * Composes specialized single-responsibility sub-hooks:
 * - useScheduleData (data fetching, session hydration & SWR)
 * - useScheduleNavigation (week/month navigation & boundary clamping)
 * - useScheduleFilters (URL parameter sync, workout categories & counting)
 * - useCalendarThemes (styling & color coding)
 */
export function useCalendarSchedule({
  initialSessions = null,
  serverNow = null,
}: UseCalendarScheduleProps = {}): UseCalendarScheduleReturn {
  const { events, loading, user, fetchEvents } = useScheduleData({
    initialSessions,
  });

  const { currentDate, today, view, handleNavigate, handleViewChange } =
    useScheduleNavigation(serverNow);

  const {
    selectedWorkoutType,
    handleWorkoutTypeSelect,
    filteredEvents,
    workoutCounts,
  } = useScheduleFilters(events);

  const { eventPropGetter } = useCalendarThemes();

  const [selectedWorkout, setSelectedWorkout] = useState<CalendarEvent | null>(null);
  const [showWorkoutCard, setShowWorkoutCard] = useState(false);

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setSelectedWorkout(event);
    setShowWorkoutCard(true);
  }, []);

  const handleCloseWorkoutCard = useCallback(() => {
    setShowWorkoutCard(false);
    setSelectedWorkout(null);
  }, []);

  const handleBookingChange = useCallback(async () => {
    const updatedEvents = await fetchEvents({
      silent: true,
      bypassCache: true,
    });
    if (updatedEvents) {
      setSelectedWorkout((prev) =>
        prev ? updatedEvents.find((e) => e.id === prev.id) || prev : null
      );
    }
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
