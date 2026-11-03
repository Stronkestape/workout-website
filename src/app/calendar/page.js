import { fetchPublicScheduleServer } from "@/lib/scheduleServer";
import CalendarClient from "./CalendarClient";

export const revalidate = 60; // 60-second Edge ISR cache for instant schedule delivery

export const metadata = {
  title: "Workout Calendar | Mozgás Központ",
  description:
    "Browse weekly group classes, filter by workout format, and book your spot online at Mozgás Központ.",
};

export default async function CalendarPage() {
  const { data: initialSessions, error } = await fetchPublicScheduleServer();

  if (error) {
    console.error("Failed to prefetch schedule on server:", error);
  }

  return (
    <CalendarClient
      initialSessions={error ? null : initialSessions}
      serverNow={new Date().toISOString()}
    />
  );
}
