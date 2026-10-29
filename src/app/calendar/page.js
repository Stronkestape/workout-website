"use client";

import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";

import { format, parse, startOfWeek, endOfWeek, addDays, isSameDay, getDay, isBefore, isAfter } from "date-fns";
import hu from "date-fns/locale/hu";
import { useState, useEffect, useCallback } from "react";
import styles from './Calendar.module.css';
import { supabaseBrowser } from '@/lib/browser';
import WorkoutCard from '@/components/WorkoutCard';
import CalendarToolbar from "@/components/CalendarToolbar";
import CalendarEvent from "@/components/CalendarEvent";
import { getDateLimits, navigateDate } from '@/utils/calendarHelpers';
import { fetchClassSessions } from '@/utils/supabaseQueries';
import { 
  CALENDAR_MIN_HOUR, 
  CALENDAR_MAX_HOUR, 
  CALENDAR_SCROLL_TO_HOUR,
  CALENDAR_STEP_MINUTES,
  CALENDAR_TIMESLOTS
} from '@/utils/constants';

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
  const [view, setView] = useState('week');
  const [user, setUser] = useState(null);
  
  // Workout card state
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [showWorkoutCard, setShowWorkoutCard] = useState(false);
  const [selectedMobileDay, setSelectedMobileDay] = useState(null);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabaseBrowser.auth.getUser();
    setUser(user);
  };

  const fetchEvents = useCallback(async ({ silent = false } = {}) => {
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
          .from('bookings')
          .select('session_id')
          .eq('user_id', user.id)
          .eq('booking_status', 'confirmed');
        
        if (bookingsData) {
          userBookedSessions = new Set(bookingsData.map(b => b.session_id));
        }
      }

      // Transform data for react-big-calendar
      const calendarEvents = data.map(session => {
        const spotsLeft = Math.max(0, session.workout_classes.max_capacity - (session.current_bookings || 0));
        
        // Get instructor display name
        const instructorName = session.instructor 
          ? (session.instructor.full_name || session.instructor.username)
          : 'TBA';
        
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
            isBooked: userBookedSessions.has(session.id)
          }
        };
      });

      setEvents(calendarEvents);
      setSelectedWorkout(prev =>
        prev ? calendarEvents.find(event => event.id === prev.id) || prev : null
      );
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [user]);

  // Get current user
  useEffect(() => {
    getCurrentUser();
  }, []);

  // Fetch events from Supabase
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Get current date without time for comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const handleNavigate = (newDate, view) => {
    const limits = getDateLimits(view, today);
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
    
    if (isBefore(todayForView, limits.min) || isAfter(todayForView, limits.max)) {
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
        <h2 className="text-xl sm:text-2xl font-bold mb-4">Workout Calendar</h2>
        <div className="flex justify-center items-center h-64 bg-white rounded-xl shadow-sm">
          <div className="text-base sm:text-lg text-gray-600">Loading classes...</div>
        </div>
      </div>
    );
  }

  // Mobile week calculation (Monday start)
  const mobileWeekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const mobileWeekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const mobileWeekDays = Array.from({ length: 7 }, (_, i) => addDays(mobileWeekStart, i));

  const weekLimits = getDateLimits('week', today);
  const prevWeekDate = navigateDate(currentDate, 'week', 'PREV');
  prevWeekDate.setHours(0, 0, 0, 0);
  const nextWeekDate = navigateDate(currentDate, 'week', 'NEXT');
  nextWeekDate.setHours(0, 0, 0, 0);
  const canMobileGoPrev = !isBefore(prevWeekDate, weekLimits.min);
  const canMobileGoNext = !isAfter(nextWeekDate, weekLimits.max);

  const handleMobilePrevWeek = () => {
    if (canMobileGoPrev) {
      setSelectedMobileDay(null);
      handleNavigate(navigateDate(currentDate, 'week', 'PREV'), 'week');
    }
  };

  const handleMobileNextWeek = () => {
    if (canMobileGoNext) {
      setSelectedMobileDay(null);
      handleNavigate(navigateDate(currentDate, 'week', 'NEXT'), 'week');
    }
  };

  const handleMobileToday = () => {
    setSelectedMobileDay(null);
    handleNavigate(new Date(), 'week');
  };

  const mobileWeekEvents = events
    .filter((e) => e.start >= mobileWeekStart && e.start <= mobileWeekEnd)
    .sort((a, b) => a.start - b.start);

  const visibleMobileDays = selectedMobileDay
    ? mobileWeekDays.filter((d) => isSameDay(d, selectedMobileDay))
    : mobileWeekDays;

  return (
    <>
      <div className="container mx-auto px-3 sm:px-6 py-4 sm:py-6">
        <h2 className="text-xl sm:text-2xl font-bold mb-4 text-gray-900">Workout Calendar</h2>

        {/* Mobile Schedule View (< 768px) */}
        <div className="md:hidden space-y-4">
          {/* Week Navigation Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3.5">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleMobilePrevWeek}
                  disabled={!canMobileGoPrev}
                  aria-label="Previous week"
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                    canMobileGoPrev
                      ? 'bg-gray-900 text-white active:bg-gray-700'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  ←
                </button>
                <button
                  onClick={handleMobileToday}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-800 hover:bg-gray-200 transition-colors"
                >
                  Today
                </button>
                <button
                  onClick={handleMobileNextWeek}
                  disabled={!canMobileGoNext}
                  aria-label="Next week"
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                    canMobileGoNext
                      ? 'bg-gray-900 text-white active:bg-gray-700'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  →
                </button>
              </div>
              <div className="text-xs font-bold text-gray-800 text-right">
                {format(mobileWeekStart, 'MMM d')} – {format(mobileWeekEnd, 'MMM d, yyyy')}
              </div>
            </div>

            {/* 7-Day Filter Strip */}
            <div className="grid grid-cols-8 gap-1">
              <button
                onClick={() => setSelectedMobileDay(null)}
                className={`flex flex-col items-center justify-center py-2 rounded-lg text-xs font-semibold transition-colors ${
                  !selectedMobileDay
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="text-[10px] uppercase">All</span>
                <span className="text-xs font-bold mt-0.5">{mobileWeekEvents.length}</span>
              </button>
              {mobileWeekDays.map((day) => {
                const isSelected = selectedMobileDay && isSameDay(day, selectedMobileDay);
                const isTodayDay = isSameDay(day, new Date());
                const dayCount = mobileWeekEvents.filter((e) => isSameDay(e.start, day)).length;

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() =>
                      setSelectedMobileDay(isSelected ? null : day)
                    }
                    className={`flex flex-col items-center justify-center py-1.5 rounded-lg transition-colors relative ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-sm'
                        : isTodayDay
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-[10px] font-medium uppercase opacity-80">
                      {format(day, 'EEE').slice(0, 2)}
                    </span>
                    <span className="text-xs font-bold mt-0.5">
                      {format(day, 'd')}
                    </span>
                    {dayCount > 0 && (
                      <span
                        className={`w-1.5 h-1.5 rounded-full mt-1 ${
                          isSelected ? 'bg-white' : 'bg-blue-500'
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
              const dayEvents = mobileWeekEvents.filter((e) => isSameDay(e.start, day));
              if (dayEvents.length === 0 && !selectedMobileDay) return null;

              const isTodayDay = isSameDay(day, new Date());

              return (
                <div key={day.toISOString()} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className={`px-4 py-2.5 border-b border-gray-100 flex items-center justify-between ${
                    isTodayDay ? 'bg-blue-50/70' : 'bg-gray-50'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-gray-900">
                        {format(day, 'EEEE, MMM d')}
                      </span>
                      {isTodayDay && (
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-blue-600 text-white rounded-full">
                          Today
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 font-medium">
                      {dayEvents.length} {dayEvents.length === 1 ? 'class' : 'classes'}
                    </span>
                  </div>

                  {dayEvents.length === 0 ? (
                    <div className="p-6 text-center text-sm text-gray-500">
                      No workouts scheduled for this day.
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {dayEvents.map((event) => {
                        const { spotsLeft, maxCapacity, isBooked, instructorName, workoutTitle } = event.resource || {};
                        const isFull = spotsLeft === 0;
                        const isAlmostFull = spotsLeft > 0 && spotsLeft <= 3;
                        const displayTitle = workoutTitle || event.title.split(' - ')[0];

                        return (
                          <button
                            key={event.id}
                            onClick={() => handleSelectEvent(event)}
                            className="w-full text-left p-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors flex items-center justify-between gap-3"
                          >
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              {/* Time Pill */}
                              <div className="bg-amber-900/10 text-amber-950 rounded-lg px-2.5 py-1.5 text-center shrink-0 min-w-[64px]">
                                <div className="text-xs font-bold leading-tight">
                                  {format(event.start, 'HH:mm')}
                                </div>
                                <div className="text-[10px] text-gray-500 leading-tight mt-0.5">
                                  {format(event.end, 'HH:mm')}
                                </div>
                              </div>

                              {/* Title & Instructor */}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <h4 className="font-bold text-sm text-gray-900 truncate">
                                    {displayTitle}
                                  </h4>
                                  {isBooked && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-800 shrink-0">
                                      ✓ Booked
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-600 truncate mt-0.5">
                                  Coach: {instructorName}
                                </p>
                              </div>
                            </div>

                            {/* Right Side Spots Badge */}
                            <div className="shrink-0 flex items-center gap-1.5">
                              <span
                                className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                  isFull
                                    ? 'bg-red-100 text-red-700'
                                    : isAlmostFull
                                    ? 'bg-orange-100 text-orange-800'
                                    : 'bg-green-100 text-green-800'
                                }`}
                              >
                                {isFull ? 'Full' : `${spotsLeft}/${maxCapacity}`}
                              </span>
                              <span className="text-gray-400 text-xs">›</span>
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
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                <p className="text-gray-600 font-medium text-sm">
                  No workouts scheduled for this week.
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
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: "100%" }}
              culture="hu"
              view={view}
              onView={handleViewChange}
              date={currentDate}
              onNavigate={handleNavigate}
              views={['month', 'week']}
              components={{
                toolbar: CalendarToolbar,
                event: CalendarEvent,
              }}
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
