// Username constraints
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;
export const USERNAME_PATTERN = /^[a-z0-9_.]{3,20}$/;

// Password constraints
export const PASSWORD_MIN_LENGTH = 6;

// Full name constraints
export const FULL_NAME_MAX_LENGTH = 100;

// Booking constraints
export const BOOKING_CANCEL_HOURS = 2; // Hours before workout that booking can be cancelled

// Calendar navigation limits
export const CALENDAR_MONTHS_BACK = 1;
export const CALENDAR_MONTHS_FORWARD = 1;
export const CALENDAR_WEEKS_BACK = 1;
export const CALENDAR_WEEKS_FORWARD = 4;

// Calendar time settings
export const CALENDAR_MIN_HOUR = 6;  // 6:00 AM
export const CALENDAR_MAX_HOUR = 22; // 10:00 PM
export const CALENDAR_SCROLL_TO_HOUR = 8; // 8:00 AM
export const CALENDAR_STEP_MINUTES = 30;
export const CALENDAR_TIMESLOTS = 2;

// Spots left thresholds
export const SPOTS_ALMOST_FULL_THRESHOLD = 3;
export const SPOTS_FULL_THRESHOLD = 0;