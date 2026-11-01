"use client";

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
  return (
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
      components={components}
      eventPropGetter={eventPropGetter}
      step={step}
      timeslots={timeslots}
      min={min}
      max={max}
      scrollToTime={scrollToTime}
      showMultiDayTimes
      onSelectEvent={onSelectEvent}
    />
  );
}
