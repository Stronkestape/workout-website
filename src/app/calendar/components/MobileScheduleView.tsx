import React, { useState } from 'react';
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
} from 'date-fns';
import WorkoutIcon from '@/components/WorkoutIcon';
import {
  formatTime,
  getDateLimits,
  toGymLocalTime,
} from '@/utils/calendarHelpers';
import { getWorkoutTheme } from '@/utils/workoutThemes';
import {
  SPOTS_FULL_THRESHOLD,
  SPOTS_ALMOST_FULL_THRESHOLD,
} from '@/utils/constants';
import { MobileCalendarSkeleton } from './CalendarSkeleton';
import type { CalendarEvent } from '../hooks/useScheduleData';

const HU_DAYS_FULL = [
  'Vasárnap',
  'Hétfő',
  'Kedd',
  'Szerda',
  'Csütörtök',
  'Péntek',
  'Szombat',
];

const HU_DAYS_SHORT = ['V', 'H', 'K', 'Sze', 'Cs', 'P', 'Szo'];

const HU_MONTHS_SHORT = [
  'jan.',
  'febr.',
  'márc.',
  'ápr.',
  'máj.',
  'jún.',
  'júl.',
  'aug.',
  'szept.',
  'okt.',
  'nov.',
  'dec.',
];

const HU_MONTHS_FULL = [
  'január',
  'február',
  'március',
  'április',
  'május',
  'június',
  'július',
  'augusztus',
  'szeptember',
  'október',
  'november',
  'december',
];

export interface MobileScheduleViewProps {
  currentDate: Date;
  today: Date;
  loading: boolean;
  filteredEvents: CalendarEvent[];
  selectedWorkoutType: string;
  onNavigate: (newDate: Date, view?: string) => void;
  onSelectEvent: (event: CalendarEvent) => void;
}

