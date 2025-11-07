"use client";

import { useState } from "react";
import { supabaseBrowser } from "../../lib/browser";
import { isValidEmail, validateUsername, validatePassword } from "../../utils/validators";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // Validate email
      if (!isValidEmail(email)) {
        setError("Please enter a valid email address");
        return;
      }

      // Validate username
      const usernameValidation = validateUsername(username);
      if (!usernameValidation.isValid) {
        setError(usernameValidation.error);
        return;
      }

      const cleanUsername = usernameValidation.cleanUsername;

      // Check if username exists (optional pre-check for better UX)
      const { data: existingUser, error: userError } = await supabaseBrowser
        .from("user_profiles")
        .select("username")
        .eq("username", cleanUsername)
        .maybeSingle();

      if (userError) {
        console.error("Error checking username:", userError);
        setError("Something went wrong while checking username");
        return;
      }

      if (existingUser) {
        setError("Username already taken");
        return;
      }

      // Validate password
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        setError(passwordValidation.error);
        return;
      }

      // Supabase Auth Signup with username in metadata
      const { data: signUpData, error: signUpError } =
        await supabaseBrowser.auth.signUp({
          email,
          password,
          options: {
            data: { username: cleanUsername },
          },
        });

      if (signUpError) {
        console.error("Sign up failed:", signUpError);
        // Handle specific error messages from the database trigger
        if (signUpError.message.includes("Username is already taken")) {
          setError("Username is already taken");
        } else if (signUpError.message.includes("Invalid or missing username")) {
          setError("Invalid username format");
        } else {
          setError(signUpError.message || "Failed to sign up");
        }
        return;
      }

      setSuccess(
        "Registration successful! Please check your email to confirm your account."
      );
    } catch (err) {
      console.error("Unexpected error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4 text-center">Create Account</h2>
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="bg-white shadow rounded-lg p-8 w-full max-w-md">
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email-cím
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Ird be az email-cimed"
                disabled={loading}
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Teljes név
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Ird be a teljes neved"
                disabled={loading}
                required
                autoComplete="username"
              />
              <p className="text-xs text-gray-500">
                3-20 karakter: speciális karakterek nélkül.
              </p>
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Jelszó
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Ird be a jelszavad"
                disabled={loading}
                required
                autoComplete="new-password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-500 text-white py-2 px-4 rounded-md"
            >
              {loading ? "Please wait..." : "Create Account"}
            </button>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            {success && <p className="text-green-600 text-sm">{success}</p>}
          </form>
        </div>
      </div>
    </div>
  );
}