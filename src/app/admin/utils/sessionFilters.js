/**
 * Filters and sorts class sessions by period ('all' | 'today' | 'upcoming').
 */
export function filterSessionsByPeriod(sessions, filter) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const byNearestFirst = (a, b) =>
    new Date(a.start_time) - new Date(b.start_time);

  switch (filter) {
    case 'today':
      return sessions
        .filter((s) => {
          const sessionDate = new Date(s.start_time);
          return sessionDate >= today && sessionDate < tomorrow;
        })
        .sort(byNearestFirst);
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
