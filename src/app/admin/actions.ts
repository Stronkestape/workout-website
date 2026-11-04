'use server';

import { createSupabaseServerClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import {
  isMeaningfulSessionChange,
  notifySessionDeleted,
  notifySessionUpdated,
  notifyParticipantRemoved,
  type RecipientInput,
  type SessionBase,
  type SessionRecipient,
} from '@/lib/notifications/sessionNotificationService';

export interface CreateSessionInput {
  class_id: number | string;
  start_time: string;
  end_time: string;
  instructor_id?: string | null;
  is_active?: boolean;
  is_recurring?: boolean;
}

export interface UpdateSessionInput {
  start_time?: string;
  end_time?: string;
  instructor_id?: string | null;
  is_active?: boolean;
  is_recurring?: boolean;
}

export interface AdminActionResult<T = unknown> {
  success: boolean;
  error?: string;
  message?: string;
  data?: T;
  participantCount?: number;
  isMeaningfulChange?: boolean;
}

/**
 * Server Action to delete a class session and notify all affected stakeholders.
 */
export async function deleteSessionAction(sessionId: string | number): Promise<AdminActionResult> {
  try {
    const numericSessionId = Number(sessionId);
    if (!sessionId || isNaN(numericSessionId)) {
      return { success: false, error: 'Hiányzó vagy érvénytelen edzés azonosító.' };
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'A művelethez bejelentkezés szükséges.' };
    }

    // Verify user role
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, full_name, username, email, user_tier')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile || !userProfile.user_tier || !['admin', 'instructor'].includes(userProfile.user_tier)) {
      return { success: false, error: 'Nincs jogosultságod edzés törlésére.' };
    }

    // 1. Fetch session details and related data BEFORE deletion (due to ON DELETE CASCADE)
    const { data: session, error: fetchSessionError } = await supabase
      .from('class_sessions')
      .select(`
        id,
        class_id,
        instructor_id,
        start_time,
        end_time,
        is_active,
        is_recurring,
        workout_classes (
          id,
          title
        ),
        instructor:instructor_id (
          id,
          full_name,
          username,
          email
        )
      `)
      .eq('id', numericSessionId)
      .single();

    if (fetchSessionError || !session) {
      return { success: false, error: 'A megadott edzés nem található.' };
    }

    // Instructors can only delete their own sessions
    if (userProfile.user_tier === 'instructor' && session.instructor_id !== user.id) {
      return { success: false, error: 'Az oktatók csak a saját edzéseiket törölhetik.' };
    }

    // 2. Fetch confirmed bookings & waitlist participants BEFORE deletion (due to ON DELETE CASCADE)
    const [{ data: bookings }, { data: waitlistEntries }, { data: adminProfiles }] = await Promise.all([
      supabase
        .from('bookings')
        .select(`
          id,
          user_id,
          booking_status,
          user_profiles (
            id,
            full_name,
            username,
            email
          )
        `)
        .eq('session_id', numericSessionId)
        .eq('booking_status', 'confirmed'),
      supabase
        .from('waitlist')
        .select(`
          id,
          user_id,
          user_profiles (
            id,
            full_name,
            username,
            email
          )
        `)
        .eq('session_id', numericSessionId),
      supabase
        .from('user_profiles')
        .select('id, full_name, username, email')
        .eq('user_tier', 'admin'),
    ]);

    // 3. Perform database deletion
    const { error: deleteError } = await supabase
      .from('class_sessions')
      .delete()
      .eq('id', numericSessionId);

    if (deleteError) {
      console.error('[deleteSessionAction:DB Error]', deleteError);
      return { success: false, error: 'Adatbázis hiba az edzés törlésekor: ' + deleteError.message };
    }

    // 4. Database deletion succeeded -> Collect confirmed and waitlisted participants
    type ProfileRecord = { id?: string | null; full_name?: string | null; username?: string | null; email?: string | null };
    const allParticipants: ProfileRecord[] = [
      ...((bookings || []).map((b: { user_profiles: unknown }) => b.user_profiles) as ProfileRecord[]),
      ...((waitlistEntries || []).map((w: { user_profiles: unknown }) => w.user_profiles) as ProfileRecord[]),
    ].filter((p): p is ProfileRecord & { email: string } => Boolean(p && p.email));

    const workoutTitle = (session.workout_classes as { title?: string } | null)?.title || 'Csoportos edzés';

    // 5. Await email notification with error protection (prevents serverless execution drop)
    try {
      await notifySessionDeleted({
        session: session as unknown as SessionBase,
        workoutTitle,
        participants: allParticipants,
        instructor: session.instructor as RecipientInput,
        admins: (adminProfiles || []) as RecipientInput[],
        deletedBy: userProfile as RecipientInput,
      });
    } catch (notifyErr) {
      console.error('[deleteSessionAction:Notification Warning]', notifyErr);
    }

    revalidatePath('/calendar');
    revalidatePath('/admin');
    return {
      success: true,
      message: 'Az edzés sikeresen törölve, az érintettek email értesítést kaptak.',
      participantCount: allParticipants.length,
    };
  } catch (err) {
    console.error('[deleteSessionAction:Unexpected Error]', err);
    return { success: false, error: 'Váratlan hiba történt a törlés során.' };
  }
}

