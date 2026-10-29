export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 6,
  USERNAME_MAX_LENGTH: 20,
  USERNAME_MIN_LENGTH: 3,
  EMAIL_MAX_LENGTH: 255,
};

export const MESSAGES = {
  PASSWORD_TOO_SHORT: `Password must be at least ${VALIDATION.PASSWORD_MIN_LENGTH} characters`,
  USERNAME_TOO_LONG: `Username must be at most ${VALIDATION.USERNAME_MAX_LENGTH} characters`,
  USERNAME_TOO_SHORT: `Username must be at least ${VALIDATION.USERNAME_MIN_LENGTH} characters`,
  USERNAME_TAKEN: "Username is already taken",
  EMAIL_TAKEN: "This email address is already registered",
  INVALID_EMAIL: "Please enter a valid email address",
  PROFILE_UPDATED: "Profile updated successfully!",
  PROFILE_UPDATED_EMAIL_VERIFY: "Profile updated! Please check your new email to confirm the change.",
  PASSWORD_UPDATED: "Password updated successfully!",
  PASSWORDS_DONT_MATCH: "Passwords do not match",
  INVALID_LOGIN: "Invalid email/username or password",
  USER_NOT_FOUND: "Email or username not found",
  SOMETHING_WENT_WRONG: "Something went wrong. Please try again.",
};

export const USER_TIERS = {
  REGULAR: "regular",
  INSTRUCTOR: "instructor",
  ADMIN: "admin",
};

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;
export const USERNAME_PATTERN = /^[a-z0-9_.]{3,20}$/;
export const PASSWORD_MIN_LENGTH = 6;
export const FULL_NAME_MAX_LENGTH = 100;

export const BOOKING_CANCEL_HOURS = 2;
export const CALENDAR_MONTHS_BACK = 1;
export const CALENDAR_MONTHS_FORWARD = 1;
export const CALENDAR_WEEKS_BACK = 1;
export const CALENDAR_WEEKS_FORWARD = 4;

export const CALENDAR_MIN_HOUR = 6;
export const CALENDAR_MAX_HOUR = 22;
export const CALENDAR_SCROLL_TO_HOUR = 8;
export const CALENDAR_STEP_MINUTES = 30;
export const CALENDAR_TIMESLOTS = 2;

export const SPOTS_ALMOST_FULL_THRESHOLD = 3;
export const SPOTS_FULL_THRESHOLD = 0;
