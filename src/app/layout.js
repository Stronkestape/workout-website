import "./globals.css";
import { Geist, Geist_Mono } from "next/font/google";
import Navbar from "./components/Navbar";
import { createSupabaseServerClient } from "@/lib/server";


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
    data: {user},
  } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans bg-gray-50`}
      >
        <Navbar user={user}/>
        <main>{children}</main>
      </body>
    </html>
  );
}