/**
 * Server Action to create a new class session.
 */
export async function createSessionAction(sessionData: CreateSessionInput): Promise<AdminActionResult> {
  try {
    const numericClassId = Number(sessionData.class_id);
    if (!sessionData || isNaN(numericClassId) || !sessionData.start_time || !sessionData.end_time) {
      return { success: false, error: 'Hiányzó vagy érvénytelen edzés adatok.' };
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'A művelethez bejelentkezés szükséges.' };
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, full_name, username, email, user_tier')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile || !userProfile.user_tier || !['admin', 'instructor'].includes(userProfile.user_tier)) {
      return { success: false, error: 'Nincs jogosultságod edzés létrehozására.' };
    }

    const startTime = new Date(sessionData.start_time);
    const endTime = new Date(sessionData.end_time);

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      return { success: false, error: 'Érvénytelen dátum formátum.' };
    }

    if (startTime <= new Date()) {
      return { success: false, error: 'Edzés nem hozható létre múltbéli időpontra.' };
    }

    if (endTime <= startTime) {
      return { success: false, error: 'Az edzés befejezési időpontjának a kezdés után kell lennie.' };
    }

    let instructorId = sessionData.instructor_id || null;
    if (userProfile.user_tier === 'instructor') {
      instructorId = user.id;
    }

    const { data, error: insertError } = await supabase
      .from('class_sessions')
      .insert({
        class_id: numericClassId,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        instructor_id: instructorId,
        is_active: sessionData.is_active !== false,
        is_recurring: Boolean(sessionData.is_recurring),
      })
      .select(`
        *,
        workout_classes (
          id,
          title,
          max_capacity
        ),
        instructor:instructor_id (
          id,
          username,
          full_name
        )
      `)
      .single();

    if (insertError) {
      return { success: false, error: insertError.message || 'Adatbázis hiba az edzés mentésekor.' };
    }

    revalidatePath('/calendar');
    revalidatePath('/admin');
    return { success: true, data };
  } catch (err) {
    console.error('[createSessionAction:Unexpected Error]', err);
    return { success: false, error: 'Váratlan hiba történt az edzés létrehozásakor.' };
  }
}

/**
 * Server Action to update a class session and notify stakeholders if meaningful changes occurred.
 */
