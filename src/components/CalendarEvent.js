import {
  SPOTS_ALMOST_FULL_THRESHOLD,
  SPOTS_FULL_THRESHOLD,
} from "../utils/constants";

export default function CalendarEvent({ event }) {
  const spotsLeft = event.resource.spotsLeft;
  const isAlmostFull =
    spotsLeft <= SPOTS_ALMOST_FULL_THRESHOLD && spotsLeft > SPOTS_FULL_THRESHOLD;
  const isFull = spotsLeft <= SPOTS_FULL_THRESHOLD;
  const isBooked = event.resource.isBooked;

  return (
    <div
      className={`text-xs leading-tight overflow-hidden ${
        isAlmostFull ? "font-bold" : ""
      } ${isFull ? "opacity-75" : ""}`}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="truncate font-semibold">{event.title}</span>
        {isBooked && (
          <span className="text-[11px] bg-green-500 text-white px-1 rounded shrink-0">
            ✓
          </span>
        )}
      </div>
      <div className="opacity-85 truncate text-[11px] mt-0.5">
        {spotsLeft > SPOTS_FULL_THRESHOLD ? `${spotsLeft} spots left` : "Full"}
      </div>
    </div>
  );
}
