// src/components/CalendarEvent.js
import {
  SPOTS_ALMOST_FULL_THRESHOLD,
  SPOTS_FULL_THRESHOLD,
} from "../utils/constants";
import WorkoutIcon from "./WorkoutIcon";

export default function CalendarEvent({ event }) {
  const { workoutTitle, instructorName, spotsLeft = 0, isBooked } =
    event.resource || {};
  const isAlmostFull =
    spotsLeft <= SPOTS_ALMOST_FULL_THRESHOLD && spotsLeft > SPOTS_FULL_THRESHOLD;
  const isFull = spotsLeft <= SPOTS_FULL_THRESHOLD;
  const title = workoutTitle || event.title?.split(" - ")[0] || event.title;

  return (
    <div
      className={`h-full flex flex-col justify-between leading-tight overflow-hidden text-xs ${
        isFull ? "opacity-90" : ""
      }`}
    >
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1 min-w-0">
            <WorkoutIcon
              title={title}
              className="w-3.5 h-3.5 shrink-0 opacity-80"
            />
            <span className="font-bold truncate text-[11px] sm:text-xs tracking-tight">
              {title}
            </span>
          </div>
          {isBooked && (
            <span
              className="inline-flex items-center px-1 py-[1px] rounded text-[9px] font-bold bg-green-600 text-white shrink-0 shadow-2xs"
              title="Lefoglalva"
              aria-label="Lefoglalva"
            >
              <span aria-hidden="true">✓</span>
              <span className="sr-only">Lefoglalva</span>
            </span>
          )}
        </div>
        {instructorName && instructorName !== "TBA" && (
          <div className="text-[10px] opacity-75 truncate mt-0.5 font-medium">
            {instructorName}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-1 text-[10px] mt-1 pt-0.5 border-t border-black/10">
        <span
          className={`font-semibold ${
            isFull
              ? "text-red-700 font-bold"
              : isAlmostFull
              ? "text-amber-800 font-bold"
              : "opacity-85"
          }`}
        >
          {isFull ? "Full" : `${spotsLeft} spots`}
        </span>
      </div>
    </div>
  );
}