export async function updateSessionAction(
  sessionId: string | number,
  updates: UpdateSessionInput
): Promise<AdminActionResult> {
  try {
    const numericSessionId = Number(sessionId);
    if (!sessionId || isNaN(numericSessionId) || !updates || typeof updates !== 'object') {
      return { success: false, error: 'Hiányzó frissítési adatok.' };
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'A művelethez bejelentkezés szükséges.' };
    }

    // Verify user role
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, full_name, username, email, user_tier')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile || !userProfile.user_tier || !['admin', 'instructor'].includes(userProfile.user_tier)) {
      return { success: false, error: 'Nincs jogosultságod edzés módosítására.' };
    }

    // 1. Fetch current session data before update
    const { data: oldSession, error: fetchSessionError } = await supabase
      .from('class_sessions')
      .select(`
        id,
        class_id,
        instructor_id,
        start_time,
        end_time,
        is_active,
        is_recurring,
        workout_classes (
          id,
          title
        ),
        instructor:instructor_id (
          id,
          full_name,
          username,
          email
        )
      `)
      .eq('id', numericSessionId)
      .single();

    if (fetchSessionError || !oldSession) {
      return { success: false, error: 'A megadott edzés nem található.' };
    }

    // Instructors can only edit their own sessions
    if (userProfile.user_tier === 'instructor' && oldSession.instructor_id !== user.id) {
      return { success: false, error: 'Az oktatók csak a saját edzéseiket szerkeszthetik.' };
    }

    // Authorization check: instructors cannot reassign the session to another instructor
    if (
      userProfile.user_tier === 'instructor' &&
      updates.instructor_id &&
      updates.instructor_id !== user.id
    ) {
      return { success: false, error: 'Oktatók nem rendelhetik át az edzést más oktatóhoz.' };
    }

    // 2. Parameter whitelisting to prevent mass assignment
    const safeUpdates: {
      start_time?: string;
      end_time?: string;
      instructor_id?: string | null;
      is_active?: boolean;
      is_recurring?: boolean;
    } = {};
    if (updates.start_time !== undefined) safeUpdates.start_time = updates.start_time;
    if (updates.end_time !== undefined) safeUpdates.end_time = updates.end_time;
    if (updates.instructor_id !== undefined) safeUpdates.instructor_id = updates.instructor_id || null;
    if (updates.is_active !== undefined) safeUpdates.is_active = Boolean(updates.is_active);
    if (updates.is_recurring !== undefined) safeUpdates.is_recurring = Boolean(updates.is_recurring);

    // 3. Server-side validation of dates if modified
    const effectiveStartTime = new Date(safeUpdates.start_time || oldSession.start_time);
    const effectiveEndTime = new Date(safeUpdates.end_time || oldSession.end_time);

    if (isNaN(effectiveStartTime.getTime()) || isNaN(effectiveEndTime.getTime())) {
      return { success: false, error: 'Érvénytelen dátum formátum.' };
    }

    // Past date prevention: modified start_time cannot be set in the past
    if (safeUpdates.start_time && effectiveStartTime <= new Date()) {
      return { success: false, error: 'Edzés nem módosítható múltbéli időpontra.' };
    }

    if (effectiveEndTime.getTime() <= effectiveStartTime.getTime()) {
      return { success: false, error: 'Az edzés befejezési időpontjának a kezdés után kell lennie.' };
    }

    // 4. Check if the changes are meaningful (date, time, instructor, active status)
    const isMeaningful = isMeaningfulSessionChange(oldSession, safeUpdates);

    // 5. If instructor changed, fetch new instructor info
    let newInstructor = oldSession.instructor;
    if (safeUpdates.instructor_id && safeUpdates.instructor_id !== oldSession.instructor_id) {
      const { data: newInstProfile } = await supabase
        .from('user_profiles')
        .select('id, full_name, username, email')
        .eq('id', safeUpdates.instructor_id)
        .single();
      newInstructor = newInstProfile || null;
    }

    // 6. Fetch confirmed participants and waitlist entries if meaningful
    type ProfileRecord = { id?: string | null; full_name?: string | null; username?: string | null; email?: string | null };
    let allParticipants: ProfileRecord[] = [];
    let adminProfiles: ProfileRecord[] = [];
    if (isMeaningful) {
      const [{ data: bookings }, { data: waitlistEntries }, { data: admins }] = await Promise.all([
        supabase
          .from('bookings')
          .select('user_profiles (id, full_name, username, email)')
          .eq('session_id', numericSessionId)
          .eq('booking_status', 'confirmed'),
        supabase
          .from('waitlist')
          .select('user_profiles (id, full_name, username, email)')
          .eq('session_id', numericSessionId),
        supabase
          .from('user_profiles')
          .select('id, full_name, username, email')
          .eq('user_tier', 'admin'),
      ]);

      allParticipants = [
        ...((bookings || []).map((b: { user_profiles: unknown }) => b.user_profiles) as ProfileRecord[]),
        ...((waitlistEntries || []).map((w: { user_profiles: unknown }) => w.user_profiles) as ProfileRecord[]),
      ].filter((p): p is ProfileRecord & { email: string } => Boolean(p && p.email));

      adminProfiles = (admins || []) as ProfileRecord[];
    }

    // 7. Perform database update
    const { data: updatedSession, error: updateError } = await supabase
      .from('class_sessions')
      .update(safeUpdates)
      .eq('id', numericSessionId)
      .select(`
        id,
        class_id,
        instructor_id,
        start_time,
        end_time,
        is_active,
        is_recurring,
        workout_classes (
          id,
          title
        )
      `)
      .single();

    if (updateError) {
      console.error('[updateSessionAction:DB Error]', updateError);
      return { success: false, error: 'Adatbázis hiba az edzés frissítésekor: ' + updateError.message };
    }

    // 8. If meaningful changes occurred, await email notification with error protection
    if (isMeaningful) {
      const workoutTitle = (oldSession.workout_classes as { title?: string } | null)?.title || 'Csoportos edzés';

      try {
        await notifySessionUpdated({
          oldSession: oldSession as unknown as SessionBase,
          newSession: updatedSession as unknown as SessionBase,
          workoutTitle,
          participants: allParticipants,
          oldInstructor: oldSession.instructor as RecipientInput,
          newInstructor: newInstructor as RecipientInput,
          admins: adminProfiles as RecipientInput[],
          updatedBy: userProfile as RecipientInput,
        });
      } catch (notifyErr) {
        console.error('[updateSessionAction:Notification Warning]', notifyErr);
      }
    }

    revalidatePath('/calendar');
    revalidatePath('/admin');
    return {
      success: true,
      data: updatedSession,
      isMeaningfulChange: isMeaningful,
      message: isMeaningful
        ? 'Az edzés adatai módosultak, az értesítő emaileket kiküldtük a résztvevőknek.'
        : 'Az edzés sikeresen frissítve.',
    };
  } catch (err) {
    console.error('[updateSessionAction:Unexpected Error]', err);
    return { success: false, error: 'Váratlan hiba történt az edzés mentése során.' };
  }
}

