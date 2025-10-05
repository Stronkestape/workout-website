"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { supabaseBrowser } from "../../lib/browser";
import { useRouter } from "next/navigation";

export default function Navbar({ user }) {
  const [isLoggedIn, setIsLoggedIn] = useState(!!user);
  const [username, setUsername] = useState(null);
  const [userTier, setUserTier] = useState(null);
  const router = useRouter();

  useEffect(() => {
    // Initial user from server prop
    if (user) {
      setIsLoggedIn(true);
      fetchUserProfile(user.id);
    }

    // Listen for changes
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
    router.push("/");
  };

  return (
    <nav className="bg-stone-800 text-white shadow-md relative z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <h1 className="text-xl font-bold">Mozgás Központ</h1>

          {/* Navigation Links */}
          <div className="flex items-center space-x-2">
            <Link
              href="/"
              className="px-4 py-2 bg-stone-700 rounded hover:bg-stone-500 transition-colors font-medium"
            >
              Home
            </Link>
            <Link
              href="/calendar"
              className="px-4 py-2 bg-stone-700 rounded hover:bg-stone-500 transition-colors font-medium"
            >
              Calendar
            </Link>

            {/* Admin Dashboard Link - Only show for admins */}
            {isLoggedIn && userTier === 'admin' && (
              <Link
                href="/admin"
                className="px-4 py-2 bg-purple-700 rounded hover:bg-purple-600 transition-colors font-medium flex items-center gap-1"
              >
                <span>⚡</span>
                <span>Admin</span>
              </Link>
            )}

            {/* Conditional Auth Section */}
            {isLoggedIn ? (
              <>
                <Link
                  href="/profile"
                  className="px-4 py-2 bg-stone-700 rounded hover:bg-stone-500 transition-colors font-medium"
                >
                  {username || "Profile"}
                </Link>
                <div className="h-4 w-px bg-stone-400 mx-2"></div>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-stone-700 rounded hover:bg-stone-500 transition-colors font-medium"
                >
                  Log Out
                </button>
              </>
            ) : (
              <>
                <div className="h-4 w-px bg-stone-400"></div>
                <Link
                  href="/login"
                  className="px-4 py-2 bg-stone-700 rounded hover:bg-stone-500 transition-colors font-medium"
                >
                  Log In
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 bg-stone-700 rounded hover:bg-stone-500 transition-colors font-medium"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}