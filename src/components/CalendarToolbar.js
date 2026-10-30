// src/components/CalendarToolbar.js

export default function CalendarToolbar({ label, onNavigate, onView, view }) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 p-1 sm:p-2 z-20">
      <div className="flex items-center justify-between sm:justify-start gap-2">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onNavigate("PREV")}
            className="p-2 sm:px-3 sm:py-1.5 bg-stone-800 text-white rounded-lg hover:bg-stone-700 transition-colors text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-600"
            aria-label="Előző időszak"
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => onNavigate("TODAY")}
            className="px-3.5 py-1.5 bg-stone-200 text-stone-800 border border-stone-300 rounded-lg hover:bg-stone-300 transition-colors text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
          >
            Ma
          </button>
          <button
            onClick={() => onNavigate("NEXT")}
            className="p-2 sm:px-3 sm:py-1.5 bg-stone-800 text-white rounded-lg hover:bg-stone-700 transition-colors text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-600"
            aria-label="Következő időszak"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="flex sm:hidden gap-1 bg-stone-200/90 p-1 rounded-lg border border-stone-300">
          <button
            onClick={() => onView("week")}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
              view === "week"
                ? "bg-green-600 text-white shadow-xs"
                : "text-stone-700 hover:bg-stone-300/80"
            }`}
          >
            Hét
          </button>
          <button
            onClick={() => onView("month")}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
              view === "month"
                ? "bg-green-600 text-white shadow-xs"
                : "text-stone-700 hover:bg-stone-300/80"
            }`}
          >
            Hónap
          </button>
        </div>
      </div>

      <h3 className="text-base sm:text-lg font-bold text-stone-900 text-center tracking-tight">
        {label}
      </h3>

      <div className="hidden sm:flex gap-1 bg-stone-200/90 p-1 rounded-lg border border-stone-300">
        <button
          onClick={() => onView("week")}
          className={`px-3.5 py-1.5 rounded-md text-sm font-semibold transition-colors ${
            view === "week"
              ? "bg-green-600 text-white shadow-xs"
              : "text-stone-700 hover:bg-stone-300/80"
          }`}
        >
          Hét
        </button>
        <button
          onClick={() => onView("month")}
          className={`px-3.5 py-1.5 rounded-md text-sm font-semibold transition-colors ${
            view === "month"
              ? "bg-green-600 text-white shadow-xs"
              : "text-stone-700 hover:bg-stone-300/80"
          }`}
        >
          Hónap
        </button>
      </div>
    </div>
  );
}

function ChevronLeftIcon({ className = "w-4 h-4" }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 19l-7-7 7-7"
      />
    </svg>
  );
}

function ChevronRightIcon({ className = "w-4 h-4" }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5l7 7-7 7"
      />
    </svg>
  );
}
