'use server';

import { createSupabaseServerClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import { dispatchPendingOutboxNotifications } from '@/lib/notifications/outboxDispatcher';
import type { Database } from '@/types/database';

export interface ActionResult<T = unknown> {
  success: boolean;
  error?: string;
  data?: T;
}

function mapDatabaseError(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes('already full')) {
    return 'Ez az edzés sajnos már megtelt. Iratkozz fel a várólistára!';
  }
  if (lower.includes('already booked') || lower.includes('23505')) {
    return 'Már van aktív foglalásod erre az edzésre.';
  }
  if (lower.includes('már rendelkezel érvényes foglalással')) {
    return 'Már rendelkezel érvényes foglalással erre az edzésre, így nem jelentkezhetsz a várólistára.';
  }
  if (lower.includes('less than 30 minutes') || lower.includes('already started') || lower.includes('cannot book')) {
    return 'A foglalás és várólista az edzés kezdete előtt 30 perccel lezárul, vagy az edzés már elkezdődött.';
  }
  if (lower.includes('workout session not found')) {
    return 'A kiválasztott edzés nem található.';
  }
  if (lower.includes('cannot join waitlist')) {
    return 'A várólistára való jelentkezés az edzés kezdete előtt 30 perccel lezárul.';
  }
  if (lower.includes('not active')) {
    return 'Ez az edzés jelenleg nem aktív.';
  }
  return msg || 'Hiba történt a művelet során.';
}

/**
 * Server Action to book a workout session for the authenticated user.
 */
export async function bookWorkoutAction(sessionId: number): Promise<ActionResult> {
  try {
    if (typeof sessionId !== 'number' || !Number.isInteger(sessionId) || sessionId <= 0) {
      return { success: false, error: 'Érvénytelen edzés azonosító.' };
    }

    const supabase = await createSupabaseServerClient<Database>();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'A foglaláshoz bejelentkezés szükséges.' };
    }

    const { error: insertError } = await supabase.from('bookings').insert([
      {
        user_id: user.id,
        session_id: sessionId,
        booking_status: 'confirmed',
      },
    ]);

    if (insertError) {
      return { success: false, error: mapDatabaseError(insertError.message) };
    }

    revalidatePath('/calendar');
    revalidatePath('/bookings');
    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? mapDatabaseError(err.message) : 'Váratlan hiba történt.';
    return { success: false, error: errorMsg };
  }
}

/**
 * Server Action to join the waitlist for a full workout session.
 * Protects against double-booking (cannot join waitlist if already booked).
 */
export async function joinWaitlistAction(sessionId: number): Promise<ActionResult> {
  try {
    if (typeof sessionId !== 'number' || !Number.isInteger(sessionId) || sessionId <= 0) {
      return { success: false, error: 'Érvénytelen edzés azonosító.' };
    }

    const supabase = await createSupabaseServerClient<Database>();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'A várólistára való feliratkozáshoz bejelentkezés szükséges.' };
    }

    // 1. Check if user already holds a confirmed booking for this session
    const { data: existingBooking } = await supabase
      .from('bookings')
      .select('id, booking_status')
      .eq('user_id', user.id)
      .eq('session_id', sessionId)
      .maybeSingle();

    if (existingBooking && existingBooking.booking_status === 'confirmed') {
      return {
        success: false,
        error: 'Már rendelkezel érvényes foglalással erre az edzésre, így nem jelentkezhetsz a várólistára.',
      };
    }

    const { error: insertError } = await supabase.from('waitlist').insert([
      {
        user_id: user.id,
        session_id: sessionId,
      },
    ]);

    if (insertError) {
      if (insertError.code === '23505') {
        return { success: false, error: 'Már feliratkoztál erre a várólistára.' };
      }
      return { success: false, error: mapDatabaseError(insertError.message) };
    }

    revalidatePath('/calendar');
    revalidatePath('/bookings');
    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? mapDatabaseError(err.message) : 'Váratlan hiba történt.';
    return { success: false, error: errorMsg };
  }
}

/**
 * Server Action to cancel a confirmed booking.
 * Automatically dispatches notifications from the Transactional Outbox
 * if a waitlisted user is promoted by the database trigger!
 */
export async function cancelBookingAction(sessionId: number): Promise<ActionResult> {
  try {
    if (typeof sessionId !== 'number' || !Number.isInteger(sessionId) || sessionId <= 0) {
      return { success: false, error: 'Érvénytelen edzés azonosító.' };
    }

    const supabase = await createSupabaseServerClient<Database>();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'A lemondáshoz bejelentkezés szükséges.' };
    }

    // Check cancellation cutoff time rule: free cancellation closes 2 hours before start
    const { data: session } = await supabase
      .from('class_sessions')
      .select('start_time')
      .eq('id', sessionId)
      .maybeSingle();

    if (session?.start_time) {
      const sessionStart = new Date(session.start_time).getTime();
      const now = Date.now();
      const twoHoursMs = 2 * 60 * 60 * 1000;

      if (now > sessionStart) {
        return {
          success: false,
          error: 'A már lezajlott vagy éppen folyamatban lévő edzés foglalása nem mondható le.',
        };
      }

      if (sessionStart - now < twoHoursMs) {
        return {
          success: false,
          error: 'A foglalás már nem mondható le díjmentesen, mert kevesebb mint 2 óra van hátra a kezdésig.',
        };
      }
    }

    const { error: deleteError } = await supabase
      .from('bookings')
      .delete()
      .eq('user_id', user.id)
      .eq('session_id', sessionId);

    if (deleteError) {
      return { success: false, error: mapDatabaseError(deleteError.message) };
    }

    // Asynchronously dispatch any pending outbox notifications (e.g., promoted waitlist member)
    try {
      await dispatchPendingOutboxNotifications();
    } catch (dispatchErr) {
      console.warn('[cancelBookingAction:Outbox Warning]', dispatchErr);
    }

    revalidatePath('/calendar');
    revalidatePath('/bookings');
    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? mapDatabaseError(err.message) : 'Váratlan hiba történt.';
    return { success: false, error: errorMsg };
  }
}

/**
 * Server Action to leave a waitlist.
 */
export async function leaveWaitlistAction(sessionId: number): Promise<ActionResult> {
  try {
    if (typeof sessionId !== 'number' || !Number.isInteger(sessionId) || sessionId <= 0) {
      return { success: false, error: 'Érvénytelen edzés azonosító.' };
    }

    const supabase = await createSupabaseServerClient<Database>();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'A művelethez bejelentkezés szükséges.' };
    }

    const { error: deleteError } = await supabase
      .from('waitlist')
      .delete()
      .eq('user_id', user.id)
      .eq('session_id', sessionId);

    if (deleteError) {
      return { success: false, error: mapDatabaseError(deleteError.message) };
    }

    revalidatePath('/calendar');
    revalidatePath('/bookings');
    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? mapDatabaseError(err.message) : 'Váratlan hiba történt.';
    return { success: false, error: errorMsg };
  }
}
