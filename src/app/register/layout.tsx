import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Fiók Létrehozása | Mozgás Központ',
  description: 'Hozz létre új vendégfiókot a Mozgás Központban és foglalj helyet edzéseinkre.',
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
