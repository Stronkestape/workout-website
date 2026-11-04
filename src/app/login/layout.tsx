import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Bejelentkezés | Mozgás Központ',
  description: 'Jelentkezz be fiókodba a Mozgás Központ edzéseinek foglalásához.',
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
