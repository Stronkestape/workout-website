import { addMonths, subMonths, addWeeks, subWeeks } from "date-fns";
import {
  BOOKING_CANCEL_HOURS,
  CALENDAR_MONTHS_BACK,
  CALENDAR_MONTHS_FORWARD,
  CALENDAR_WEEKS_BACK,
  CALENDAR_WEEKS_FORWARD,
} from "./constants.js";

export const formatTime = (date) => {
  return new Date(date).toLocaleTimeString("hu-HU", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatDate = (date) => {
  return new Date(date).toLocaleDateString("hu-HU", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export const formatDateTime = (dateString) => {
  const date = new Date(dateString);
  return {
    date: date.toLocaleDateString("hu-HU", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }),
    time: date.toLocaleTimeString("hu-HU", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
};

export const getDateLimits = (view, today) => {
  if (view === "month") {
    return {
      min: subMonths(today, CALENDAR_MONTHS_BACK),
      max: addMonths(today, CALENDAR_MONTHS_FORWARD),
    };
  } else if (view === "week") {
    return {
      min: subWeeks(today, CALENDAR_WEEKS_BACK),
      max: addWeeks(today, CALENDAR_WEEKS_FORWARD),
    };
  }
  return { min: today, max: today };
};

export const canCancelBooking = (startTime, now = new Date()) => {
  if (!startTime) return false;
  const workoutTime = new Date(startTime);
  if (Number.isNaN(workoutTime.getTime())) return false;
  const hoursUntil = (workoutTime - now) / (1000 * 60 * 60);
  return hoursUntil >= BOOKING_CANCEL_HOURS;
};

export const getCancellationInfo = (startTime, now = new Date()) => {
  if (!startTime) {
    return {
      canCancel: false,
      deadline: null,
      deadlineFormatted: '',
      isPast: true,
      hoursRemainingToCancel: 0,
    };
  }

  const workoutTime = new Date(startTime);
  if (Number.isNaN(workoutTime.getTime())) {
    return {
      canCancel: false,
      deadline: null,
      deadlineFormatted: '',
      isPast: true,
      hoursRemainingToCancel: 0,
    };
  }

  const isPast = workoutTime <= now;
  const deadline = new Date(
    workoutTime.getTime() - BOOKING_CANCEL_HOURS * 60 * 60 * 1000
  );
  const canCancel = !isPast && now <= deadline;
  const msUntilDeadline = deadline.getTime() - now.getTime();
  const hoursRemainingToCancel = Math.max(
    0,
    Math.round((msUntilDeadline / (1000 * 60 * 60)) * 10) / 10
  );

  const deadlineFormatted = `${deadline.toLocaleDateString('hu-HU', {
    month: 'short',
    day: 'numeric',
  })} ${deadline.toLocaleTimeString('hu-HU', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;

  return {
    canCancel,
    deadline,
    deadlineFormatted,
    isPast,
    hoursRemainingToCancel,
  };
};
