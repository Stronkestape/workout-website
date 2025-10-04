"use client";

import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";

import { format, parse, startOfWeek, getDay, isBefore, isAfter } from "date-fns";
import hu from "date-fns/locale/hu";
import { useState, useEffect } from "react";
import styles from './Calendar.module.css';
import { supabaseBrowser } from '@/lib/browser';
import WorkoutCard from '@/app/components/WorkoutCard';
import CalendarToolbar from "@/app/components/CalendarToolbar";
import CalendarEvent from "@/app/components/CalendarEvent";
import { getDateLimits } from '@/utils/calendarHelpers';
import { fetchClassSessions } from '@/utils/supabaseQueries';
import { 
  CALENDAR_MIN_HOUR, 
  CALENDAR_MAX_HOUR, 
  CALENDAR_SCROLL_TO_HOUR,
  CALENDAR_STEP_MINUTES,
  CALENDAR_TIMESLOTS
} from '@/utils/constans';

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
  const [view, setView] = useState('month');
  const [user, setUser] = useState(null);
  
  // Workout card state
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [showWorkoutCard, setShowWorkoutCard] = useState(false);

  // Get current user
  useEffect(() => {
    getCurrentUser();
  }, []);

  // Fetch events from Supabase
  useEffect(() => {
    fetchEvents();
  }, []);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabaseBrowser.auth.getUser();
    setUser(user);
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await fetchClassSessions();

      if (error) {
        throw error;
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
            instructorId: session.instructor_id,
            instructorName: instructorName,
            spotsLeft: spotsLeft,
            maxCapacity: session.workout_classes.max_capacity,
            currentBookings: session.current_bookings || 0
          }
        };
      });

      setEvents(calendarEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get current date without time for comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const handleNavigate = (newDate, view, action) => {
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

  const handleBookingChange = () => {
    fetchEvents(); // Refresh calendar data after booking changes
  };

  if (loading) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">Workout Calendar</h2>
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading classes...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">Workout Calendar</h2>
        
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
