import test from "node:test";
import assert from "node:assert/strict";
import {
  TEMPLATE_LIMITS,
  validateTemplate,
} from "../src/utils/templateValidation.js";
import {
  validateSession,
  calculateEndTime,
  formatDateTimeLocal,
} from "../src/utils/sessionValidation.js";

test("validateTemplate - accepts valid template and enforces exact numeric boundaries", () => {
  const baseValid = {
    title: "Morning HIIT Blast",
    duration: 45,
    max_capacity: 15,
  };

  assert.equal(validateTemplate(baseValid).isValid, true);

  // Exact lower & upper boundaries: duration (15..180), max_capacity (1..100)
  assert.equal(
    validateTemplate({
      title: "Quick Express",
      duration: TEMPLATE_LIMITS.DURATION_MIN,
      max_capacity: TEMPLATE_LIMITS.CAPACITY_MIN,
    }).isValid,
    true
  );
  assert.equal(
    validateTemplate({
      title: "Endurance Marathon",
      duration: TEMPLATE_LIMITS.DURATION_MAX,
      max_capacity: TEMPLATE_LIMITS.CAPACITY_MAX,
    }).isValid,
    true
  );

  // Just outside boundaries
  assert.equal(
    validateTemplate({ ...baseValid, duration: TEMPLATE_LIMITS.DURATION_MIN - 1 }).isValid,
    false
  );
  assert.equal(
    validateTemplate({ ...baseValid, duration: TEMPLATE_LIMITS.DURATION_MAX + 1 }).isValid,
    false
  );
  assert.equal(
    validateTemplate({ ...baseValid, max_capacity: TEMPLATE_LIMITS.CAPACITY_MIN - 1 }).isValid,
    false
  );
  assert.equal(
    validateTemplate({ ...baseValid, max_capacity: TEMPLATE_LIMITS.CAPACITY_MAX + 1 }).isValid,
    false
  );
});

test("validateTemplate - guards against NaN, non-numeric strings, and whitespace-only titles", () => {
  const nanResult = validateTemplate({
    title: "   ",
    duration: "not-a-number",
    max_capacity: NaN,
  });

  assert.equal(nanResult.isValid, false);
  assert.ok(nanResult.errors.title, "Should reject whitespace-only title");
  assert.ok(nanResult.errors.duration, "Should reject NaN duration");
  assert.ok(nanResult.errors.max_capacity, "Should reject NaN max_capacity");
});

test("validateSession - prevents scheduling new sessions in the past or with end_time <= start_time", () => {
  const now = Date.now();
  const pastStart = new Date(now - 2 * 60 * 60 * 1000).toISOString();
  const pastEnd = new Date(now - 1 * 60 * 60 * 1000).toISOString();
  const futureStart = new Date(now + 24 * 60 * 60 * 1000).toISOString();
  const futureEnd = new Date(now + 25 * 60 * 60 * 1000).toISOString();

  // Creating a new session in the past must fail
  const createPast = validateSession(
    { class_id: "class-1", start_time: pastStart, end_time: pastEnd },
    false
  );
  assert.equal(createPast.isValid, false);
  assert.equal(createPast.errors.start_time, "Cannot schedule sessions in the past");

  // Editing an existing session that started in the past must succeed
  const editPast = validateSession(
    { class_id: "class-1", start_time: pastStart, end_time: pastEnd },
    true
  );
  assert.equal(editPast.isValid, true);

  // End time before or equal to start time must fail
  const invertedTimes = validateSession(
    { class_id: "class-1", start_time: futureEnd, end_time: futureStart },
    false
  );
  assert.equal(invertedTimes.isValid, false);
  assert.equal(invertedTimes.errors.end_time, "End time must be after start time");

  // Valid future session
  const validFuture = validateSession(
    { class_id: "class-1", start_time: futureStart, end_time: futureEnd },
    false
  );
  assert.equal(validFuture.isValid, true);

  // Invalid date strings must be caught
  const malformedDates = validateSession(
    { class_id: "class-1", start_time: "invalid-start", end_time: "invalid-end" },
    true
  );
  assert.equal(malformedDates.isValid, false);
  assert.equal(malformedDates.errors.start_time, "Invalid start time");
  assert.equal(malformedDates.errors.end_time, "Invalid end time");
});

test("calculateEndTime & formatDateTimeLocal - accurately adds duration minutes in local datetime format", () => {
  const startLocal = new Date(2026, 10, 15, 17, 30, 0); // 2026-11-15T17:30 local
  const formattedStart = formatDateTimeLocal(startLocal);
  assert.equal(formattedStart, "2026-11-15T17:30");

  const calculatedEnd = calculateEndTime(formattedStart, 45);
  assert.equal(calculatedEnd, "2026-11-15T18:15");
});
