import { formatDate } from '@/utils/calendarHelpers';

export type SessionFilterPeriod = 'all' | 'today' | 'upcoming' | string;

export interface SessionWithTime {
  start_time: string | Date;
  [key: string]: unknown;
}

/**
 * Filters and sorts class sessions by period ('all' | 'today' | 'upcoming').
 */
export function filterSessionsByPeriod<T extends SessionWithTime>(
  sessions: T[],
  filter: SessionFilterPeriod,
  referenceTime: Date | string | null = null
): T[] {
  const now = referenceTime ? new Date(referenceTime) : new Date();

  const byNearestFirst = (a: T, b: T) =>
    new Date(a.start_time).getTime() - new Date(b.start_time).getTime();

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
        .sort((a: T, b: T) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
      return [...upcoming, ...past];
    }
  }
}
