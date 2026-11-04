"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";

function hasSupabaseAuthCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .some((cookie) => cookie.trim().startsWith("sb-"));
}

export interface NavbarProps {
  user?: User | null;
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp("(?:^|;\\s*)" + name + "=([^;]*)")
  );
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export default function Navbar({ user = null }: NavbarProps = {}) {
  const [isLoggedIn, setIsLoggedIn] = useState(!!user);
  const [username, setUsername] = useState<string | null>(null);
  const [userTier, setUserTier] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const currentUserIdRef = useRef<string | null>(null);
  const userTierRef = useRef<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    userTierRef.current = userTier;
  }, [userTier]);

  // 1. Synchronize session via lightweight /api/auth/me endpoint (zero @supabase/supabase-js bundle download)
  const syncSession = useCallback(async () => {
    const hasCookie = hasSupabaseAuthCookie();

    if (!hasCookie && !user && pathname !== "/reset-password") {
      if (currentUserIdRef.current !== null) {
        currentUserIdRef.current = null;
        setIsLoggedIn(false);
        setUsername(null);
        setUserTier(null);
        userTierRef.current = null;
      }
      try {
        sessionStorage.removeItem("mk_nav_profile");
        document.cookie = "mk_role=; Path=/; Max-Age=0; SameSite=Lax";
        document.cookie = "mk_user=; Path=/; Max-Age=0; SameSite=Lax";
      } catch {
        // Ignore storage errors
      }
      return;
    }

    // Instant 0ms UI hydration from sessionStorage cache when cookie is present
    if (hasCookie || user) {
      const cookieRole = getCookie("mk_role");
      const cookieUser = getCookie("mk_user");
      if (cookieRole || cookieUser) {
        setIsLoggedIn(true);
        if (cookieRole) {
          setUserTier(cookieRole);
          userTierRef.current = cookieRole;
        }
        if (cookieUser) {
          setUsername(cookieUser);
        }
      }
      try {
        const cached = sessionStorage.getItem("mk_nav_profile");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.id) {
            currentUserIdRef.current = parsed.id;
            setIsLoggedIn(true);
            if (parsed.username) setUsername(parsed.username);
            if (parsed.user_tier) {
              setUserTier(parsed.user_tier);
              userTierRef.current = parsed.user_tier;
            }
          }
        }
      } catch {
        // Ignore storage errors
      }
    }

    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data?.user) {
          currentUserIdRef.current = data.user.id;
          setIsLoggedIn(true);
          setUsername(data.user.username || null);
          setUserTier(data.user.user_tier || "regular");
          userTierRef.current = data.user.user_tier || "regular";
          try {
            sessionStorage.setItem(
              "mk_nav_profile",
              JSON.stringify({
                id: data.user.id,
                username: data.user.username || null,
                user_tier: data.user.user_tier || "regular",
              })
            );
          } catch {
            // Ignore storage errors
          }
          return;
        }
      }
    } catch {
      // Ignore fetch errors
    }

    // Fallback for /reset-password hash fragment recovery sessions
    if (pathname === "/reset-password") {
      try {
        const { getSupabaseBrowser } = await import("@/utils/supabaseQueries");
        const supabaseBrowser = await getSupabaseBrowser();
        const {
          data: { session },
        } = await supabaseBrowser.auth.getSession();
        if (session?.user) {
          currentUserIdRef.current = session.user.id;
          setIsLoggedIn(true);
          return;
        }
      } catch {
        // Ignore fallback errors
      }
    }

    currentUserIdRef.current = null;
    setIsLoggedIn(false);
    setUsername(null);
    setUserTier(null);
    userTierRef.current = null;
    try {
      sessionStorage.removeItem("mk_nav_profile");
    } catch {
      // Ignore storage errors
    }
  }, [user, pathname]);

  // 2. Route transition listener: Catches initial mount & Server Action redirects (e.g. /login -> /calendar)
  useEffect(() => {
    setMobileMenuOpen(false);
    syncSession();
  }, [pathname, syncSession]);

  // 3. Logout handler
  const handleLogout = async () => {
    if (typeof document !== "undefined") {
      const secureFlag = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `mk_role=; Path=/; Max-Age=0; SameSite=Lax${secureFlag}`;
      document.cookie = `mk_user=; Path=/; Max-Age=0; SameSite=Lax${secureFlag}`;
    }
    currentUserIdRef.current = null;
    setIsLoggedIn(false);
    setUsername(null);
    setUserTier(null);
    userTierRef.current = null;
    setMobileMenuOpen(false);
    try {
      await fetch("/api/auth/me", { method: "POST" });
    } catch {
      // Ignore network errors
    }
    try {
      sessionStorage.clear();
    } catch {
      // Ignore storage errors
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("app:auth-signed-out"));
    }
    router.push("/");
    router.refresh();
  };

  const navLinkClass = (href: string) =>
    `px-4 py-2 rounded-lg transition-colors font-medium text-sm ${
      pathname === href
        ? "bg-warm-terracotta text-white"
        : "bg-stone-800 text-stone-200 hover:bg-stone-700 hover:text-white"
    }`;

  const mobileNavLinkClass = (href: string) =>
    `flex items-center justify-between px-4 py-3 rounded-xl font-medium text-sm transition-colors ${
      pathname === href
        ? "bg-warm-terracotta/20 text-warm-terracotta border border-warm-terracotta/30"
        : "text-stone-200 hover:bg-stone-800 active:bg-stone-800"
    }`;

  return (
    <nav className="bg-stone-900 text-white shadow-md sticky top-0 z-50 border-b border-stone-800">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link
            href="/"
            aria-label="Mozgás Központ – Főoldal"
            className="inline-flex items-center gap-2 text-lg sm:text-xl font-bold tracking-tight text-white hover:text-warm-terracotta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-terracotta rounded-lg py-1 transition-colors truncate"
          >
            <span
              className="w-2.5 h-2.5 rounded-full bg-warm-terracotta shrink-0"
              aria-hidden="true"
            />
            <span>Mozgás Központ</span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-2 min-w-[360px] justify-end shrink-0">
            <Link
              href="/calendar"
              prefetch={false}
              className={navLinkClass("/calendar")}
            >
              Órarend
            </Link>

            <Link
              href="/instructors"
              prefetch={false}
              className={navLinkClass("/instructors")}
            >
              Oktatóink
            </Link>

            {isLoggedIn && (
              <Link
                href="/bookings"
                prefetch={false}
                className={navLinkClass("/bookings")}
              >
                Foglalásaim
              </Link>
            )}

            {isLoggedIn && userTier && ["admin", "instructor"].includes(userTier) && (
              <Link
                href="/admin"
                prefetch={false}
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
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                <span>{userTier === "admin" ? "Adminisztráció" : "Oktatói Pult"}</span>
              </Link>
            )}

            {isLoggedIn ? (
              <>
                <Link
                  href="/profile"
                  prefetch={false}
                  className={navLinkClass("/profile")}
                >
                  Profil
                </Link>
                <div className="h-4 w-px bg-stone-700 mx-2" />
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-stone-800 border border-stone-700 rounded-lg hover:bg-red-600 hover:border-red-600 transition-colors font-medium text-sm"
                >
                  Kijelentkezés
                </button>
              </>
            ) : (
              <>
                <div className="h-4 w-px bg-stone-700 mx-2" />
                <Link
                  href="/login"
                  prefetch={false}
                  className={navLinkClass("/login")}
                >
                  Bejelentkezés
                </Link>
                <Link
                  href="/register"
                  prefetch={false}
                  className="px-4 py-2 bg-warm-terracotta text-white rounded-lg hover:bg-warm-terracotta/90 transition-colors font-medium text-sm shadow-xs"
                >
                  Regisztráció
                </Link>
              </>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden p-2.5 rounded-xl text-stone-300 hover:text-white hover:bg-stone-800 active:bg-stone-700 transition-colors focus:outline-none"
            aria-label="Navigációs menü megnyitása"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
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
                aria-hidden="true"
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
                  <div className="w-9 h-9 rounded-full bg-warm-terracotta flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {(username || "U").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white truncate">
                      @{username || "Vendég"}
                    </div>
                    <div className="text-xs text-stone-400 capitalize">
                      {userTier === "admin"
                        ? "Adminisztrátori fiók"
                        : userTier === "instructor"
                        ? "Oktatói fiók"
                        : "Vendég fiók"}
                    </div>
                  </div>
                </div>
                {userTier && ["admin", "instructor"].includes(userTier) && (
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0 ${
                      userTier === "admin"
                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                        : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                    }`}
                  >
                    {userTier === "admin" ? "Admin" : "Oktató"}
                  </span>
                )}
              </div>
            )}

            <div className="space-y-1">
              <Link
                href="/calendar"
                prefetch={false}
                className={mobileNavLinkClass("/calendar")}
              >
                <span>Órarend</span>
                <ChevronRightIcon className="w-4 h-4 text-stone-500" />
              </Link>

              <Link
                href="/instructors"
                prefetch={false}
                className={mobileNavLinkClass("/instructors")}
              >
                <span>Oktatóink</span>
                <ChevronRightIcon className="w-4 h-4 text-stone-500" />
              </Link>

              {isLoggedIn && (
                <Link
                  href="/bookings"
                  prefetch={false}
                  className={mobileNavLinkClass("/bookings")}
                >
                  <span>Foglalásaim</span>
                  <ChevronRightIcon className="w-4 h-4 text-stone-500" />
                </Link>
              )}

              {isLoggedIn && (
                <Link
                  href="/profile"
                  prefetch={false}
                  className={mobileNavLinkClass("/profile")}
                >
                  <span>Profil</span>
                  <ChevronRightIcon className="w-4 h-4 text-stone-500" />
                </Link>
              )}

              {isLoggedIn && userTier && ["admin", "instructor"].includes(userTier) && (
                <Link
                  href="/admin"
                  prefetch={false}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl font-medium text-sm transition-colors ${
                    pathname.startsWith("/admin")
                      ? "bg-purple-600/25 text-purple-300 border border-purple-500/40"
                      : "text-purple-300 hover:bg-stone-800"
                  }`}
                >
                  <span>
                    {userTier === "admin"
                      ? "Adminisztrációs Pult"
                      : "Oktatói Pult"}
                  </span>
                  <ChevronRightIcon className="w-4 h-4 text-purple-400" />
                </Link>
              )}
            </div>

            <div className="pt-2 border-t border-stone-800">
              {isLoggedIn ? (
                <button
                  onClick={handleLogout}
                  className="w-full py-2.5 px-4 bg-red-600/15 text-red-400 border border-red-500/30 rounded-xl hover:bg-red-600 hover:text-white transition-colors font-medium text-sm text-center"
                >
                  Kijelentkezés
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  <Link
                    href="/login"
                    prefetch={false}
                    className="py-2.5 px-4 bg-stone-800 text-stone-200 border border-stone-700 rounded-xl hover:bg-stone-700 transition-colors font-medium text-sm text-center"
                  >
                    Bejelentkezés
                  </Link>
                  <Link
                    href="/register"
                    prefetch={false}
                    className="py-2.5 px-4 bg-warm-terracotta text-white rounded-xl hover:bg-warm-terracotta/90 transition-colors font-medium text-sm text-center shadow-xs"
                  >
                    Regisztráció
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

function ChevronRightIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5l7 7-7 7"
      />
    </svg>
  );
}
