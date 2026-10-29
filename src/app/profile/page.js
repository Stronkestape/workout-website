"use client";

import { useState, useEffect, useCallback } from "react";
import { supabaseBrowser } from "../../lib/browser";
import { useRouter } from "next/navigation";
import ProfileForm from "@/components/ProfileForm";
import PasswordChangeForm from "@/components/PasswordChangeForm";
import UserBookingsList from "@/components/UserBookingsList";
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
        setError("Failed to load profile");
        return;
      }

      setProfile(profileData);
    } catch (err) {
      console.error("Unexpected error:", err);
      setError("An unexpected error occurred");
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
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">Loading profile...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Profile not found</p>
        </div>
      </div>
    );
  }

  const isAdmin = profile.user_tier === "admin";
  const isInstructor = profile.user_tier === "instructor";

  return (
    <div className="container mx-auto max-w-6xl p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
            <p className="text-gray-600 mt-1">
              Manage your account settings and view your bookings
            </p>
          </div>
          {isAdmin && (
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-lg font-semibold shadow-sm text-sm">
              Admin
            </div>
          )}
          {isInstructor && !isAdmin && (
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-2 rounded-lg font-semibold shadow-sm text-sm">
              Instructor
            </div>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Account Settings */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">
              Account Information
            </h2>
            <ProfileForm profile={profile} onUpdate={handleProfileUpdate} />
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">
              Change Password
            </h2>
            <PasswordChangeForm />
          </div>

          {isAdmin && (
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg shadow-md p-6 border border-purple-200">
              <h2 className="text-xl font-semibold mb-2 text-gray-900">
                Admin Features
              </h2>
              <p className="text-gray-700 mb-4 text-sm">
                As an admin, you can create and manage workout classes,
                sessions, and manually book users.
              </p>
              <Link
                href="/admin"
                className="inline-block bg-purple-600 text-white px-6 py-2.5 rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm"
              >
                Go to Admin Dashboard →
              </Link>
            </div>
          )}

          {isInstructor && !isAdmin && (
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg shadow-md p-6 border border-blue-200">
              <h2 className="text-xl font-semibold mb-2 text-gray-900">
                Instructor Profile
              </h2>
              <p className="text-gray-700 text-sm">
                You are registered as an instructor. Admins can assign you to
                lead workout sessions.
              </p>
            </div>
          )}
        </div>

        {/* Right Column - User Info Card */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-center">
              <div
                className={`w-20 h-20 ${
                  isAdmin
                    ? "bg-gradient-to-br from-purple-500 to-indigo-500"
                    : isInstructor
                    ? "bg-gradient-to-br from-blue-500 to-cyan-500"
                    : "bg-gradient-to-br from-blue-500 to-purple-500"
                } rounded-full mx-auto mb-4 flex items-center justify-center text-white text-2xl font-bold`}
              >
                {profile.username?.charAt(0).toUpperCase() || "U"}
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                {profile.username}
              </h3>
              <p className="text-gray-600 text-sm mt-1">{profile.email}</p>
              {profile.full_name && (
                <p className="text-gray-500 text-sm mt-1">
                  {profile.full_name}
                </p>
              )}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Member since</span>
                  <span className="font-medium text-gray-900">
                    {new Date(profile.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-gray-600">Account type</span>
                  <span
                    className={`font-medium ${
                      isAdmin
                        ? "text-purple-600"
                        : isInstructor
                        ? "text-blue-600"
                        : "text-gray-900"
                    }`}
                  >
                    {isAdmin
                      ? "Admin"
                      : isInstructor
                      ? "Instructor"
                      : "Regular"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* My Bookings Section */}
      <div className="mt-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">
            My Bookings
          </h2>
          <UserBookingsList userId={user.id} />
        </div>
      </div>
    </div>
  );
}
