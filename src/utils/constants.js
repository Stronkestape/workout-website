export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 6,
  USERNAME_MAX_LENGTH: 100,
  USERNAME_MIN_LENGTH: 3,
  EMAIL_MAX_LENGTH: 255,
};

export const MESSAGES = {
  PASSWORD_TOO_SHORT: `A jelszónak legalább ${VALIDATION.PASSWORD_MIN_LENGTH} karakter hosszúnak kell lennie`,
  USERNAME_TOO_LONG: `A felhasználónév legfeljebb ${VALIDATION.USERNAME_MAX_LENGTH} karakter lehet`,
  USERNAME_TOO_SHORT: `A felhasználónévnek legalább ${VALIDATION.USERNAME_MIN_LENGTH} karakterből kell állnia`,
  USERNAME_TAKEN: "Ez a felhasználónév már foglalt",
  EMAIL_TAKEN: "Ez az e-mail cím már regisztrálva van",
  INVALID_EMAIL: "Kérjük, adj meg egy érvényes e-mail címet",
  PROFILE_UPDATED: "Profil sikeresen frissítve!",
  PROFILE_UPDATED_EMAIL_VERIFY: "Profil frissítve! Kérjük, erősítsd meg az új e-mail címedet a kiküldött levélben.",
  PASSWORD_UPDATED: "Jelszó sikeresen megváltoztatva!",
  PASSWORDS_DONT_MATCH: "A megadott jelszavak nem egyeznek",
  INVALID_LOGIN: "Hibás e-mail cím/felhasználónév vagy jelszó",
  USER_NOT_FOUND: "Nem található ilyen e-mail cím vagy felhasználónév",
  SOMETHING_WENT_WRONG: "Váratlan hiba történt. Kérjük, próbáld újra!",
};

export const USER_TIERS = {
  REGULAR: "regular",
  INSTRUCTOR: "instructor",
  ADMIN: "admin",
};

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 100;
export const USERNAME_PATTERN = /^[a-z0-9_. ]{3,100}$/;
export const PASSWORD_MIN_LENGTH = 6;
export const FULL_NAME_MAX_LENGTH = 100;

export const BOOKING_CANCEL_HOURS = 2;
export const BOOKING_CUTOFF_MINUTES = 30;
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
