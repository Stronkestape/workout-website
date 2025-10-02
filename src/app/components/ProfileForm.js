"use client";

import { useState } from "react";
import { supabaseBrowser } from "../../lib/browser";
import { isValidEmail, validateUsername, validateFullName } from "../../utils/validators";

export default function ProfileForm({ profile, onUpdate }) {
  const [username, setUsername] = useState(profile.username || "");
  const [email, setEmail] = useState(profile.email || "");
  const [fullName, setFullName] = useState(profile.full_name || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // Validate username
      const usernameValidation = validateUsername(username);
      if (!usernameValidation.isValid) {
        setError(usernameValidation.error);
        return;
      }

      const cleanUsername = usernameValidation.cleanUsername;

      // Check if username changed and if it's taken
      if (cleanUsername !== profile.username) {
        const { data: existingUser, error: checkError } = await supabaseBrowser
          .from("user_profiles")
          .select("username")
          .eq("username", cleanUsername)
          .maybeSingle();

        if (checkError) {
          console.error("Error checking username:", checkError);
          setError("Failed to verify username availability");
          return;
        }

        if (existingUser) {
          setError("Username is already taken");
          return;
        }
      }

      // Validate email
      if (!isValidEmail(email)) {
        setError("Please enter a valid email address");
        return;
      }

      // Validate full name
      const fullNameValidation = validateFullName(fullName);
      if (!fullNameValidation.isValid) {
        setError(fullNameValidation.error);
        return;
      }

      // Update user_profiles
      const { error: profileError } = await supabaseBrowser
        .from("user_profiles")
        .update({
          username: cleanUsername,
          email: email.trim(),
          full_name: fullName.trim() || null,
        })
        .eq("id", profile.id);

      if (profileError) {
        console.error("Profile update error:", profileError);
        setError(profileError.message || "Failed to update profile");
        return;
      }

      // Update auth email if changed
      if (email.trim() !== profile.email) {
        const { error: authError } = await supabaseBrowser.auth.updateUser({
          email: email.trim(),
        });

        if (authError) {
          console.error("Auth email update error:", authError);
          setError("Profile updated, but email change requires verification");
          // Still show success since profile was updated
          setSuccess(
            "Profile updated! Please check your new email to confirm the change."
          );
          onUpdate();
          return;
        }
      }

      setSuccess("Profile updated successfully!");
      onUpdate();
    } catch (err) {
      console.error("Unexpected error:", err);
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Username */}
      <div>
        <label
          htmlFor="username"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Username
        </label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="your_username"
          disabled={loading}
          required
          autoComplete="username"
        />
        <p className="text-xs text-gray-500 mt-1">
          3–20 characters: lowercase letters, numbers, underscores, and dots.
        </p>
      </div>

      {/* Email */}
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="your@email.com"
          disabled={loading}
          required
          autoComplete="email"
        />
        <p className="text-xs text-gray-500 mt-1">
          Changing your email requires verification.
        </p>
      </div>

      {/* Full Name */}
      <div>
        <label
          htmlFor="fullName"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Full Name (Optional)
        </label>
        <input
          id="fullName"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="John Doe"
          disabled={loading}
          autoComplete="name"
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-3">
          <p className="text-green-800 text-sm">{success}</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
      >
        {loading ? "Saving..." : "Save Changes"}
      </button>
    </form>
  );
}