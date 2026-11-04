import React from 'react';
import type { Metadata } from 'next';
import { fetchPublicScheduleServer } from '@/lib/scheduleServer';
import CalendarClient from './CalendarClient';

export const revalidate = 60; // 60-second Edge ISR cache for instant schedule delivery

export const metadata: Metadata = {
  title: 'Heti Órarend & Helyfoglalás | Mozgás Központ',
  description:
    'Böngészd át heti csoportos óráinkat, szűrj edzéstípus szerint, és foglald le a helyed online a Mozgás Központban.',
};

export default async function CalendarPage() {
  const { data: initialSessions, error } = await fetchPublicScheduleServer();

  if (error) {
    console.error('Failed to prefetch schedule on server:', error);
  }

  return (
    <CalendarClient
      initialSessions={error ? null : initialSessions}
      serverNow={new Date().toISOString()}
    />
  );
}
