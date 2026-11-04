import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Új Jelszó Megadása | Mozgás Központ',
  description: 'Állíts be új jelszót a Mozgás Központ fiókodhoz.',
};

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
