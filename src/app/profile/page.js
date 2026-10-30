"use client";

import { useState, useEffect, useCallback } from "react";
import { supabaseBrowser } from "../../lib/browser";
import { useRouter } from "next/navigation";
import ProfileForm from "@/components/ProfileForm";
import PasswordChangeForm from "@/components/PasswordChangeForm";
import Link from "next/link";

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  const fetchUserProfile = useCallback(async () => {
    try {
      setLoading(true);

      const {
        data: { user: authUser },
        error: authError,
      } = await supabaseBrowser.auth.getUser();

      if (authError || !authUser) {
        router.push("/login");
        return;
      }

      setUser(authUser);

      const { data: profileData, error: profileError } = await supabaseBrowser
        .from("user_profiles")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
        setError("Nem sikerült betölteni a profilt.");
        return;
      }

      setProfile(profileData);
    } catch (err) {
      console.error("Unexpected error:", err);
      setError("Váratlan hiba történt a profil betöltésekor.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  const handleProfileUpdate = () => {
    fetchUserProfile();
  };

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-stone-600 font-medium text-base">Profil betöltése...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-800 text-sm font-medium">
          {error}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm font-medium">
          A profil nem található.
        </div>
      </div>
    );
  }

  const isAdmin = profile.user_tier === "admin";
  const isInstructor = profile.user_tier === "instructor";

  return (
    <div className="container mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8 pb-6 border-b border-stone-200/80">
        <div className="flex items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-warm-terracotta mb-1">
              <span className="w-2 h-2 rounded-full bg-warm-terracotta" aria-hidden="true" />
              <span>Fiókbeállítások</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
              Profile
            </h1>
            <p className="text-sm sm:text-base text-stone-600 mt-1">
              Kezeld a fiókod beállításait, személyes adataidat és jelszavadat.
            </p>
          </div>
          {isAdmin && (
            <div className="bg-purple-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl font-semibold shadow-xs text-xs sm:text-sm shrink-0">
              Adminisztrátor
            </div>
          )}
          {isInstructor && !isAdmin && (
            <div className="bg-indigo-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl font-semibold shadow-xs text-xs sm:text-sm shrink-0">
              Edző / Instructor
            </div>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Account Settings */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200/80 p-6">
            <h2 className="text-xl font-bold mb-4 text-stone-900">
              Személyes adatok
            </h2>
            <ProfileForm profile={profile} onUpdate={handleProfileUpdate} />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-stone-200/80 p-6">
            <h2 className="text-xl font-bold mb-4 text-stone-900">
              Jelszó módosítása
            </h2>
            <PasswordChangeForm />
          </div>

          {isAdmin && (
            <div className="bg-purple-50/70 rounded-2xl shadow-sm p-6 border border-purple-200">
              <h2 className="text-xl font-bold mb-2 text-purple-950">
                Adminisztrátori vezérlőpult
              </h2>
              <p className="text-purple-800 mb-4 text-sm">
                Adminisztrátorként jogosult vagy edzéstípusok és órák létrehozására, kezelésére, valamint résztvevők manuális feljelentkeztetésére.
              </p>
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-xl hover:bg-purple-700 transition-colors font-medium text-sm shadow-xs"
              >
                <span>Ugrás az Admin felületre</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          )}

          {isInstructor && !isAdmin && (
            <div className="bg-indigo-50/70 rounded-2xl shadow-sm p-6 border border-indigo-200">
              <h2 className="text-xl font-bold mb-2 text-indigo-950">
                Edzői profil
              </h2>
              <p className="text-indigo-800 text-sm">
                Edzőként vagy regisztrálva a rendszerben. Az adminisztrátorok csoportos edzéseket oszthatnak ki a nevedre, melyek a naptárban fognak megjelenni.
              </p>
              <div className="mt-4">
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors font-medium text-sm shadow-xs"
                >
                  <span>Edzői panel megnyitása</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - User Info Card */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200/80 p-6">
            <div className="text-center">
              <div
                className={`w-20 h-20 ${
                  isAdmin
                    ? "bg-purple-600"
                    : isInstructor
                    ? "bg-indigo-600"
                    : "bg-warm-terracotta"
                } rounded-full mx-auto mb-4 flex items-center justify-center text-white text-2xl font-bold shadow-xs`}
              >
                {profile.username?.charAt(0).toUpperCase() || "U"}
              </div>
              <h3 className="text-xl font-bold text-stone-900">
                @{profile.username}
              </h3>
              {profile.full_name && (
                <p className="text-stone-700 font-medium text-sm mt-0.5">
                  {profile.full_name}
                </p>
              )}
              <p className="text-stone-500 text-xs mt-1">{profile.email}</p>

              <div className="mt-5 pt-5 border-t border-stone-200">
                <div className="flex justify-between text-sm py-1">
                  <span className="text-stone-500">Tagság kezdete</span>
                  <span className="font-semibold text-stone-900">
                    {new Date(profile.created_at).toLocaleDateString("hu-HU", {
                      year: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
                <div className="flex justify-between text-sm py-1 mt-1">
                  <span className="text-stone-500">Fiók típusa</span>
                  <span
                    className={`font-semibold ${
                      isAdmin
                        ? "text-purple-600"
                        : isInstructor
                        ? "text-indigo-600"
                        : "text-stone-800"
                    }`}
                  >
                    {isAdmin
                      ? "Admin"
                      : isInstructor
                      ? "Edző"
                      : "Tag"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick link to My Bookings */}
          <div className="bg-warm-stone/20 rounded-2xl border border-warm-stone p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-warm-terracotta/10 text-warm-terracotta flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-stone-900 text-base">My Bookings</h3>
                <p className="text-xs text-stone-600">Önálló oldal a jelentkezéseidnek</p>
              </div>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed mb-4">
              A lefoglalt edzéseid és a várólistás feliratkozásaid mostantól a különálló My Bookings oldalon kezelhetők.
            </p>
            <Link
              href="/bookings"
              className="w-full inline-flex items-center justify-center gap-2 bg-warm-terracotta hover:bg-warm-terracotta/90 text-white font-medium text-sm py-2.5 px-4 rounded-xl transition-colors shadow-xs"
            >
              <span>Jelentkezéseim megtekintése</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
