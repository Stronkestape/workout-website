"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { supabaseBrowser } from "../lib/browser";
import { useRouter, usePathname } from "next/navigation";

export default function Navbar({ user }) {
  const [isLoggedIn, setIsLoggedIn] = useState(!!user);
  const [username, setUsername] = useState(null);
  const [userTier, setUserTier] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (user) {
      setIsLoggedIn(true);
      fetchUserProfile(user.id);
    } else {
      setIsLoggedIn(false);
      setUsername(null);
      setUserTier(null);
    }

    const { data: listener } = supabaseBrowser.auth.onAuthStateChange(
      async (_event, session) => {
        setIsLoggedIn(!!session);

        if (session?.user) {
          fetchUserProfile(session.user.id);
        } else {
          setUsername(null);
          setUserTier(null);
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [user]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const fetchUserProfile = async (userId) => {
    const { data } = await supabaseBrowser
      .from("user_profiles")
      .select("username, user_tier")
      .eq("id", userId)
      .single();

    if (data) {
      setUsername(data.username);
      setUserTier(data.user_tier);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabaseBrowser.auth.signOut();
    if (error) {
      console.error("Logout error:", error.message);
    } else {
      setIsLoggedIn(false);
      setUsername(null);
      setUserTier(null);
    }
    setMobileMenuOpen(false);
    router.push("/");
    router.refresh();
  };

  const navLinkClass = (href) =>
    `px-4 py-2 rounded-lg transition-colors font-medium text-sm ${
      pathname === href
        ? "bg-green-600 text-white"
        : "bg-stone-800 text-stone-200 hover:bg-stone-700 hover:text-white"
    }`;

  const mobileNavLinkClass = (href) =>
    `flex items-center justify-between px-4 py-3 rounded-xl font-medium text-sm transition-colors ${
      pathname === href
        ? "bg-green-600/20 text-green-400 border border-green-500/30"
        : "text-stone-200 hover:bg-stone-800 active:bg-stone-800"
    }`;

  return (
    <nav className="bg-stone-900 text-white shadow-md sticky top-0 z-50 border-b border-stone-800">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link
            href="/"
            className="text-lg sm:text-xl font-bold tracking-tight hover:text-green-400 transition-colors truncate"
          >
            Mozgás Központ
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-2">
            <Link href="/" className={navLinkClass("/")}>
              Home
            </Link>
            <Link href="/calendar" className={navLinkClass("/calendar")}>
              Calendar
            </Link>

            {isLoggedIn && ["admin", "instructor"].includes(userTier) && (
              <Link
                href="/admin"
                className={`px-4 py-2 rounded-lg transition-colors font-medium text-sm flex items-center gap-1.5 ${
                  pathname.startsWith("/admin")
                    ? userTier === "admin"
                      ? "bg-purple-600 text-white"
                      : "bg-indigo-600 text-white"
                    : userTier === "admin"
                    ? "bg-purple-700 text-white hover:bg-purple-600"
                    : "bg-indigo-700 text-white hover:bg-indigo-600"
                }`}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                <span>{userTier === "admin" ? "Admin" : "Coach Panel"}</span>
              </Link>
            )}

            {isLoggedIn ? (
              <>
                <Link href="/profile" className={navLinkClass("/profile")}>
                  {username || "Profile"}
                </Link>
                <div className="h-4 w-px bg-stone-700 mx-2" />
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-stone-800 border border-stone-700 rounded-lg hover:bg-red-600 hover:border-red-600 transition-colors font-medium text-sm"
                >
                  Log Out
                </button>
              </>
            ) : (
              <>
                <div className="h-4 w-px bg-stone-700 mx-2" />
                <Link href="/login" className={navLinkClass("/login")}>
                  Log In
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
                >
                  Register
                </Link>
              </>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden p-2.5 rounded-xl text-stone-300 hover:text-white hover:bg-stone-800 active:bg-stone-700 transition-colors focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-5 pt-3 border-t border-stone-800 space-y-3">
            {isLoggedIn && (
              <div className="flex items-center justify-between px-4 py-3 bg-stone-800/70 rounded-xl border border-stone-700/60">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {(username || "U").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white truncate">
                      {username || "Member"}
                    </div>
                    <div className="text-xs text-stone-400 capitalize">
                      {userTier || "regular"} account
                    </div>
                  </div>
                </div>
                {["admin", "instructor"].includes(userTier) && (
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0 ${
                      userTier === "admin"
                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                        : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                    }`}
                  >
                    {userTier === "admin" ? "Admin" : "Coach"}
                  </span>
                )}
              </div>
            )}

            <div className="space-y-1">
              <Link href="/" className={mobileNavLinkClass("/")}>
                <span>Home</span>
                <span className="text-stone-500 text-xs">→</span>
              </Link>
              <Link href="/calendar" className={mobileNavLinkClass("/calendar")}>
                <span>Workout Calendar</span>
                <span className="text-stone-500 text-xs">→</span>
              </Link>

              {isLoggedIn && ["admin", "instructor"].includes(userTier) && (
                <Link
                  href="/admin"
                  className={`flex items-center justify-between px-4 py-3 rounded-xl font-medium text-sm transition-colors ${
                    pathname.startsWith("/admin")
                      ? "bg-purple-600/25 text-purple-300 border border-purple-500/40"
                      : "text-purple-300 hover:bg-stone-800"
                  }`}
                >
                  <span>
                    {userTier === "admin"
                      ? "Admin Dashboard"
                      : "Coach Panel"}
                  </span>
                  <span className="text-xs">→</span>
                </Link>
              )}

              {isLoggedIn && (
                <Link href="/profile" className={mobileNavLinkClass("/profile")}>
                  <span>My Profile & Bookings</span>
                  <span className="text-stone-500 text-xs">→</span>
                </Link>
              )}
            </div>

            <div className="pt-2 border-t border-stone-800">
              {isLoggedIn ? (
                <button
                  onClick={handleLogout}
                  className="w-full py-2.5 px-4 bg-red-600/15 text-red-400 border border-red-500/30 rounded-xl hover:bg-red-600 hover:text-white transition-colors font-medium text-sm text-center"
                >
                  Log Out
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  <Link
                    href="/login"
                    className="py-2.5 px-4 bg-stone-800 text-stone-200 border border-stone-700 rounded-xl hover:bg-stone-700 transition-colors font-medium text-sm text-center"
                  >
                    Log In
                  </Link>
                  <Link
                    href="/register"
                    className="py-2.5 px-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium text-sm text-center"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
