import { formatDate } from '@/utils/calendarHelpers';

/**
 * Filters and sorts class sessions by period ('all' | 'today' | 'upcoming').
 */
export function filterSessionsByPeriod(sessions, filter, referenceTime = null) {
  const now = referenceTime ? new Date(referenceTime) : new Date();

  const byNearestFirst = (a, b) =>
    new Date(a.start_time) - new Date(b.start_time);

  switch (filter) {
    case 'today': {
      const todayFormatted = formatDate(now);
      return sessions
        .filter((s) => formatDate(s.start_time) === todayFormatted)
        .sort(byNearestFirst);
    }
    case 'upcoming':
      return sessions
        .filter((s) => new Date(s.start_time) >= now)
        .sort(byNearestFirst);
    case 'all':
    default: {
      const upcoming = sessions
        .filter((s) => new Date(s.start_time) >= now)
        .sort(byNearestFirst);
      const past = sessions
        .filter((s) => new Date(s.start_time) < now)
        .sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
      return [...upcoming, ...past];
    }
  }
}
