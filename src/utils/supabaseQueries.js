import { supabaseBrowser } from '../lib/browser';

/**
 * Fetches user's booking and waitlist status for a specific session
 */
export const fetchUserBookingStatus = async (userId, sessionId) => {
  // Check if user has a booking
  const { data: bookingData, error: bookingError } = await supabaseBrowser
    .from('bookings')
    .select('*')
    .eq('user_id', userId)
    .eq('session_id', sessionId)
    .eq('booking_status', 'confirmed')
    .maybeSingle();

  if (bookingError && bookingError.code !== 'PGRST116') {
    console.error('Error checking booking:', bookingError);
  }

  // Check if user is on waitlist
  const { data: waitlistData, error: waitlistError } = await supabaseBrowser
    .from('waitlist')
    .select('position')
    .eq('user_id', userId)
    .eq('session_id', sessionId)
    .maybeSingle();

  if (waitlistError && waitlistError.code !== 'PGRST116') {
    console.error('Error checking waitlist:', waitlistError);
  }

  return {
    booking: bookingData,
    waitlist: waitlistData,
    hasError: (bookingError && bookingError.code !== 'PGRST116') || 
              (waitlistError && waitlistError.code !== 'PGRST116')
  };
};

/**
 * Fetches all active class sessions with workout details and instructor info
 */
export const fetchClassSessions = async () => {
  const { data, error } = await supabaseBrowser
    .from('class_sessions')
    .select(`
      id,
      start_time,
      end_time,
      current_bookings,
      is_active,
      instructor_id,
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
    .gte('start_time', new Date().toISOString())
    .eq('is_active', true)
    .order('start_time', { ascending: true });

  if (error) {
    console.error('Error fetching class sessions:', error);
  }

  return { data, error };
};

/**
 * Books a workout session for a user
 */
export const bookWorkoutSession = async (userId, sessionId) => {
  const { error } = await supabaseBrowser
    .from('bookings')
    .insert([
      {
        user_id: userId,
        session_id: sessionId,
        booking_status: 'confirmed'
      }
    ]).select();

  return { error };
};

/**
 * Joins the waitlist for a full session
 */
export const joinWaitlist = async (userId, sessionId) => {
  const { error } = await supabaseBrowser
    .from('waitlist')
    .insert([
      {
        user_id: userId,
        session_id: sessionId
      }
    ]);

  return { error };
};

/**
 * Cancels a booking
 */
export const cancelBooking = async (userId, sessionId) => {
  const { error } = await supabaseBrowser
    .from('bookings')
    .delete()
    .eq('user_id', userId)
    .eq('session_id', sessionId);

  return { error };
};

/**
 * Leaves a waitlist
 */
export const leaveWaitlist = async (userId, sessionId) => {
  const { error } = await supabaseBrowser
    .from('waitlist')
    .delete()
    .eq('user_id', userId)
    .eq('session_id', sessionId);

  return { error };
};

/**
 * Fetches user's bookings for their profile page with instructor info
 */
export const fetchUserBookings = async (userId) => {
  // Fetch confirmed bookings
  const { data: bookingsData, error: bookingsError } = await supabaseBrowser
    .from("bookings")
    .select(`
      id,
      booking_status,
      booked_at,
      class_sessions (
        id,
        start_time,
        end_time,
        instructor:instructor_id (
          username,
          full_name
        ),
        workout_classes (
          title,
          max_capacity
        )
      )
    `)
    .eq("user_id", userId)
    .eq("booking_status", "confirmed")
    .gte("class_sessions.start_time", new Date().toISOString())
    .order("class_sessions(start_time)", { ascending: true });

  // Fetch waitlist entries
  const { data: waitlistData, error: waitlistError } = await supabaseBrowser
    .from("waitlist")
    .select(`
      id,
      position,
      joined_at,
      class_sessions (
        id,
        start_time,
        end_time,
        instructor:instructor_id (
          username,
          full_name
        ),
        workout_classes (
          title
        )
      )
    `)
    .eq("user_id", userId)
    .gte("class_sessions.start_time", new Date().toISOString())
    .order("class_sessions(start_time)", { ascending: true });

  return {
    bookings: bookingsData || [],
    waitlist: waitlistData || [],
    errors: { bookingsError, waitlistError }
  };
};