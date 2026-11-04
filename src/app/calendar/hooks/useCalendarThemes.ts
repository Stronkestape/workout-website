import { useCallback } from 'react';
import { getWorkoutTheme } from '@/utils/workoutThemes';

export function useCalendarThemes() {
  const eventPropGetter = useCallback((event: any) => {
    const workoutTitle = event.resource?.workoutTitle || event.title;
    const theme = getWorkoutTheme(workoutTitle);
    return {
      style: {
        backgroundColor: theme.calendarBg,
        color: theme.calendarText,
        borderLeft: `4px solid ${theme.calendarBorder}`,
        borderTop: `1px solid ${theme.calendarBorder}40`,
        borderRight: `1px solid ${theme.calendarBorder}40`,
        borderBottom: `1px solid ${theme.calendarBorder}40`,
      },
    };
  }, []);

  return { eventPropGetter };
}
