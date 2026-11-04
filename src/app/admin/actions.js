'use server';

import { createSupabaseServerClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import {
  isMeaningfulSessionChange,
  notifySessionDeleted,
  notifySessionUpdated,
  notifyParticipantRemoved,
} from '@/lib/notifications/sessionNotificationService';

/**
 * Server Action to delete a class session and notify all affected stakeholders.
 */
export async function deleteSessionAction(sessionId) {
  try {
    if (!sessionId) {
      return { success: false, error: 'Hiányzó edzés azonosító.' };
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

    if (profileError || !userProfile || !['admin', 'instructor'].includes(userProfile.user_tier)) {
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
      .eq('id', sessionId)
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
        .eq('session_id', sessionId)
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
        .eq('session_id', sessionId),
      supabase
        .from('user_profiles')
        .select('id, full_name, username, email')
        .eq('user_tier', 'admin'),
    ]);

    // 3. Perform database deletion
    const { error: deleteError } = await supabase
      .from('class_sessions')
      .delete()
      .eq('id', sessionId);

    if (deleteError) {
      console.error('[deleteSessionAction:DB Error]', deleteError);
      return { success: false, error: 'Adatbázis hiba az edzés törlésekor: ' + deleteError.message };
    }

    // 4. Database deletion succeeded -> Collect confirmed and waitlisted participants
    const allParticipants = [
      ...(bookings || []).map((b) => b.user_profiles),
      ...(waitlistEntries || []).map((w) => w.user_profiles),
    ].filter((p) => p && p.email);

    const workoutTitle = session.workout_classes?.title || 'Csoportos edzés';

    // 5. Await email notification with error protection (prevents serverless execution drop)
    try {
      await notifySessionDeleted({
        session,
        workoutTitle,
        participants: allParticipants,
        instructor: session.instructor,
        admins: adminProfiles || [],
        deletedBy: userProfile,
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
export async function createSessionAction(sessionData) {
  try {
    if (!sessionData || !sessionData.class_id || !sessionData.start_time || !sessionData.end_time) {
      return { success: false, error: 'Hiányzó edzés adatok.' };
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

    if (profileError || !userProfile || !['admin', 'instructor'].includes(userProfile.user_tier)) {
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
        class_id: sessionData.class_id,
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
export async function updateSessionAction(sessionId, updates) {
  try {
    if (!sessionId || !updates || typeof updates !== 'object') {
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

    if (profileError || !userProfile || !['admin', 'instructor'].includes(userProfile.user_tier)) {
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
      .eq('id', sessionId)
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
    const safeUpdates = {};
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
    let allParticipants = [];
    let adminProfiles = [];
    if (isMeaningful) {
      const [{ data: bookings }, { data: waitlistEntries }, { data: admins }] = await Promise.all([
        supabase
          .from('bookings')
          .select('user_profiles (id, full_name, username, email)')
          .eq('session_id', sessionId)
          .eq('booking_status', 'confirmed'),
        supabase
          .from('waitlist')
          .select('user_profiles (id, full_name, username, email)')
          .eq('session_id', sessionId),
        supabase
          .from('user_profiles')
          .select('id, full_name, username, email')
          .eq('user_tier', 'admin'),
      ]);

      allParticipants = [
        ...(bookings || []).map((b) => b.user_profiles),
        ...(waitlistEntries || []).map((w) => w.user_profiles),
      ].filter((p) => p && p.email);

      adminProfiles = admins || [];
    }

    // 7. Perform database update
    const { data: updatedSession, error: updateError } = await supabase
      .from('class_sessions')
      .update(safeUpdates)
      .eq('id', sessionId)
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
      const workoutTitle = oldSession.workout_classes?.title || 'Csoportos edzés';

      try {
        await notifySessionUpdated({
          oldSession,
          newSession: updatedSession,
          workoutTitle,
          participants: allParticipants,
          oldInstructor: oldSession.instructor,
          newInstructor,
          admins: adminProfiles,
          updatedBy: userProfile,
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
export async function adminRemoveParticipantAction(bookingId) {
  try {
    if (!bookingId) {
      return { success: false, error: 'Hiányzó foglalás azonosító.' };
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

    if (profileError || !userProfile || !['admin', 'instructor'].includes(userProfile.user_tier)) {
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
      .eq('id', bookingId)
      .single();

    if (fetchBookingError || !booking) {
      return { success: false, error: 'A foglalás nem található.' };
    }

    // Instructors can only remove participants from their own sessions
    if (
      userProfile.user_tier === 'instructor' &&
      booking.class_sessions?.instructor_id !== user.id
    ) {
      return { success: false, error: 'Az oktatók csak a saját edzéseikről távolíthatnak el résztvevőket.' };
    }

    // 2. Delete the booking
    const { error: deleteError } = await supabase
      .from('bookings')
      .delete()
      .eq('id', bookingId);

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
    const participant = booking.user_profiles;
    const session = booking.class_sessions;
    const instructor = booking.class_sessions?.instructor;

    if (participant && participant.email && session) {
      try {
        await notifyParticipantRemoved({
          participant,
          session,
          instructor,
          removedBy: userProfile,
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
