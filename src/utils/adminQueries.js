// src/utils/adminQueries.js
import { getSupabaseBrowser } from './supabaseQueries';
import { sanitizeSearchTerm } from './validators';

/**
 * Search users by username or full name (email excluded for privacy)
 * Admin & Instructor (via scoped RPC with sanitized PostgREST fallback)
 */
export const searchUsers = async (searchTerm) => {
  const cleanTerm = sanitizeSearchTerm(searchTerm);
  if (cleanTerm.length < 2 || cleanTerm.includes('@')) {
    return { data: [], error: null };
  }

  const supabaseBrowser = await getSupabaseBrowser();
  const rpcResult = await supabaseBrowser.rpc('search_users_for_booking', {
    search_term: cleanTerm,
  });

  if (!rpcResult.error && rpcResult.data) {
    return { data: rpcResult.data, error: null };
  }

  // Fallback query strictly excludes email to preserve user privacy
  const { data, error } = await supabaseBrowser
    .from('user_profiles')
    .select('id, username, full_name')
    .or(`username.ilike.%${cleanTerm}%,full_name.ilike.%${cleanTerm}%`)
    .limit(10);

  return { data, error };
};

/**
 * Fetch available instructors (users with instructor or admin tier)
 */
export const fetchInstructors = async () => {
  const supabaseBrowser = await getSupabaseBrowser();
  const { data, error } = await supabaseBrowser.rpc(
    'get_available_instructors'
  );

  if (!error && data) {
    return { data, error: null };
  }

  return await supabaseBrowser
    .from('user_profiles')
    .select('id, username, full_name')
    .in('user_tier', ['instructor', 'admin'])
    .order('username', { ascending: true });
};

/**
 * Fetch all workout templates
 * Admin only
 */
export const fetchWorkoutTemplates = async () => {
  const supabaseBrowser = await getSupabaseBrowser();
  const { data, error } = await supabaseBrowser
    .from('workout_classes')
    .select('*')
    .order('created_at', { ascending: false });

  return { data, error };
};

/**
 * Create a workout template
 * Admin only
 */
export const createWorkoutTemplate = async (template) => {
  const supabaseBrowser = await getSupabaseBrowser();
  const { data, error } = await supabaseBrowser
    .from('workout_classes')
    .insert(template)
    .select();

  return { data, error };
};

/**
 * Update a workout template
 * Admin only
 */
export const updateWorkoutTemplate = async (id, updates) => {
  const supabaseBrowser = await getSupabaseBrowser();
  const { data, error } = await supabaseBrowser
    .from('workout_classes')
    .update(updates)
    .eq('id', id)
    .select();

  return { data, error };
};

/**
 * Delete a workout template
 * Admin only
 */
export const deleteWorkoutTemplate = async (id) => {
  const supabaseBrowser = await getSupabaseBrowser();
  const { error } = await supabaseBrowser
    .from('workout_classes')
    .delete()
    .eq('id', id);

  return { error };
};

/**
 * Fetch class sessions (all for admin, or filtered by instructorId for instructors)
 */
export const fetchAllSessions = async (instructorId = null) => {
  const supabaseBrowser = await getSupabaseBrowser();
  let query = supabaseBrowser
    .from('class_sessions')
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
    .order('start_time', { ascending: true });

  if (instructorId) {
    query = query.eq('instructor_id', instructorId);
  }

  const { data, error } = await query;

  return { data, error };
};

/**
 * Create a class session
 * Admin & Instructor
 */
export const createSession = async (session) => {
  const supabaseBrowser = await getSupabaseBrowser();
  const { data, error } = await supabaseBrowser
    .from('class_sessions')
    .insert(session)
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
    `);

  return { data, error };
};

/**
 * Book a user into a session (admin & instructor)
 */
export const adminBookUser = async (userId, sessionId) => {
  const supabaseBrowser = await getSupabaseBrowser();
  const { data, error } = await supabaseBrowser
    .from('bookings')
    .insert({
      user_id: userId,
      session_id: sessionId,
      booking_status: 'confirmed',
    })
    .select();

  return { data, error };
};

/**
 * Get all bookings for a session (admin & instructor)
 */
export const getSessionBookings = async (sessionId) => {
  const supabaseBrowser = await getSupabaseBrowser();
  const { data, error } = await supabaseBrowser
    .from('bookings')
    .select(`
      id,
      booking_status,
      booked_at,
      user_profiles (
        id,
        username,
        email,
        full_name
      )
    `)
    .eq('session_id', sessionId)
    .eq('booking_status', 'confirmed')
    .order('booked_at', { ascending: true });

  return { data, error };
};

/**
 * Get waitlist for a session (admin & instructor)
 */
export const getSessionWaitlist = async (sessionId) => {
  const supabaseBrowser = await getSupabaseBrowser();
  const { data, error } = await supabaseBrowser
    .from('waitlist')
    .select(`
      id,
      position,
      joined_at,
      user_profiles (
        id,
        username,
        email,
        full_name
      )
    `)
    .eq('session_id', sessionId)
    .order('position', { ascending: true });

  return { data, error };
};
