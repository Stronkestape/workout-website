export default function CalendarLoading() {
  return (
    <div className="container mx-auto px-3 sm:px-6 py-4 sm:py-6">
      {/* Page Title & Context Skeleton */}
      <div className="mb-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
          Workout Calendar
        </h2>
        <p className="text-sm text-stone-600 mt-1">
          Browse group classes, filter by workout category, and book your spot.
        </p>
      </div>

      {/* Filter Bar Skeleton */}
      <div className="mb-4 bg-white rounded-xl shadow-xs border border-stone-300 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-stone-600">
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            <span>Category Filter & Color Legend</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 py-1.5 px-0.5 animate-pulse">
          <div className="h-8 w-24 bg-stone-200 rounded-lg" />
          <div className="h-8 w-28 bg-stone-200 rounded-lg" />
          <div className="h-8 w-24 bg-stone-200 rounded-lg" />
          <div className="h-8 w-26 bg-stone-200 rounded-lg" />
          <div className="h-8 w-24 bg-stone-200 rounded-lg" />
        </div>
      </div>

      {/* Calendar Grid Skeleton (720px) */}
      <div className="calendarWrapper">
        <div className="h-full w-full bg-stone-200/50 rounded-2xl animate-pulse flex items-center justify-center border border-stone-300">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-warm-terracotta border-t-transparent animate-spin" />
            <span className="text-stone-500 font-medium text-sm">
              Loading classes...
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
