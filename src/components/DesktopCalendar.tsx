"use client";

import React, { useEffect, useRef, useMemo, useCallback } from "react";
import { Calendar, dateFnsLocalizer, type View, type NavigateAction, type Components } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import { toGymLocalTime } from "@/utils/calendarHelpers";
import type { CalendarEvent } from "@/app/calendar/hooks/useScheduleData";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: { "en-US": enUS },
});

function CalendarHeader({ label }: { label: string }) {
  return <span>{label}</span>;
}

export interface CalendarEventWithGymTime extends CalendarEvent {
  originalEvent?: CalendarEvent;
}

export interface DesktopCalendarProps {
  events: CalendarEvent[];
  view: View;
  onView: (view: View) => void;
  date: Date;
  onNavigate: (newDate: Date, view: View, action: NavigateAction) => void;
  components?: Components<CalendarEventWithGymTime>;
  eventPropGetter?: (
    event: CalendarEventWithGymTime,
    start: Date,
    end: Date,
    isSelected: boolean
  ) => { className?: string; style?: React.CSSProperties };
  step?: number;
  timeslots?: number;
  min?: Date;
  max?: Date;
  scrollToTime?: Date;
  onSelectEvent?: (event: CalendarEvent) => void;
}

export default function DesktopCalendar({
  events,
  view,
  onView,
  date,
  onNavigate,
  components,
  eventPropGetter,
  step,
  timeslots,
  min,
  max,
  scrollToTime,
  onSelectEvent,
}: DesktopCalendarProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Sanitize react-big-calendar internal ARIA roles that violate W3C ARIA rules
  // (axe-core / Lighthouse agentic-browsing tree checks)
  useEffect(() => {
    const sanitizeAria = () => {
      if (!containerRef.current) return;
      const invalidElements = containerRef.current.querySelectorAll(
        '.rbc-time-view [role="rowgroup"], .rbc-time-view [role="row"], .rbc-time-view [role="columnheader"]'
      );
      invalidElements.forEach((el) => {
        el.removeAttribute("role");
        el.removeAttribute("aria-sort");
      });
    };

    sanitizeAria();
    const observer = new MutationObserver(sanitizeAria);
    if (containerRef.current) {
      observer.observe(containerRef.current, { childList: true, subtree: true });
    }
    return () => observer.disconnect();
  }, []);

  const gymEvents = useMemo<CalendarEventWithGymTime[]>(
    () =>
      (events || []).map((ev) => ({
        ...ev,
        start: toGymLocalTime(ev.start),
        end: toGymLocalTime(ev.end),
        originalEvent: ev,
      })),
    [events]
  );

  const gymDate = useMemo(() => toGymLocalTime(date), [date]);
  const getGymNow = useCallback(() => gymDate, [gymDate]);

  const handleSelectGymEvent = useCallback(
    (ev: CalendarEventWithGymTime) => {
      onSelectEvent?.(ev.originalEvent || ev);
    },
    [onSelectEvent]
  );

  const mergedComponents = useMemo(
    () => ({
      header: CalendarHeader,
      ...components,
    }),
    [components]
  );

  return (
    <div ref={containerRef} className="h-full w-full">
      <Calendar<CalendarEventWithGymTime>
        localizer={localizer}
        events={gymEvents}
        startAccessor="start"
        endAccessor="end"
        style={{ height: "100%" }}
        culture="en-US"
        view={view}
        onView={onView}
        date={gymDate}
        getNow={getGymNow}
        onNavigate={onNavigate}
        views={["month", "week"]}
        components={mergedComponents}
        eventPropGetter={eventPropGetter}
        step={step}
        timeslots={timeslots}
        min={min}
        max={max}
        scrollToTime={scrollToTime}
        showMultiDayTimes
        onSelectEvent={handleSelectGymEvent}
      />
    </div>
  );
}
