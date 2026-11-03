import { useState } from "react";
import {
  format,
  startOfWeek,
  endOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  isSameDay,
  isBefore,
  isAfter,
} from "date-fns";
import WorkoutIcon from "@/components/WorkoutIcon";
import { getDateLimits } from "@/utils/calendarHelpers";
import { getWorkoutTheme } from "@/utils/workoutThemes";
import {
  SPOTS_FULL_THRESHOLD,
  SPOTS_ALMOST_FULL_THRESHOLD,
} from "@/utils/constants";
import { MobileCalendarSkeleton } from "./CalendarSkeleton";

export default function MobileScheduleView({
  currentDate,
  today,
  loading,
  filteredEvents,
  selectedWorkoutType,
  onNavigate,
  onSelectEvent,
}) {
  const [selectedMobileDay, setSelectedMobileDay] = useState(null);

  // Mobile week calculation (Monday start)
  const mobileWeekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const mobileWeekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const mobileWeekDays = Array.from({ length: 7 }, (_, i) =>
    addDays(mobileWeekStart, i)
  );

  const weekLimits = getDateLimits("week", today);
  const prevWeekDate = subWeeks(currentDate, 1);
  prevWeekDate.setHours(0, 0, 0, 0);
  const nextWeekDate = addWeeks(currentDate, 1);
  nextWeekDate.setHours(0, 0, 0, 0);
  const canMobileGoPrev = !isBefore(prevWeekDate, weekLimits.min);
  const canMobileGoNext = !isAfter(nextWeekDate, weekLimits.max);

  const handleMobilePrevWeek = () => {
    if (canMobileGoPrev) {
      setSelectedMobileDay(null);
      onNavigate(subWeeks(currentDate, 1), "week");
    }
  };

  const handleMobileNextWeek = () => {
    if (canMobileGoNext) {
      setSelectedMobileDay(null);
      onNavigate(addWeeks(currentDate, 1), "week");
    }
  };

  const handleMobileToday = () => {
    setSelectedMobileDay(null);
    onNavigate(new Date(), "week");
  };

  const isCurrentWeek = today >= mobileWeekStart && today <= mobileWeekEnd;

  const mobileWeekEvents = filteredEvents
    .filter((e) => {
      if (e.start < mobileWeekStart || e.start > mobileWeekEnd) return false;
      if (!selectedMobileDay && isCurrentWeek) {
        return isSameDay(e.start, today) || isAfter(e.start, today);
      }
      return true;
    })
    .sort((a, b) => a.start - b.start);

  const visibleMobileDays = selectedMobileDay
    ? mobileWeekDays.filter((d) => isSameDay(d, selectedMobileDay))
    : isCurrentWeek
    ? mobileWeekDays.filter((d) => isSameDay(d, today) || isAfter(d, today))
    : mobileWeekDays;

  if (loading) {
    return (
      <div className="md:hidden">
        <MobileCalendarSkeleton />
      </div>
    );
  }

  return (
    <div className="md:hidden space-y-4">
      {/* Week Navigation Card */}
      <div className="bg-white rounded-xl shadow-xs border border-stone-300 p-3.5">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleMobilePrevWeek}
              disabled={!canMobileGoPrev}
              aria-label="Previous week"
              className={`p-2 rounded-lg text-sm font-semibold transition-colors ${
                canMobileGoPrev
                  ? "bg-stone-800 text-white active:bg-stone-700"
                  : "bg-stone-200 text-stone-500 cursor-not-allowed"
              }`}
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleMobileToday}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-stone-200 text-stone-800 hover:bg-stone-300 transition-colors"
            >
              Today
            </button>
            <button
              type="button"
              onClick={handleMobileNextWeek}
              disabled={!canMobileGoNext}
              aria-label="Next week"
              className={`p-2 rounded-lg text-sm font-semibold transition-colors ${
                canMobileGoNext
                  ? "bg-stone-800 text-white active:bg-stone-700"
                  : "bg-stone-200 text-stone-500 cursor-not-allowed"
              }`}
            >
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
          <div className="text-xs font-bold text-stone-800 text-right">
            {format(mobileWeekStart, "MMM d")} –{" "}
            {format(mobileWeekEnd, "MMM d, yyyy")}
          </div>
        </div>

        {/* 7-Day Filter Strip */}
        <div className="grid grid-cols-8 gap-1">
          <button
            type="button"
            onClick={() => setSelectedMobileDay(null)}
            className={`flex flex-col items-center justify-center py-2 rounded-lg text-xs font-semibold transition-colors ${
              !selectedMobileDay
                ? "bg-warm-terracotta text-white shadow-xs"
                : "bg-stone-100 text-stone-700 hover:bg-stone-200"
            }`}
          >
            <span className="text-[10px] uppercase">All</span>
            <span className="text-xs font-bold mt-0.5">
              {mobileWeekEvents.length}
            </span>
          </button>
          {mobileWeekDays.map((day) => {
            const isSelected =
              selectedMobileDay && isSameDay(day, selectedMobileDay);
            const isTodayDay = isSameDay(day, new Date());
            const dayCount = mobileWeekEvents.filter((e) =>
              isSameDay(e.start, day)
            ).length;

            return (
              <button
                type="button"
                key={day.toISOString()}
                onClick={() => setSelectedMobileDay(isSelected ? null : day)}
                className={`flex flex-col items-center justify-center py-1.5 rounded-lg transition-colors relative ${
                  isSelected
                    ? "bg-warm-terracotta text-white shadow-xs"
                    : isTodayDay
                    ? "bg-warm-terracotta/15 text-stone-900 border border-warm-terracotta/40 font-bold"
                    : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                }`}
              >
                <span className="text-[10px] font-medium uppercase opacity-80">
                  {format(day, "EEE").slice(0, 2)}
                </span>
                <span className="text-xs font-bold mt-0.5">
                  {format(day, "d")}
                </span>
                {dayCount > 0 && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full mt-1 ${
                      isSelected ? "bg-white" : "bg-warm-terracotta"
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile Sessions List grouped by day */}
      <div className="space-y-4">
        {visibleMobileDays.map((day) => {
          const dayEvents = mobileWeekEvents.filter((e) =>
            isSameDay(e.start, day)
          );
          if (dayEvents.length === 0 && !selectedMobileDay) return null;

          const isTodayDay = isSameDay(day, new Date());

          return (
            <div
              key={day.toISOString()}
              className="bg-white rounded-xl shadow-xs border border-stone-300 overflow-hidden"
            >
              <div
                className={`px-4 py-2.5 border-b border-stone-200 flex items-center justify-between ${
                  isTodayDay ? "bg-warm-terracotta/10" : "bg-stone-100"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-stone-900">
                    {format(day, "EEEE, MMM d")}
                  </span>
                  {isTodayDay && (
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-warm-terracotta text-white rounded-full">
                      Today
                    </span>
                  )}
                </div>
                <span className="text-xs text-stone-600 font-medium">
                  {dayEvents.length}{" "}
                  {dayEvents.length === 1 ? "class" : "classes"}
                </span>
              </div>

              {dayEvents.length === 0 ? (
                <div className="p-6 text-center text-sm text-stone-600 font-medium">
                  No classes scheduled for this day.
                </div>
              ) : (
                <div className="divide-y divide-stone-200">
                  {dayEvents.map((event) => {
                    const {
                      spotsLeft,
                      maxCapacity,
                      isBooked,
                      instructorName,
                      workoutTitle,
                    } = event.resource || {};
                    const isFull = spotsLeft <= SPOTS_FULL_THRESHOLD;
                    const isAlmostFull =
                      spotsLeft <= SPOTS_ALMOST_FULL_THRESHOLD &&
                      spotsLeft > SPOTS_FULL_THRESHOLD;
                    const displayTitle =
                      workoutTitle || event.title.split(" - ")[0];
                    const theme = getWorkoutTheme(displayTitle);

                    return (
                      <button
                        type="button"
                        key={event.id}
                        onClick={() => onSelectEvent(event)}
                        className="w-full text-left p-3.5 hover:bg-stone-50 active:bg-stone-100 transition-colors flex items-center justify-between gap-3 border-l-4"
                        style={{ borderLeftColor: theme.calendarBorder }}
                      >
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          {/* Time Pill */}
                          <div className="bg-stone-200/90 text-stone-900 rounded-lg px-2.5 py-1.5 text-center shrink-0 min-w-[64px] border border-stone-300/80">
                            <div className="text-xs font-bold leading-tight">
                              {format(event.start, "HH:mm")}
                            </div>
                            <div className="text-[10px] text-stone-600 leading-tight mt-0.5">
                              {format(event.end, "HH:mm")}
                            </div>
                          </div>

                          {/* Title & Instructor */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <WorkoutIcon
                                title={displayTitle}
                                className="w-4 h-4 shrink-0 opacity-80"
                              />
                              <h4 className="font-bold text-sm text-stone-900 truncate">
                                {displayTitle}
                              </h4>
                              {isBooked && (
                                <span
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-800 shrink-0 border border-green-300"
                                  title="Booked"
                                  aria-label="Booked"
                                >
                                  <span aria-hidden="true">✓</span>
                                  <span className="sr-only">Booked</span>
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-stone-600 truncate mt-0.5">
                              Instructor: {instructorName}
                            </p>
                          </div>
                        </div>

                        {/* Right Side Spots Badge */}
                        <div className="shrink-0 flex items-center gap-1.5">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                              isFull
                                ? "bg-red-100 text-red-800 border border-red-300"
                                : isAlmostFull
                                ? "bg-amber-100 text-amber-900 border border-amber-300"
                                : "bg-green-100 text-green-900 border border-green-300"
                            }`}
                          >
                            {isFull ? "Full" : `${spotsLeft}/${maxCapacity}`}
                          </span>
                          <ChevronRightIcon className="w-4 h-4 text-stone-500" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {mobileWeekEvents.length === 0 && (
          <div className="bg-white rounded-xl shadow-xs border border-stone-300 p-8 text-center">
            <p className="text-stone-600 font-medium text-sm">
              {selectedWorkoutType !== "all"
                ? "No classes found for the selected category this week."
                : "No classes scheduled for this week."}
            </p>
          </div>
        )}
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
