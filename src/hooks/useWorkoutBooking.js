import { useState, useEffect, useCallback } from 'react';
import {
  fetchUserBookingStatus,
  bookWorkoutSession,
  joinWaitlist,
  cancelBooking,
  leaveWaitlist,
} from '@/utils/supabaseQueries';
import { SPOTS_FULL_THRESHOLD } from '@/utils/constants';

export function useWorkoutBooking(workout, user, onBookingChange) {
  const [loading, setLoading] = useState(false);
  const [userBooking, setUserBooking] = useState(() =>
    workout?.resource?.isBooked && user
      ? { user_id: user.id, session_id: workout.id }
      : null
  );
  const [isOnWaitlist, setIsOnWaitlist] = useState(false);
  const [waitlistPosition, setWaitlistPosition] = useState(null);
  const [error, setError] = useState('');

  const userId = user?.id;
  const workoutId = workout?.id;

  const checkUserBookingStatus = useCallback(async () => {
    if (!userId || !workoutId) return;

    try {
      const { booking, waitlist, hasError } = await fetchUserBookingStatus(
        userId,
        workoutId
      );

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
  }, [userId, workoutId]);

  useEffect(() => {
    if (userId && workoutId) {
      checkUserBookingStatus();
    } else {
      setUserBooking(null);
      setIsOnWaitlist(false);
      setWaitlistPosition(null);
    }
  }, [userId, workoutId, checkUserBookingStatus]);

  const handleBookWorkout = async () => {
    if (!userId || !workout) return;
    setLoading(true);
    setError('');

    try {
      const isFull = workout.resource.spotsLeft <= SPOTS_FULL_THRESHOLD;

      if (isFull) {
        // Join waitlist
        const { error: waitlistError } = await joinWaitlist(userId, workout.id);

        if (waitlistError) throw waitlistError;

        setIsOnWaitlist(true);
        await checkUserBookingStatus(); // Refresh to get waitlist position
      } else {
        // Book directly
        const { error: bookingError } = await bookWorkoutSession(
          userId,
          workout.id
        );

        if (bookingError) throw bookingError;

        setUserBooking({ user_id: userId, session_id: workout.id });
      }

      await onBookingChange?.(); // Refresh calendar and selectedWorkout silently
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!userId || !workout) return;
    setLoading(true);
    setError('');

    try {
      const { error: cancelError } = await cancelBooking(userId, workout.id);

      if (cancelError) throw cancelError;

      setUserBooking(null);

      await onBookingChange?.(); // Refresh calendar and selectedWorkout silently
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveWaitlist = async () => {
    if (!userId || !workout) return;
    setLoading(true);
    setError('');

    try {
      const { error: leaveError } = await leaveWaitlist(userId, workout.id);

      if (leaveError) throw leaveError;

      setIsOnWaitlist(false);
      setWaitlistPosition(null);

      await onBookingChange?.();
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
    checkUserBookingStatus,
  };
}
