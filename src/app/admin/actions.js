'use server';

import { createSupabaseServerClient } from '@/lib/server';
import {
  isMeaningfulSessionChange,
  notifySessionDeleted,
  notifySessionUpdated,
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
      return { success: false, error: 'Bejelentkezés szükséges a művelethez.' };
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
      return { success: false, error: 'Oktatóként csak a saját edzésedet törölheted.' };
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
      return { success: false, error: 'Hiba történt az edzés törlésekor: ' + deleteError.message };
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

    return {
      success: true,
      message: 'Az edzés sikeresen törölve, az érintettek értesítése megtörtént.',
      participantCount: allParticipants.length,
    };
  } catch (err) {
    console.error('[deleteSessionAction:Unexpected Error]', err);
    return { success: false, error: 'Váratlan hiba történt a törlés során.' };
  }
}

/**
 * Server Action to update a class session and notify stakeholders if meaningful changes occurred.
 */
export async function updateSessionAction(sessionId, updates) {
  try {
    if (!sessionId || !updates || typeof updates !== 'object') {
      return { success: false, error: 'Hiányzó adatok a módosításhoz.' };
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Bejelentkezés szükséges a művelethez.' };
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
      return { success: false, error: 'Oktatóként csak a saját edzésedet módosíthatod.' };
    }

    // Authorization check: instructors cannot reassign the session to another coach
    if (
      userProfile.user_tier === 'instructor' &&
      updates.instructor_id &&
      updates.instructor_id !== user.id
    ) {
      return { success: false, error: 'Oktatóként nem oszthatsz ki edzést másik oktatónak.' };
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

    if (effectiveEndTime.getTime() <= effectiveStartTime.getTime()) {
      return { success: false, error: 'Az edzés befejezési idejének a kezdési idő után kell lennie.' };
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
      return { success: false, error: 'Hiba történt a módosítás mentésekor: ' + updateError.message };
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

    return {
      success: true,
      data: updatedSession,
      isMeaningfulChange: isMeaningful,
      message: isMeaningful
        ? 'Az edzés módosult, az érintettek email értesítést kaptak.'
        : 'Az edzés beállításai sikeresen frissítve lettek.',
    };
  } catch (err) {
    console.error('[updateSessionAction:Unexpected Error]', err);
    return { success: false, error: 'Váratlan hiba történt a mentés során.' };
  }
}
