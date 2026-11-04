import {
  BOOKING_CANCEL_HOURS,
  BOOKING_CUTOFF_MINUTES,
  CALENDAR_MONTHS_BACK,
  CALENDAR_MONTHS_FORWARD,
  CALENDAR_WEEKS_BACK,
  CALENDAR_WEEKS_FORWARD,
} from "./constants";

const APP_TIME_ZONE = "Europe/Budapest";

const gymWallClockFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
  hour12: false,
});

export interface FormattedDateTime {
  date: string;
  time: string;
}

export interface DateLimits {
  min: Date;
  max: Date;
}

export interface CancellationInfo {
  canCancel: boolean;
  deadline: Date | null;
  deadlineFormatted: string;
  isPast: boolean;
  hoursRemainingToCancel: number;
}

/**
 * Converts a UTC/ISO Date into a Date whose local wall-clock getters (.getHours(), .getDate(), etc.)
 * match Europe/Budapest time on any runtime (Vercel UTC server or CET/CEST browser).
 */
export const toGymLocalTime = (dateInput: Date | string | number): Date => {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(d.getTime())) return new Date();
  const parts = gymWallClockFormatter.formatToParts(d);
  const map: Record<string, number> = {};
  for (const part of parts) {
    if (part.type !== "literal") {
      map[part.type] = parseInt(part.value, 10);
    }
  }
  const hour = map.hour === 24 ? 0 : map.hour || 0;
  return new Date(
    map.year,
    (map.month || 1) - 1,
    map.day || 1,
    hour,
    map.minute || 0,
    map.second || 0
  );
};

const addMonthsNative = (date: Date, months: number): Date => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

const addWeeksNative = (date: Date, weeks: number): Date => {
  const d = new Date(date);
  d.setDate(d.getDate() + weeks * 7);
  return d;
};

export const formatTime = (date: Date | string | number): string => {
  return new Date(date).toLocaleTimeString("hu-HU", {
    timeZone: APP_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

export const formatDate = (date: Date | string | number): string => {
  return new Date(date).toLocaleDateString("hu-HU", {
    timeZone: APP_TIME_ZONE,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export const formatDateTime = (dateString: string | Date | number): FormattedDateTime => {
  const date = new Date(dateString);
  return {
    date: date.toLocaleDateString("hu-HU", {
      timeZone: APP_TIME_ZONE,
      weekday: "short",
      month: "short",
      day: "numeric",
    }),
    time: date.toLocaleTimeString("hu-HU", {
      timeZone: APP_TIME_ZONE,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
  };
};

export const getDateLimits = (view: string, today: Date): DateLimits => {
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

export const canBookWorkout = (
  startTime: string | Date | null | undefined,
  now = new Date()
): boolean => {
  if (!startTime) return false;
  const workoutTime = new Date(startTime);
  if (Number.isNaN(workoutTime.getTime())) return false;
  const msUntilStart = workoutTime.getTime() - now.getTime();
  return msUntilStart >= BOOKING_CUTOFF_MINUTES * 60 * 1000;
};

export const canCancelBooking = (
  startTime: string | Date | null | undefined,
  now = new Date()
): boolean => {
  if (!startTime) return false;
  const workoutTime = new Date(startTime);
  if (Number.isNaN(workoutTime.getTime())) return false;
  const hoursUntil = (workoutTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  return hoursUntil >= BOOKING_CANCEL_HOURS;
};

export const getCancellationInfo = (
  startTime: string | Date | null | undefined,
  now = new Date()
): CancellationInfo => {
  if (!startTime) {
    return {
      canCancel: false,
      deadline: null,
      deadlineFormatted: "",
      isPast: true,
      hoursRemainingToCancel: 0,
    };
  }

  const workoutTime = new Date(startTime);
  if (Number.isNaN(workoutTime.getTime())) {
    return {
      canCancel: false,
      deadline: null,
      deadlineFormatted: "",
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

  const deadlineFormatted = `${deadline.toLocaleDateString("hu-HU", {
    timeZone: APP_TIME_ZONE,
    month: "short",
    day: "numeric",
  })} ${deadline.toLocaleTimeString("hu-HU", {
    timeZone: APP_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })}`;

  return {
    canCancel,
    deadline,
    deadlineFormatted,
    isPast,
    hoursRemainingToCancel,
  };
};
