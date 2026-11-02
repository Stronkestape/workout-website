"use client";

import { useEffect, useRef } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS, hu } from "date-fns/locale";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: {
    "en-US": enUS,
    hu: hu,
  },
});

function CalendarHeader({ label }) {
  return <span>{label}</span>;
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
}) {
  const containerRef = useRef(null);

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

  const mergedComponents = {
    header: CalendarHeader,
    ...components,
  };

  return (
    <div ref={containerRef} className="h-full w-full">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: "100%" }}
        culture="en-US"
        view={view}
        onView={onView}
        date={date}
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
        onSelectEvent={onSelectEvent}
      />
    </div>
  );
}