export default function MobileScheduleView({
  currentDate,
  today,
  loading,
  filteredEvents,
  selectedWorkoutType,
  onNavigate,
  onSelectEvent,
}: MobileScheduleViewProps) {
  const [selectedMobileDay, setSelectedMobileDay] = useState<Date | null>(null);

  const gymCurrentDate = toGymLocalTime(currentDate);
  const gymToday = toGymLocalTime(today);
  gymToday.setHours(0, 0, 0, 0);

  // Mobile week calculation (Monday start in Europe/Budapest wall-clock time)
  const mobileWeekStart = startOfWeek(gymCurrentDate, { weekStartsOn: 1 });
  const mobileWeekEnd = endOfWeek(gymCurrentDate, { weekStartsOn: 1 });
  const mobileWeekDays = Array.from({ length: 7 }, (_, i) =>
    addDays(mobileWeekStart, i)
  );

  const weekLimits = getDateLimits('week', gymToday);
  const prevWeekDate = subWeeks(gymCurrentDate, 1);
  prevWeekDate.setHours(0, 0, 0, 0);
  const nextWeekDate = addWeeks(gymCurrentDate, 1);
  nextWeekDate.setHours(0, 0, 0, 0);
  const canMobileGoPrev = !isBefore(prevWeekDate, weekLimits.min);
  const canMobileGoNext = !isAfter(nextWeekDate, weekLimits.max);

  const handleMobilePrevWeek = () => {
    if (canMobileGoPrev) {
      setSelectedMobileDay(null);
      onNavigate(subWeeks(gymCurrentDate, 1), 'week');
    }
  };

  const handleMobileNextWeek = () => {
    if (canMobileGoNext) {
      setSelectedMobileDay(null);
      onNavigate(addWeeks(gymCurrentDate, 1), 'week');
    }
  };

  const handleMobileToday = () => {
    setSelectedMobileDay(null);
    onNavigate(new Date(gymToday), 'week');
  };

  const isCurrentWeek =
    gymToday >= mobileWeekStart && gymToday <= mobileWeekEnd;

  const mobileWeekEvents = filteredEvents
    .filter((e) => {
      const gymStart = toGymLocalTime(e.start);
      if (gymStart < mobileWeekStart || gymStart > mobileWeekEnd) return false;
      if (!selectedMobileDay && isCurrentWeek) {
        return isSameDay(gymStart, gymToday) || isAfter(gymStart, gymToday);
      }
      return true;
    })
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const visibleMobileDays = selectedMobileDay
    ? mobileWeekDays.filter((d) => isSameDay(d, selectedMobileDay))
    : isCurrentWeek
    ? mobileWeekDays.filter(
        (d) => isSameDay(d, gymToday) || isAfter(d, gymToday)
      )
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
              aria-label="Előző hét"
              className={`p-2 rounded-lg text-sm font-semibold transition-colors ${
                canMobileGoPrev
                  ? 'bg-stone-800 text-white active:bg-stone-700'
                  : 'bg-stone-200 text-stone-500 cursor-not-allowed'
              }`}
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleMobileToday}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-stone-200 text-stone-800 hover:bg-stone-300 transition-colors"
            >
              Ma
            </button>
            <button
              type="button"
              onClick={handleMobileNextWeek}
              disabled={!canMobileGoNext}
              aria-label="Következő hét"
              className={`p-2 rounded-lg text-sm font-semibold transition-colors ${
                canMobileGoNext
                  ? 'bg-stone-800 text-white active:bg-stone-700'
                  : 'bg-stone-200 text-stone-500 cursor-not-allowed'
              }`}
            >
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
          <div className="text-xs font-bold text-stone-800 text-right">
            {HU_MONTHS_SHORT[mobileWeekStart.getMonth()]} {mobileWeekStart.getDate()}. –{' '}
            {mobileWeekEnd.getFullYear()}. {HU_MONTHS_SHORT[mobileWeekEnd.getMonth()]} {mobileWeekEnd.getDate()}.
          </div>
        </div>

        {/* 7-Day Filter Strip */}
        <div className="grid grid-cols-8 gap-1">
          <button
            type="button"
            onClick={() => setSelectedMobileDay(null)}
            className={`flex flex-col items-center justify-center py-2 rounded-lg text-xs font-semibold transition-colors ${
              !selectedMobileDay
                ? 'bg-warm-terracotta text-white shadow-xs'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            <span className="text-[10px] uppercase">Összes</span>
            <span className="text-xs font-bold mt-0.5">
              {mobileWeekEvents.length}
            </span>
          </button>
          {mobileWeekDays.map((day) => {
            const isSelected =
              Boolean(selectedMobileDay && isSameDay(day, selectedMobileDay));
            const isTodayDay = isSameDay(day, gymToday);
            const dayCount = mobileWeekEvents.filter((e) =>
              isSameDay(toGymLocalTime(e.start), day)
            ).length;

            return (
              <button
                type="button"
                key={format(day, 'yyyy-MM-dd')}
                onClick={() => setSelectedMobileDay(isSelected ? null : day)}
                className={`flex flex-col items-center justify-center py-1.5 rounded-lg transition-colors relative ${
                  isSelected
                    ? 'bg-warm-terracotta text-white shadow-xs'
                    : isTodayDay
                    ? 'bg-warm-terracotta/15 text-stone-900 border border-warm-terracotta/40 font-bold'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                <span className="text-[10px] font-medium uppercase opacity-80">
                  {HU_DAYS_SHORT[day.getDay()]}
                </span>
                <span className="text-xs font-bold mt-0.5">
                  {format(day, 'd')}
                </span>
                {dayCount > 0 && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full mt-1 ${
                      isSelected ? 'bg-white' : 'bg-warm-terracotta'
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
            isSameDay(toGymLocalTime(e.start), day)
          );
          if (dayEvents.length === 0 && !selectedMobileDay) return null;

          const isTodayDay = isSameDay(day, gymToday);

          return (
            <div
              key={format(day, 'yyyy-MM-dd')}
              className="bg-white rounded-xl shadow-xs border border-stone-300 overflow-hidden"
            >
              <div
                className={`px-4 py-2.5 border-b border-stone-200 flex items-center justify-between ${
                  isTodayDay ? 'bg-warm-terracotta/10' : 'bg-stone-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-stone-900 capitalize">
                    {HU_DAYS_FULL[day.getDay()]}, {HU_MONTHS_FULL[day.getMonth()]} {day.getDate()}.
                  </span>
                  {isTodayDay && (
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-warm-terracotta text-white rounded-full">
                      Ma
                    </span>
                  )}
                </div>
                <span className="text-xs text-stone-600 font-medium">
                  {dayEvents.length} edzés
                </span>
              </div>

              {dayEvents.length === 0 ? (
                <div className="p-6 text-center text-sm text-stone-600 font-medium">
                  Erre a napra nincs kiírt csoportos edzés.
                </div>
              ) : (
                <div className="divide-y divide-stone-200">
                  {dayEvents.map((event) => {
                    const {
                      spotsLeft = 0,
                      maxCapacity = 0,
                      isBooked = false,
                      instructorName = 'Nincs kijelölt oktató',
                      workoutTitle = '',
                    } = event.resource || {};
                    const isFull = spotsLeft <= SPOTS_FULL_THRESHOLD;
                    const isAlmostFull =
                      spotsLeft <= SPOTS_ALMOST_FULL_THRESHOLD &&
                      spotsLeft > SPOTS_FULL_THRESHOLD;
                    const displayTitle =
                      workoutTitle || event.title.split(' - ')[0];
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
                          {/* Time Pill (pinned to Europe/Budapest for SSR hydration parity) */}
                          <div className="bg-stone-200/90 text-stone-900 rounded-lg px-2.5 py-1.5 text-center shrink-0 min-w-[64px] border border-stone-300/80">
                            <div className="text-xs font-bold leading-tight">
                              {formatTime(event.start)}
                            </div>
                            <div className="text-[10px] text-stone-600 leading-tight mt-0.5">
                              {formatTime(event.end)}
                            </div>
                          </div>

                          {/* Title & Instructor */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <WorkoutIcon
                                title={displayTitle}
                                className="w-4 h-4 shrink-0 opacity-80"
                              />
                              <h3 className="font-bold text-sm text-stone-900 truncate">
                                {displayTitle}
                              </h3>
                              {isBooked && (
                                <span
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-800 shrink-0 border border-green-300"
                                  title="Lefoglalva"
                                  aria-label="Lefoglalva"
                                >
                                  <span aria-hidden="true">✓</span>
                                  <span className="sr-only">Lefoglalva</span>
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-stone-600 truncate mt-0.5">
                              Oktató: {instructorName}
                            </p>
                          </div>
                        </div>

                        {/* Right Side Spots Badge */}
                        <div className="shrink-0 flex items-center gap-1.5">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                              isFull
                                ? 'bg-red-100 text-red-800 border border-red-300'
                                : isAlmostFull
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-green-100 text-green-900 border border-green-300'
                            }`}
                          >
                            {isFull ? 'Megtelt' : `${spotsLeft}/${maxCapacity}`}
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
              {selectedWorkoutType !== 'all'
                ? 'Nincs edzés a kiválasztott kategóriában ezen a héten.'
                : 'Ezen a héten nincsenek kiírt csoportos edzések.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ChevronLeftIcon({ className = 'w-4 h-4' }: { className?: string }) {
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

function ChevronRightIcon({ className = 'w-4 h-4' }: { className?: string }) {
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
