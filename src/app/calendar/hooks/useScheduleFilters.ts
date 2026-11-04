import { useState, useEffect, useMemo, useCallback, startTransition } from 'react';
import { getWorkoutTheme, WORKOUT_THEMES, normalizeWorkoutKey } from '@/utils/workoutThemes';

export function useScheduleFilters(events: any[] = []) {
  const [selectedWorkoutType, setSelectedWorkoutType] = useState<string>('all');

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    try {
      const params = new URLSearchParams(window.location.search);
      const filterParam = params.get('filter');
      if (filterParam) {
        const normalizedKey = normalizeWorkoutKey(filterParam);
        if (normalizedKey in WORKOUT_THEMES || normalizedKey === 'default') {
          setSelectedWorkoutType(normalizedKey);
        }
      }
    } catch {
      // Ignore URL parsing errors
    }
  }, []);

  const handleWorkoutTypeSelect = useCallback((type: string) => {
    startTransition(() => {
      setSelectedWorkoutType(type);
    });
  }, []);

  const filteredEvents = useMemo(() => {
    if (selectedWorkoutType === 'all') return events;
    return events.filter((e) => {
      const title = e.resource?.workoutTitle || e.title;
      return getWorkoutTheme(title).key === selectedWorkoutType;
    });
  }, [events, selectedWorkoutType]);

  const workoutCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const event of events) {
      const title = event.resource?.workoutTitle || event.title;
      const key = getWorkoutTheme(title).key;
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, [events]);

  return {
    selectedWorkoutType,
    setSelectedWorkoutType,
    handleWorkoutTypeSelect,
    filteredEvents,
    workoutCounts,
  };
}
