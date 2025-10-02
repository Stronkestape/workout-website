"use client";

import { useState } from "react";
import { supabaseBrowser } from "../../lib/browser";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const input = emailOrUsername.trim();

      if (!input) {
        setError("Please enter your email or username");
        return;
      }

      // Use RPC function to resolve username or email
      const { data, error: lookupError } = await supabaseBrowser.rpc(
        "get_user_by_username_or_email",
        { identifier: input }
      );

      if (lookupError) {
        console.error("Error looking up user:", lookupError);
        setError("Something went wrong. Please try again.");
        return;
      }

      if (!data || data.length === 0) {
        setError("Email or username not found");
        return;
      }

      const email = data[0].email;

      // Validate password
      if (password.length < 6) {
        setError("Password must be at least 6 characters");
        return;
      }

      // Sign in with email and password
      const { error: authError } =
        await supabaseBrowser.auth.signInWithPassword({
          email,
          password,
        });

      if (authError) {
        if (authError.message.includes("Invalid login credentials")) {
          setError("Invalid email/username or password");
        } else {
          setError(authError.message);
        }
        return;
      }

      setSuccess("Login successful! Redirecting...");
      setTimeout(() => router.push("/calendar"), 1000);
    } catch (error) {
      console.error("Unexpected error:", error);
      setError(error.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4 text-center">
        Login to Workout Booking
      </h2>
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="bg-white shadow rounded-lg p-8 w-full max-w-md">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="emailOrUsername" className="block text-sm font-medium text-gray-700">
                Email or Username
              </label>
              <input
                id="emailOrUsername"
                type="text"
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Enter email or username"
                disabled={loading}
                required
                autoComplete="username"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Enter your password"
                disabled={loading}
                required
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-500 text-white py-2 px-4 rounded-md"
            >
              {loading ? "Please wait..." : "Login"}
            </button>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            {success && <p className="text-green-600 text-sm">{success}</p>}
          </form>
        </div>
      </div>
    </div>
  );
}
