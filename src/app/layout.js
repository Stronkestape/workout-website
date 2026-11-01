import "./globals.css";
import { Geist } from "next/font/google";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { getSafeUser } from "@/lib/server";
import { ToastProvider } from "@/context/ToastContext";
import { SpeedInsights } from "@vercel/speed-insights/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "700"],
});

export const metadata = {
  title: "Workout Booking | Mozgás Központ",
  description: "Prémium csoportos funkcionális edzések, Spinning és WALKenergie órák Újbudán.",
};

export default async function RootLayout({ children }) {
  // Uses getSafeUser: bypasses external WAN Supabase call for anonymous visitors (0ms overhead)
  const { user } = await getSafeUser();

  return (
    <html lang="hu" className={geistSans.variable}>
      <body className="font-sans bg-stone-100 text-stone-900 antialiased min-h-screen flex flex-col">
        <ToastProvider>
          <Navbar user={user} />
          <main className="flex-1">{children}</main>
          <Footer />
        </ToastProvider>
        <SpeedInsights sampleRate={1} />
      </body>
    </html>
  );
}
