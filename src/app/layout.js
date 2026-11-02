import "./globals.css";
import { Geist } from "next/font/google";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { ToastProvider } from "@/context/ToastContext";
import { SpeedInsights } from "@vercel/speed-insights/next";
import ReactDOM from "react-dom";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "optional",
  weight: ["400", "500", "700"],
});

export const metadata = {
  title: "Workout Booking | Mozgás Központ",
  description: "Prémium csoportos funkcionális edzések, Spinning és WALKenergie órák Újbudán.",
};

export default function RootLayout({ children }) {
  ReactDOM.preconnect("https://upsqxuyhmecrcrbbpyhu.supabase.co");
  ReactDOM.prefetchDNS("https://upsqxuyhmecrcrbbpyhu.supabase.co");

  return (
    <html lang="hu" className={geistSans.variable}>
      <body className={`${geistSans.className} font-sans bg-stone-100 text-stone-900 antialiased min-h-screen flex flex-col`}>
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
