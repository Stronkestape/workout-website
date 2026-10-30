import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isMeaningfulSessionChange,
  getSessionChangeSummary,
  deduplicateRecipients,
  sendEmail,
  notifySessionDeleted,
  notifySessionUpdated,
} from '../src/lib/notifications/sessionNotificationService.js';

test('isMeaningfulSessionChange - detects time, instructor, and status modifications', () => {
  const baseSession = {
    id: 1,
    start_time: '2026-11-01T10:00:00.000Z',
    end_time: '2026-11-01T11:00:00.000Z',
    instructor_id: 'inst-1',
    is_active: true,
    is_recurring: true,
  };

  // 1. Identical data -> not meaningful
  assert.equal(
    isMeaningfulSessionChange(baseSession, {
      start_time: '2026-11-01T10:00:00.000Z',
      end_time: '2026-11-01T11:00:00.000Z',
      instructor_id: 'inst-1',
      is_active: true,
      is_recurring: true,
    }),
    false
  );

  // 2. Only is_recurring changed -> not meaningful
  assert.equal(
    isMeaningfulSessionChange(baseSession, {
      is_recurring: false,
    }),
    false
  );

  // 3. Start time changed -> meaningful
  assert.equal(
    isMeaningfulSessionChange(baseSession, {
      start_time: '2026-11-01T10:30:00.000Z',
    }),
    true
  );

  // 4. End time changed -> meaningful
  assert.equal(
    isMeaningfulSessionChange(baseSession, {
      end_time: '2026-11-01T11:30:00.000Z',
    }),
    true
  );

  // 5. Instructor changed -> meaningful
  assert.equal(
    isMeaningfulSessionChange(baseSession, {
      instructor_id: 'inst-2',
    }),
    true
  );

  // 6. Active status changed -> meaningful
  assert.equal(
    isMeaningfulSessionChange(baseSession, {
      is_active: false,
    }),
    true
  );
});

test('getSessionChangeSummary - formats human readable change diff in Hungarian', () => {
  const oldSession = {
    start_time: '2026-11-01T09:00:00.000Z',
    end_time: '2026-11-01T10:00:00.000Z',
    instructor_id: 'inst-1',
    is_active: true,
  };

  const newSession = {
    start_time: '2026-11-01T14:00:00.000Z',
    end_time: '2026-11-01T15:00:00.000Z',
    instructor_id: 'inst-2',
    is_active: false,
  };

  const changes = getSessionChangeSummary(oldSession, newSession, {
    oldInstructorName: 'Kovács Anna',
    newInstructorName: 'Nagy Péter',
  });

  assert.equal(changes.length, 3);
  assert.equal(changes[0].field, 'Időpont');
  assert.equal(changes[1].field, 'Oktató');
  assert.equal(changes[1].oldValue, 'Kovács Anna');
  assert.equal(changes[1].newValue, 'Nagy Péter');
  assert.equal(changes[2].field, 'Státusz');
  assert.equal(changes[2].oldValue, 'Aktív');
  assert.equal(changes[2].newValue, 'Inaktív (Elmarad)');
});

test('deduplicateRecipients - eliminates duplicates and trims email addresses', () => {
  const recipients = [
    { email: 'User@Example.com ', name: 'User One', role: 'participant' },
    { email: 'user@example.com', name: 'User One Dupe', role: 'admin' },
    { email: 'coach@example.com', name: 'Coach', role: 'instructor' },
    'COACH@EXAMPLE.COM',
    null,
    { email: 'invalid-email' },
    { email: '' },
  ];

  const unique = deduplicateRecipients(recipients);
  assert.equal(unique.length, 2);
  assert.deepEqual(
    unique.map((u) => u.email).sort(),
    ['coach@example.com', 'user@example.com']
  );
});

test('sendEmail - falls back to dry-run safely when credentials are not configured', async () => {
  const result = await sendEmail({
    to: ['test@example.com'],
    subject: 'Teszt üzenet',
    text: 'Ez egy teszt email szöveg.',
    html: '<p>Ez egy teszt email szöveg.</p>',
  });

  assert.equal(result.success, true);
  assert.equal(result.count, 1);
  assert.equal(result.dryRun, true);
});

test('notifySessionDeleted - builds and dispatches deletion notification', async () => {
  const result = await notifySessionDeleted({
    session: {
      start_time: '2026-11-05T17:00:00.000Z',
      end_time: '2026-11-05T18:00:00.000Z',
    },
    workoutTitle: 'Spinning',
    participants: [{ email: 'participant@test.com', full_name: 'Teszt Vendég' }],
    instructor: { email: 'coach@test.com', full_name: 'Teszt Edző' },
    admins: [{ email: 'admin@test.com', full_name: 'Fő Admin' }],
  });

  assert.equal(result.success, true);
  assert.equal(result.count, 3);
});

test('notifySessionUpdated - builds and dispatches modification notification', async () => {
  const result = await notifySessionUpdated({
    oldSession: {
      start_time: '2026-11-05T17:00:00.000Z',
      end_time: '2026-11-05T18:00:00.000Z',
      instructor_id: 'inst-1',
      is_active: true,
    },
    newSession: {
      start_time: '2026-11-05T18:00:00.000Z',
      end_time: '2026-11-05T19:00:00.000Z',
      instructor_id: 'inst-1',
      is_active: true,
    },
    workoutTitle: 'WALKenergie',
    participants: [{ email: 'participant@test.com', full_name: 'Teszt Vendég' }],
    oldInstructor: { email: 'coach@test.com', full_name: 'Teszt Edző' },
    newInstructor: { email: 'coach@test.com', full_name: 'Teszt Edző' },
    admins: [{ email: 'admin@test.com', full_name: 'Fő Admin' }],
  });

  assert.equal(result.success, true);
  assert.equal(result.count, 3); // participant, coach, and admin
});