/**
 * Server Action to remove a participant from a session, delete their booking,
 * and send them an email notification.
 */
export async function adminRemoveParticipantAction(bookingId: string | number): Promise<AdminActionResult> {
  try {
    const numericBookingId = Number(bookingId);
    if (!bookingId || isNaN(numericBookingId)) {
      return { success: false, error: 'Hiányzó vagy érvénytelen foglalás azonosító.' };
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'A művelethez bejelentkezés szükséges.' };
    }

    // Verify user role
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, full_name, username, email, user_tier')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile || !userProfile.user_tier || !['admin', 'instructor'].includes(userProfile.user_tier)) {
      return { success: false, error: 'Nincs jogosultságod résztvevők eltávolítására.' };
    }

    // 1. Fetch booking details with session, workout title, instructor, and participant profile BEFORE deletion
    const { data: booking, error: fetchBookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        user_id,
        session_id,
        user_profiles (
          id,
          full_name,
          username,
          email
        ),
        class_sessions (
          id,
          start_time,
          end_time,
          instructor_id,
          workout_classes (
            id,
            title
          ),
          instructor:instructor_id (
            id,
            full_name,
            username,
            email
          )
        )
      `)
      .eq('id', numericBookingId)
      .single();

    if (fetchBookingError || !booking) {
      return { success: false, error: 'A foglalás nem található.' };
    }

    const classSession = booking.class_sessions as {
      id?: number;
      start_time?: string;
      end_time?: string;
      instructor_id?: string | null;
      instructor?: { id?: string; full_name?: string | null; username?: string | null; email?: string | null } | null;
      workout_classes?: { id?: number; title?: string } | null;
    } | null;

    // Instructors can only remove participants from their own sessions
    if (
      userProfile.user_tier === 'instructor' &&
      classSession?.instructor_id !== user.id
    ) {
      return { success: false, error: 'Az oktatók csak a saját edzéseikről távolíthatnak el résztvevőket.' };
    }

    // 2. Delete the booking
    const { error: deleteError } = await supabase
      .from('bookings')
      .delete()
      .eq('id', numericBookingId);

    if (deleteError) {
      console.error('[adminRemoveParticipantAction:DB Error]', deleteError);
      return { success: false, error: 'Adatbázis hiba a foglalás törlésekor: ' + deleteError.message };
    }

    // Trigger waitlist outbox processing if a user was promoted
    try {
      await (await import('@/lib/notifications/outboxDispatcher')).dispatchPendingOutboxNotifications();
    } catch (dispatchErr) {
      console.warn('[adminRemoveParticipantAction:Outbox Warning]', dispatchErr);
    }

    // 3. Send email notification to removed participant
    const participant = booking.user_profiles as SessionRecipient | null;
    const instructor = classSession?.instructor as RecipientInput;

    if (participant && classSession && classSession.start_time && classSession.end_time) {
      try {
        await notifyParticipantRemoved({
          participant,
          session: {
            ...classSession,
            start_time: classSession.start_time,
            end_time: classSession.end_time,
          },
          instructor,
          removedBy: userProfile as RecipientInput,
        });
      } catch (notifyErr) {
        console.error('[adminRemoveParticipantAction:Notification Warning]', notifyErr);
      }
    }

    revalidatePath('/calendar');
    revalidatePath('/admin');
    return {
      success: true,
      message: 'A résztvevő sikeresen törölve az edzésről, az értesítő email elküldve.',
    };
  } catch (err) {
    console.error('[adminRemoveParticipantAction:Unexpected Error]', err);
    return { success: false, error: 'Váratlan hiba történt a résztvevő eltávolításakor.' };
  }
}
