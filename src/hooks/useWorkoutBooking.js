import { useState, useEffect, useCallback } from 'react';
import { 
  fetchUserBookingStatus, 
  bookWorkoutSession, 
  joinWaitlist, 
  cancelBooking, 
  leaveWaitlist 
} from '@/utils/supabaseQueries';
import { SPOTS_FULL_THRESHOLD } from '@/utils/constants';

export function useWorkoutBooking(workout, user, onBookingChange) {
  const [loading, setLoading] = useState(false);
  const [userBooking, setUserBooking] = useState(null);
  const [isOnWaitlist, setIsOnWaitlist] = useState(false);
  const [waitlistPosition, setWaitlistPosition] = useState(null);
  const [error, setError] = useState('');

  const checkUserBookingStatus = useCallback(async () => {
    try {
      const { booking, waitlist, hasError } = await fetchUserBookingStatus(user.id, workout.id);

      if (hasError) {
        console.error('Error checking booking status');
        return;
      }

      setUserBooking(booking);
      
      if (waitlist) {
        setIsOnWaitlist(true);
        setWaitlistPosition(waitlist.position);
      } else {
        setIsOnWaitlist(false);
        setWaitlistPosition(null);
      }
    } catch (error) {
      console.error('Error checking booking status:', error);
    }
  },[user,workout]);

  useEffect(() => {
    if (user && workout) {
      checkUserBookingStatus();
    }
  }, [user, workout,checkUserBookingStatus]);

  

  const handleBookWorkout = async () => {
    setLoading(true);
    setError('');

    try {
      const isFull = workout.resource.spotsLeft <= SPOTS_FULL_THRESHOLD;

      if (isFull) {
        // Join waitlist
        const { error: waitlistError } = await joinWaitlist(user.id, workout.id);
        
        if (waitlistError) throw waitlistError;
        
        setIsOnWaitlist(true);
        await checkUserBookingStatus(); // Refresh to get position
      } else {
        // Book directly
        const { error: bookingError } = await bookWorkoutSession(user.id, workout.id);
        
        if (bookingError) throw bookingError;
        
        setUserBooking({ user_id: user.id, session_id: workout.id });
        
        // Update the workout's spots locally for immediate UI update
        workout.resource.spotsLeft -= 1;
        workout.resource.currentBookings += 1;
      }

      onBookingChange(); // Refresh calendar
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    setLoading(true);
    setError('');

    try {
      const { error: cancelError } = await cancelBooking(user.id, workout.id);
      
      if (cancelError) throw cancelError;

      setUserBooking(null);
      
      // Update the workout's spots locally for immediate UI update
      workout.resource.spotsLeft += 1;
      workout.resource.currentBookings -= 1;
      
      onBookingChange(); // Refresh calendar
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveWaitlist = async () => {
    setLoading(true);
    setError('');

    try {
      const { error: leaveError } = await leaveWaitlist(user.id, workout.id);
      
      if (leaveError) throw leaveError;

      setIsOnWaitlist(false);
      setWaitlistPosition(null);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    userBooking,
    isOnWaitlist,
    waitlistPosition,
    error,
    handleBookWorkout,
    handleCancelBooking,
    handleLeaveWaitlist,
    checkUserBookingStatus
  };
};