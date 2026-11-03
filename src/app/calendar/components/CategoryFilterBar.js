import WorkoutIcon from "@/components/WorkoutIcon";
import { WORKOUT_THEMES, DEFAULT_THEME } from "@/utils/workoutThemes";

export default function CategoryFilterBar({
  selectedWorkoutType,
  workoutCounts,
  onSelectType,
}) {
  return (
    <div className="mb-4 bg-white rounded-xl shadow-xs border border-stone-300 p-3 sm:p-4">
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-stone-600">
          <FilterIcon className="w-3.5 h-3.5" />
          <span>Category Filter & Color Legend</span>
        </div>
        {selectedWorkoutType !== "all" && (
          <button
            type="button"
            onClick={() => onSelectType("all")}
            className="text-xs text-[#8c3010] hover:underline font-semibold focus-visible:outline-none"
          >
            Clear Filter
          </button>
        )}
      </div>

      {/* Desktop and Mobile: Flex wrap with ample vertical clearance so active rings are never clipped */}
      <div className="flex flex-wrap items-center gap-2 py-1.5 px-0.5">
        <button
          type="button"
          onClick={() => onSelectType("all")}
          aria-pressed={selectedWorkoutType === "all"}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 border ${
            selectedWorkoutType === "all"
              ? "bg-stone-900 text-white border-stone-900 shadow-xs ring-2 ring-stone-900 ring-offset-1"
              : "bg-stone-100 text-stone-800 hover:bg-stone-200 border-stone-300"
          }`}
        >
          <span>All Workouts</span>
        </button>

        {Object.values(WORKOUT_THEMES).map((theme) => {
          const isSelected = selectedWorkoutType === theme.key;
          const displayLabel = theme.label || theme.key;

          return (
            <button
              type="button"
              key={theme.key}
              onClick={() => onSelectType(isSelected ? "all" : theme.key)}
              aria-pressed={isSelected}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 border ${
                isSelected
                  ? "ring-2 ring-stone-900 ring-offset-1 shadow-sm font-bold"
                  : "hover:opacity-95"
              }`}
              style={{
                backgroundColor: theme.calendarBg,
                borderColor: isSelected
                  ? theme.calendarBorder
                  : `${theme.calendarBorder}60`,
                color: theme.calendarText,
              }}
              title={`Filter by: ${displayLabel}`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: theme.calendarBorder }}
                aria-hidden="true"
              />
              <WorkoutIcon
                title={theme.key}
                className="w-3.5 h-3.5 shrink-0 opacity-85"
              />
              <span>{displayLabel}</span>
            </button>
          );
        })}

        {workoutCounts["default"] > 0 && (
          <button
            type="button"
            key="default"
            onClick={() =>
              onSelectType(
                selectedWorkoutType === "default" ? "all" : "default"
              )
            }
            aria-pressed={selectedWorkoutType === "default"}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 border ${
              selectedWorkoutType === "default"
                ? "ring-2 ring-stone-900 ring-offset-1 shadow-sm font-bold"
                : "hover:opacity-95"
            }`}
            style={{
              backgroundColor: DEFAULT_THEME.calendarBg,
              borderColor:
                selectedWorkoutType === "default"
                  ? DEFAULT_THEME.calendarBorder
                  : `${DEFAULT_THEME.calendarBorder}60`,
              color: DEFAULT_THEME.calendarText,
            }}
            title={`Filter by: ${DEFAULT_THEME.label}`}
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: DEFAULT_THEME.calendarBorder }}
              aria-hidden="true"
            />
            <WorkoutIcon
              title="default"
              className="w-3.5 h-3.5 shrink-0 opacity-85"
            />
            <span>{DEFAULT_THEME.label}</span>
          </button>
        )}
      </div>
    </div>
  );
}

function FilterIcon({ className = "w-4 h-4" }) {
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
        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
      />
    </svg>
  );
}
