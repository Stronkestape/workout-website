import {
  BOOKING_CANCEL_HOURS,
  BOOKING_CUTOFF_MINUTES,
  CALENDAR_MONTHS_BACK,
  CALENDAR_MONTHS_FORWARD,
  CALENDAR_WEEKS_BACK,
  CALENDAR_WEEKS_FORWARD,
} from "./constants.js";

const APP_TIME_ZONE = "Europe/Budapest";

const addMonthsNative = (date, months) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

const addWeeksNative = (date, weeks) => {
  const d = new Date(date);
  d.setDate(d.getDate() + weeks * 7);
  return d;
};

export const formatTime = (date) => {
  return new Date(date).toLocaleTimeString("hu-HU", { timeZone: APP_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatDate = (date) => {
  return new Date(date).toLocaleDateString("hu-HU", { timeZone: APP_TIME_ZONE,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export const formatDateTime = (dateString) => {
  const date = new Date(dateString);
  return {
    date: date.toLocaleDateString("hu-HU", { timeZone: APP_TIME_ZONE,
      weekday: "short",
      month: "short",
      day: "numeric",
    }),
    time: date.toLocaleTimeString("hu-HU", { timeZone: APP_TIME_ZONE,
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
};

export const getDateLimits = (view, today) => {
  if (view === "month") {
    return {
      min: addMonthsNative(today, -CALENDAR_MONTHS_BACK),
      max: addMonthsNative(today, CALENDAR_MONTHS_FORWARD),
    };
  } else if (view === "week") {
    return {
      min: addWeeksNative(today, -CALENDAR_WEEKS_BACK),
      max: addWeeksNative(today, CALENDAR_WEEKS_FORWARD),
    };
  }
  return { min: today, max: today };
};

export const canBookWorkout = (startTime, now = new Date()) => {
  if (!startTime) return false;
  const workoutTime = new Date(startTime);
  if (Number.isNaN(workoutTime.getTime())) return false;
  const msUntilStart = workoutTime.getTime() - now.getTime();
  return msUntilStart >= BOOKING_CUTOFF_MINUTES * 60 * 1000;
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

  const deadlineFormatted = `${deadline.toLocaleDateString('hu-HU', { timeZone: APP_TIME_ZONE,
    month: 'short',
    day: 'numeric',
  })} ${deadline.toLocaleTimeString('hu-HU', { timeZone: APP_TIME_ZONE,
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
