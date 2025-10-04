"use client"
import { supabaseBrowser } from "@/lib/browser";
export const searchUsers = async (searchTerm) => {
  const { data, error } = await supabaseBrowser
    .from('user_profiles')
    .select('id, username, email, full_name')
    .or(`username.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`)
    .limit(10);
  
  return { data, error };
};

export const adminBookUser = async (userId, sessionId) => {
  const { data, error } = await supabaseBrowser
    .from('bookings')
    .insert({ user_id: userId, session_id: sessionId, booking_status: 'confirmed' })
    .select();
  
  return { data, error };
};

export const getSessionBookings = async (sessionId) => {
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

export const adminRemoveBooking = async (bookingId) => {
  const { error } = await supabaseBrowser
    .from('bookings')
    .delete()
    .eq('id', bookingId);
  
  return { error };
};