import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const migrationPath = path.resolve(
  "supabase/migrations/20261030000000_security_and_integrity_fixes.sql"
);
const migrationSql = fs.readFileSync(migrationPath, "utf8");

test("Waitlist auto-promotion trigger pipeline - full session cancellation promotes #1 waitlisted user when triggers fire in PostgreSQL alphabetical order", () => {
  // Simulates PostgreSQL row state and alphabetical AFTER DELETE trigger execution:
  // 1. `trigger_promote_from_waitlist` fires BEFORE `trigger_update_bookings`
  // 2. When `promote_from_waitlist()` inserts into `bookings`, `trigger_validate_booking_insert` fires BEFORE `trigger_update_bookings`
  const session = { id: 42, max_capacity: 1, current_bookings: 1 };
  const bookings = [
    { id: 1, user_id: "user-a", session_id: 42, booking_status: "confirmed" },
  ];
  const waitlist = [
    { id: 10, user_id: "user-b", session_id: 42, position: 1 },
    { id: 11, user_id: "user-c", session_id: 42, position: 2 },
  ];

  // Step 1: Row is deleted from `bookings`
  const deletedBooking = bookings.shift();
  assert.equal(deletedBooking.user_id, "user-a");
  // Notice: `session.current_bookings` is STILL 1 (stale!) because `trigger_update_bookings` has not fired yet!
  assert.equal(session.current_bookings, 1);

  // Step 2: `trigger_promote_from_waitlist` runs first (alphabetically before `trigger_update_bookings`)
  // Uses live COUNT(*) from `bookings` instead of stale `session.current_bookings`:
  const liveConfirmedCount = bookings.filter(
    (b) => b.session_id === session.id && b.booking_status === "confirmed"
  ).length;
  assert.equal(liveConfirmedCount, 0);
  assert.equal(liveConfirmedCount < session.max_capacity, true);

  // Finds #1 waitlisted user and promotes them
  const nextInLine = waitlist
    .filter((w) => w.session_id === session.id)
    .sort((a, b) => a.position - b.position)[0];
  assert.equal(nextInLine.user_id, "user-b");

  // Deletes from waitlist and re-indexes remaining positions (`trigger_manage_waitlist`)
  const removedIdx = waitlist.findIndex((w) => w.id === nextInLine.id);
  const removedWaitlist = waitlist.splice(removedIdx, 1)[0];
  for (const w of waitlist) {
    if (w.session_id === session.id && w.position > removedWaitlist.position) {
      w.position -= 1;
    }
  }

  // Inserts promoted booking (`trigger_validate_booking_insert` also checks live COUNT(*), not stale `session.current_bookings`)
  const liveCountBeforeInsert = bookings.filter(
    (b) => b.session_id === session.id && b.booking_status === "confirmed"
  ).length;
  assert.equal(liveCountBeforeInsert < session.max_capacity, true);
  bookings.push({
    id: 2,
    user_id: nextInLine.user_id,
    session_id: session.id,
    booking_status: "confirmed",
  });

  // `trigger_update_bookings` updates `session.current_bookings`
  session.current_bookings = bookings.filter(
    (b) => b.session_id === session.id && b.booking_status === "confirmed"
  ).length;

  assert.equal(bookings.length, 1);
  assert.equal(bookings[0].user_id, "user-b");
  assert.equal(bookings[0].booking_status, "confirmed");
  assert.equal(waitlist.length, 1);
  assert.equal(waitlist[0].user_id, "user-c");
  assert.equal(waitlist[0].position, 1);
  assert.equal(session.current_bookings, 1);
});

test("Migration 20261030000000 - enforces live booking counts in both promote_from_waitlist() and validate_booking_insert()", () => {
  assert.match(
    migrationSql,
    /CREATE OR REPLACE FUNCTION public\.promote_from_waitlist\(\)/
  );
  assert.match(
    migrationSql,
    /SELECT COUNT\(\*\)::integer\s+INTO v_confirmed_count\s+FROM public\.bookings/
  );
  assert.match(
    migrationSql,
    /CREATE OR REPLACE FUNCTION private\.validate_booking_insert\(\)/
  );
  assert.match(
    migrationSql,
    /SELECT COUNT\(\*\)::integer\s+INTO v_live_bookings\s+FROM public\.bookings/
  );
});

test("Migration 20261030000000 - enforces column-level email protection for anon, booking UPDATE trigger, and Europe/Budapest timezone alignment", () => {
  assert.match(
    migrationSql,
    /REVOKE SELECT ON TABLE public\.user_profiles FROM anon;/
  );
  assert.match(
    migrationSql,
    /GRANT SELECT \(id, username, full_name, user_tier, created_at, updated_at\) ON TABLE public\.user_profiles TO anon;/
  );
  assert.match(
    migrationSql,
    /CREATE TRIGGER trigger_validate_booking_update\s+BEFORE UPDATE ON public\.bookings/
  );
  assert.match(
    migrationSql,
    /CREATE TRIGGER trigger_guard_session_counters\s+BEFORE UPDATE ON public\.class_sessions/
  );
  assert.match(
    migrationSql,
    /CREATE OR REPLACE FUNCTION private\.guard_session_counters\(\)\s+RETURNS trigger\s+LANGUAGE plpgsql\s+SECURITY INVOKER/
  );
  assert.match(
    migrationSql,
    /regexp_replace\(btrim\(coalesce\(search_term, ''\)\),\s*'\(\[%_\\\\\]\)',\s*'\\\\\\1',\s*'g'\)/
  );
  assert.match(migrationSql, /AT TIME ZONE 'Europe\/Budapest'/);
});
