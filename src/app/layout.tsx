import './globals.css';
import localFont from 'next/font/local';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { ToastProvider } from '@/context/ToastContext';
import { SpeedInsights } from '@vercel/speed-insights/next';
import type { Metadata } from 'next';
import React from 'react';

const geistSans = localFont({
  src: '../../node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2',
  variable: '--font-geist-sans',
  weight: '100 900',
  display: 'swap',
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
  adjustFontFallback: 'Arial',
});

export const metadata: Metadata = {
  title: {
    default: 'Mozgás Központ | Csoportos Fitnesz és Edzőterem Budapesten',
    template: '%s | Mozgás Központ',
  },
  description:
    'Prémium csoportos funkcionális edzések, Spinning, WALKenergie és alakformáló órák Budapesten.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="hu" className={geistSans.variable}>
      <body
        className={`${geistSans.className} font-sans bg-stone-100 text-stone-900 antialiased min-h-screen flex flex-col`}
      >
        <ToastProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </ToastProvider>
        <SpeedInsights sampleRate={1} />
      </body>
    </html>
  );
}
