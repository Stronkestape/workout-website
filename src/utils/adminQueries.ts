// src/utils/adminQueries.ts
import { getSupabaseBrowser } from './supabaseQueries';
import { sanitizeSearchTerm } from './validators';
import type { Database } from '@/types/database';
import type { PostgrestError } from '@supabase/supabase-js';

export interface UserSearchProfile {
  id: string;
  username: string;
  full_name: string | null;
  email?: string | null;
}

export interface AdminQueryResult<T> {
  data: T | null;
  error: PostgrestError | null;
}

/**
 * Search users by username or full name (email excluded for privacy)
 * Admin & Instructor (via scoped RPC with sanitized PostgREST fallback)
 */
export const searchUsers = async (
  searchTerm: string
): Promise<{ data: UserSearchProfile[] | null; error: PostgrestError | null }> => {
  const cleanTerm = sanitizeSearchTerm(searchTerm);
  if (cleanTerm.length < 2 || cleanTerm.includes('@')) {
    return { data: [], error: null };
  }

  const supabaseBrowser = await getSupabaseBrowser();
  const rpcResult = await supabaseBrowser.rpc('search_users_for_booking', {
    search_term: cleanTerm,
  });

  if (!rpcResult.error && rpcResult.data) {
    return { data: rpcResult.data as UserSearchProfile[], error: null };
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
export const fetchInstructors = async (): Promise<{
  data: UserSearchProfile[] | null;
  error: PostgrestError | null;
}> => {
  const supabaseBrowser = await getSupabaseBrowser();
  const { data, error } = await supabaseBrowser.rpc(
    'get_available_instructors'
  );

  if (!error && data) {
    return { data: data as UserSearchProfile[], error: null };
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
export const fetchWorkoutTemplates = async (): Promise<{
  data: Database['public']['Tables']['workout_classes']['Row'][] | null;
  error: PostgrestError | null;
}> => {
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
export const createWorkoutTemplate = async (
  template: Database['public']['Tables']['workout_classes']['Insert']
): Promise<{
  data: Database['public']['Tables']['workout_classes']['Row'][] | null;
  error: PostgrestError | null;
}> => {
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
export const updateWorkoutTemplate = async (
  id: number | string,
  updates: Database['public']['Tables']['workout_classes']['Update']
): Promise<{
  data: Database['public']['Tables']['workout_classes']['Row'][] | null;
  error: PostgrestError | null;
}> => {
  const supabaseBrowser = await getSupabaseBrowser();
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
  const { data, error } = await supabaseBrowser
    .from('workout_classes')
    .update(updates)
    .eq('id', numericId)
    .select();

  return { data, error };
};

/**
 * Delete a workout template
 * Admin only
 */
export const deleteWorkoutTemplate = async (
  id: number | string
): Promise<{ error: PostgrestError | null }> => {
  const supabaseBrowser = await getSupabaseBrowser();
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
  const { error } = await supabaseBrowser
    .from('workout_classes')
    .delete()
    .eq('id', numericId);

  return { error };
};

/**
 * Fetch class sessions (all for admin, or filtered by instructorId for instructors)
 */
export const fetchAllSessions = async (
  instructorId: string | null = null
): Promise<{ data: any; error: PostgrestError | null }> => {
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
export const createSession = async (
  session: Database['public']['Tables']['class_sessions']['Insert']
): Promise<{ data: any; error: PostgrestError | null }> => {
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
export const adminBookUser = async (
  userId: string,
  sessionId: number | string
): Promise<{ data: any; error: PostgrestError | null }> => {
  const supabaseBrowser = await getSupabaseBrowser();
  const numericSessionId = typeof sessionId === 'string' ? parseInt(sessionId, 10) : sessionId;
  const { data, error } = await supabaseBrowser
    .from('bookings')
    .insert({
      user_id: userId,
      session_id: numericSessionId,
      booking_status: 'confirmed',
    })
    .select();

  return { data, error };
};

/**
 * Get all bookings for a session (admin & instructor)
 */
export const getSessionBookings = async (
  sessionId: number | string
): Promise<{ data: any; error: PostgrestError | null }> => {
  const supabaseBrowser = await getSupabaseBrowser();
  const numericSessionId = typeof sessionId === 'string' ? parseInt(sessionId, 10) : sessionId;
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
    .eq('session_id', numericSessionId)
    .eq('booking_status', 'confirmed')
    .order('booked_at', { ascending: true });

  return { data, error };
};

/**
 * Get waitlist for a session (admin & instructor)
 */
export const getSessionWaitlist = async (
  sessionId: number | string
): Promise<{ data: any; error: PostgrestError | null }> => {
  const supabaseBrowser = await getSupabaseBrowser();
  const numericSessionId = typeof sessionId === 'string' ? parseInt(sessionId, 10) : sessionId;
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
    .eq('session_id', numericSessionId)
    .order('position', { ascending: true });

  return { data, error };
};
