import { useState, useMemo, startTransition } from 'react';
import { isBefore, isAfter } from 'date-fns';
import { getDateLimits, toGymLocalTime } from '@/utils/calendarHelpers';

export function useScheduleNavigation(serverNow?: string | null) {
  const [currentDate, setCurrentDate] = useState<Date>(() =>
    toGymLocalTime(serverNow ? new Date(serverNow) : new Date())
  );
  const [view, setView] = useState<'week' | 'month' | string>('week');

  const today = useMemo(() => {
    const d = toGymLocalTime(serverNow ? new Date(serverNow) : new Date());
    d.setHours(0, 0, 0, 0);
    return d;
  }, [serverNow]);

  const handleNavigate = (newDate: Date | string, newView?: string) => {
    const limits = getDateLimits(newView || view, today);
    const dateToCheck = new Date(newDate);
    dateToCheck.setHours(0, 0, 0, 0);

    if (isBefore(dateToCheck, limits.min) || isAfter(dateToCheck, limits.max)) {
      return;
    }

    setCurrentDate(new Date(newDate));
  };

  const handleViewChange = (newView: string) => {
    startTransition(() => {
      setView(newView);
    });

    const limits = getDateLimits(newView, today);
    const todayForView = new Date(today);

    if (isBefore(todayForView, limits.min) || isAfter(todayForView, limits.max)) {
      setCurrentDate(limits.min);
    } else {
      setCurrentDate(todayForView);
    }
  };

  return {
    currentDate,
    setCurrentDate,
    view,
    setView,
    today,
    handleNavigate,
    handleViewChange,
  };
}
