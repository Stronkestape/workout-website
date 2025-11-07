import { addMonths, subMonths, addWeeks, subWeeks } from "date-fns";
import { 
  BOOKING_CANCEL_HOURS,
  CALENDAR_MONTHS_BACK,
  CALENDAR_MONTHS_FORWARD,
  CALENDAR_WEEKS_BACK,
  CALENDAR_WEEKS_FORWARD
} from "./constans"

export const formatTime = (date) => {
    return new Date(date).toLocaleTimeString("hu-HU", {
        hour: "2-digit",
        minute: "2-digit"
    } );
};

export const formatDate = (date) => {
    return new Date(date).toLocaleTimeString("hu-HU", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
    });
};

export const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return {
        date : date.toLocaleDateString("hu-HU", {
            weekday: "short",
            month: "short",
            day: "numeric"
        }),
        time: date.toLocaleTimeString("hu-HU", {
            hour: "2-digit",
            minute: "2-digit",
        }),
    };
};

export const getDateLimits = (view, today) => {
  if (view === 'month') {
    return {
      min: subMonths(today, CALENDAR_MONTHS_BACK), // 1 month back
      max: addMonths(today, CALENDAR_MONTHS_FORWARD)  // 1 month forward
    };
  } else if (view === 'week') {
    return {
      min: subWeeks(today, CALENDAR_WEEKS_BACK),  // 1 week back
      max: addWeeks(today, CALENDAR_WEEKS_FORWARD)   // 4 weeks forward
    };
  }
  return { min: today, max: today };
};

export const canCancelBooking = (startTime) => {
  const now = new Date();
  const workoutTime = new Date(startTime);
  const hoursUntil = (workoutTime - now) / (1000 * 60 * 60);
  return hoursUntil >= BOOKING_CANCEL_HOURS;
};