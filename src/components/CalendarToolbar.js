export default function CalendarToolbar({ label, onNavigate, onView, view }) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 p-1 sm:p-2 z-20">
      <div className="flex items-center justify-between sm:justify-start gap-2">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onNavigate("PREV")}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            aria-label="Previous period"
          >
            ←
          </button>
          <button
            onClick={() => onNavigate("TODAY")}
            className="px-3.5 py-1.5 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
          >
            Today
          </button>
          <button
            onClick={() => onNavigate("NEXT")}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            aria-label="Next period"
          >
            →
          </button>
        </div>

        <div className="flex sm:hidden gap-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => onView("week")}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              view === "week"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-700 hover:bg-gray-200"
            }`}
          >
            Week
          </button>
          <button
            onClick={() => onView("month")}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              view === "month"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-700 hover:bg-gray-200"
            }`}
          >
            Month
          </button>
        </div>
      </div>

      <h3 className="text-base sm:text-lg font-bold text-gray-900 text-center">
        {label}
      </h3>

      <div className="hidden sm:flex gap-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => onView("week")}
          className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors ${
            view === "week"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-gray-700 hover:bg-gray-200"
          }`}
        >
          Week
        </button>
        <button
          onClick={() => onView("month")}
          className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors ${
            view === "month"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-gray-700 hover:bg-gray-200"
          }`}
        >
          Month
        </button>
      </div>
    </div>
  );
}
