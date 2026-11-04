import { useState, useEffect, useCallback } from 'react';
import { fetchUserBookingStatus } from '@/utils/supabaseQueries';
import {
  bookWorkoutAction,
  joinWaitlistAction,
  cancelBookingAction,
  leaveWaitlistAction,
} from '@/app/calendar/actions';
import { SPOTS_FULL_THRESHOLD } from '@/utils/constants';
import type { CalendarEvent } from '@/app/calendar/hooks/useScheduleData';

export interface WorkoutResource {
  isBooked?: boolean;
  spotsLeft?: number;
  maxCapacity?: number;
  instructorName?: string;
  [key: string]: unknown;
}

export interface GenericWorkoutTarget {
  id: number | string;
  title?: string;
  start?: Date;
  end?: Date;
  resource?: WorkoutResource;
}

export type WorkoutBookingTarget = CalendarEvent | GenericWorkoutTarget;

export interface BookingUser {
  id: string;
  [key: string]: unknown;
}

export interface BookingRecord {
  user_id: string | null;
  session_id: number | null;
  [key: string]: unknown;
}

export interface UseWorkoutBookingReturn {
  loading: boolean;
  userBooking: BookingRecord | null;
  isOnWaitlist: boolean;
  waitlistPosition: number | null;
  error: string;
  handleBookWorkout: () => Promise<void>;
  handleCancelBooking: () => Promise<void>;
  handleLeaveWaitlist: () => Promise<void>;
  checkUserBookingStatus: () => Promise<void>;
}

export function useWorkoutBooking(
  workout: WorkoutBookingTarget | null | undefined,
  user: BookingUser | null | undefined,
  onBookingChange?: () => void | Promise<void>
): UseWorkoutBookingReturn {
  const [loading, setLoading] = useState(false);
  const [userBooking, setUserBooking] = useState<BookingRecord | null>(() =>
    workout?.resource?.isBooked && user
      ? { user_id: user.id, session_id: Number(workout.id) }
      : null
  );
  const [isOnWaitlist, setIsOnWaitlist] = useState(false);
  const [waitlistPosition, setWaitlistPosition] = useState<number | null>(null);
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

      setUserBooking(booking as BookingRecord | null);

      if (waitlist) {
        setIsOnWaitlist(true);
        setWaitlistPosition(waitlist.position);
      } else {
        setIsOnWaitlist(false);
        setWaitlistPosition(null);
      }
    } catch (err) {
      console.error('Error checking booking status:', err);
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
      const isFull = (workout.resource?.spotsLeft ?? 0) <= SPOTS_FULL_THRESHOLD;

      if (isFull) {
        // Join waitlist via Server Action
        const result = await joinWaitlistAction(Number(workout.id));
        if (!result.success) {
          setError(result.error || 'Hiba történt a várólistára jelentkezéskor.');
          return;
        }

        setIsOnWaitlist(true);
        await checkUserBookingStatus();
      } else {
        // Book directly via Server Action
        const result = await bookWorkoutAction(Number(workout.id));
        if (!result.success) {
          setError(result.error || 'Hiba történt a foglalás során.');
          return;
        }

        setUserBooking({ user_id: userId, session_id: Number(workout.id) });
      }

      await onBookingChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Váratlan hiba történt a foglalás során.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!userId || !workout) return;
    setLoading(true);
    setError('');

    try {
      const result = await cancelBookingAction(Number(workout.id));
      if (!result.success) {
        setError(result.error || 'Hiba történt a foglalás lemondása során.');
        return;
      }

      setUserBooking(null);
      await onBookingChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Váratlan hiba történt a lemondás során.');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveWaitlist = async () => {
    if (!userId || !workout) return;
    setLoading(true);
    setError('');

    try {
      const result = await leaveWaitlistAction(Number(workout.id));
      if (!result.success) {
        setError(result.error || 'Hiba történt a várólista elhagyása során.');
        return;
      }

      setIsOnWaitlist(false);
      setWaitlistPosition(null);
      await onBookingChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Váratlan hiba történt.');
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
