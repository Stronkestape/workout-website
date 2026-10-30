import "./globals.css";
import { Geist, Geist_Mono } from "next/font/google";
import Navbar from "../components/Navbar";
import { createSupabaseServerClient } from "@/lib/server";
import { ToastProvider } from "@/context/ToastContext";

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
  title: "Workout Booking",
  description: "Book your workout sessions easily",
};

export default async function RootLayout({ children }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans bg-stone-100 text-stone-900 antialiased min-h-screen`}
      >
        <ToastProvider>
          <Navbar user={user} />
          <main>{children}</main>
        </ToastProvider>
      </body>
    </html>
  );
}
