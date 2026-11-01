import "./globals.css";
import { Geist, Geist_Mono } from "next/font/google";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { createSupabaseServerClient } from "@/lib/server";
import { ToastProvider } from "@/context/ToastContext";
import { SpeedInsights } from "@vercel/speed-insights/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"], 
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Workout Booking | Mozgás Központ",
  description: "Prémium csoportos funkcionális edzések, Spinning és WALKenergie órák Újbudán.",
};

export default async function RootLayout({ children }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="hu">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans bg-stone-100 text-stone-900 antialiased min-h-screen flex flex-col`}
      >
        <ToastProvider>
          <Navbar user={user} />
          <main className="flex-1">{children}</main>
          <Footer />
        </ToastProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
