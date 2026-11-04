import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Elfelejtett Jelszó | Mozgás Központ',
  description: 'Kérj jelszó-visszaállító linket a Mozgás Központ fiókodhoz.',
};

export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
