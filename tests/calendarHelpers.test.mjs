import test from "node:test";
import assert from "node:assert/strict";
import {
  canBookWorkout,
  canCancelBooking,
  getCancellationInfo,
  getDateLimits,
  formatDateTime,
  toGymLocalTime,
} from "../src/utils/calendarHelpers.ts";

test("canBookWorkout - strictly enforces the 30-minute booking cutoff window", () => {
  const referenceNow = new Date("2026-11-01T10:00:00.000Z");

  // 31 minutes in the future -> allowed
  assert.equal(
    canBookWorkout("2026-11-01T10:31:00.000Z", referenceNow),
    true
  );

  // Exactly 30 minutes in the future -> allowed
  assert.equal(
    canBookWorkout("2026-11-01T10:30:00.000Z", referenceNow),
    true
  );

  // 29 minutes in the future -> rejected (less than 30-min cutoff)
  assert.equal(
    canBookWorkout("2026-11-01T10:29:00.000Z", referenceNow),
    false
  );

  // Ongoing / started / in the past -> rejected
  assert.equal(
    canBookWorkout("2026-11-01T09:45:00.000Z", referenceNow),
    false
  );

  // Missing or invalid input -> rejected safely
  assert.equal(canBookWorkout(null, referenceNow), false);
  assert.equal(canBookWorkout("invalid-date", referenceNow), false);
});

test("canCancelBooking - strictly enforces the 2-hour cancellation cutoff window", () => {
  const referenceNow = new Date("2026-11-01T10:00:00.000Z");

  // 2 hours and 1 minute in the future -> allowed
  assert.equal(
    canCancelBooking("2026-11-01T12:01:00.000Z", referenceNow),
    true
  );

  // Exactly 2 hours (120 minutes) in the future -> allowed
  assert.equal(
    canCancelBooking("2026-11-01T12:00:00.000Z", referenceNow),
    true
  );

  // 1 hour and 59 minutes in the future -> rejected
  assert.equal(
    canCancelBooking("2026-11-01T11:59:00.000Z", referenceNow),
    false
  );

  // Already started / in the past -> rejected
  assert.equal(
    canCancelBooking("2026-11-01T09:30:00.000Z", referenceNow),
    false
  );

  // Invalid or missing input -> rejected safely
  assert.equal(canCancelBooking(null, referenceNow), false);
  assert.equal(canCancelBooking("invalid-date", referenceNow), false);
});

test("getCancellationInfo - computes accurate deadlines, status flags, and formatted text", () => {
  const referenceNow = new Date("2026-11-01T10:00:00.000Z");

  // 5 hours in future -> canCancel is true, cutoff is 3 hours from now
  const futureInfo = getCancellationInfo("2026-11-01T15:00:00.000Z", referenceNow);
  assert.equal(futureInfo.canCancel, true);
  assert.equal(futureInfo.isPast, false);
  assert.equal(futureInfo.hoursRemainingToCancel, 3);
  assert.ok(futureInfo.deadlineFormatted.length > 0);

  // 1 hour in future -> canCancel is false (past 2-hour cutoff)
  const lockedInfo = getCancellationInfo("2026-11-01T11:00:00.000Z", referenceNow);
  assert.equal(lockedInfo.canCancel, false);
  assert.equal(lockedInfo.isPast, false);
  assert.equal(lockedInfo.hoursRemainingToCancel, 0);

  // In past -> canCancel is false, isPast is true
  const pastInfo = getCancellationInfo("2026-11-01T09:00:00.000Z", referenceNow);
  assert.equal(pastInfo.canCancel, false);
  assert.equal(pastInfo.isPast, true);
});

test("getDateLimits - calculates month and week navigation boundaries around reference date", () => {
  const today = new Date("2026-11-15T12:00:00.000Z");

  const monthLimits = getDateLimits("month", today);
  assert.ok(monthLimits.min < today);
  assert.ok(monthLimits.max > today);

  const weekLimits = getDateLimits("week", today);
  assert.ok(weekLimits.min < today);
  assert.ok(weekLimits.max > today);

  // Unknown view falls back to { min: today, max: today }
  const fallbackLimits = getDateLimits("day", today);
  assert.deepEqual(fallbackLimits, { min: today, max: today });
});

test("formatDateTime - returns formatted date and time strings", () => {
  const result = formatDateTime("2026-11-15T18:30:00.000Z");
  assert.equal(typeof result.date, "string");
  assert.equal(typeof result.time, "string");
  assert.ok(result.date.length > 0);
  assert.ok(result.time.length > 0);
});

test("toGymLocalTime - projects UTC timestamps to Europe/Budapest wall-clock hours", () => {
  // 2026-11-15T17:30:00.000Z is 18:30 in Europe/Budapest (CET = UTC+1)
  const gymDate = toGymLocalTime("2026-11-15T17:30:00.000Z");
  assert.equal(gymDate.getFullYear(), 2026);
  assert.equal(gymDate.getMonth(), 10); // November (0-indexed)
  assert.equal(gymDate.getDate(), 15);
  assert.equal(gymDate.getHours(), 18);
  assert.equal(gymDate.getMinutes(), 30);
});
