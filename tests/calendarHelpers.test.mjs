import test from "node:test";
import assert from "node:assert/strict";
import {
  canCancelBooking,
  getCancellationInfo,
  getDateLimits,
  formatDateTime,
} from "../src/utils/calendarHelpers.js";

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
