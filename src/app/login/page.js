"use client";

import { useState } from "react";
import { supabaseBrowser } from "../../lib/browser";
import { useRouter } from "next/navigation";
import { FormField } from "@/components/FormField";
import { FormMessage } from "@/components/FormMessage";
import { useFormState } from "../../hooks/useFormState";
import { MESSAGES, VALIDATION } from "../../utils/constants";

export default function LoginPage() {
  const form = useFormState({
    emailOrUsername: "",
    password: "",
  });

  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    form.clearMessages();

    const input = form.data.emailOrUsername.trim();
    if (!input) {
      form.setError("Please enter your email or username");
      return;
    }

    if (form.data.password.length < VALIDATION.PASSWORD_MIN_LENGTH) {
      form.setError(MESSAGES.PASSWORD_TOO_SHORT);
      return;
    }

    form.setLoading(true);

    try {
      const { data, error: lookupError } = await supabaseBrowser.rpc(
        "get_user_by_username_or_email",
        { identifier: input }
      );

      if (lookupError) throw lookupError;

      if (!data?.length) {
        form.setError(MESSAGES.USER_NOT_FOUND);
        return;
      }

      const email = data[0].email;

      const { error: authError } = await supabaseBrowser.auth.signInWithPassword({
        email,
        password: form.data.password,
      });

      if (authError) throw authError;

      form.setSuccess("Login successful! Redirecting...");
      setTimeout(() => router.push("/calendar"), 1000);
    } catch (error) {
      const errorMessage = error.message?.includes("Invalid login credentials")
        ? MESSAGES.INVALID_LOGIN
        : error.message || MESSAGES.SOMETHING_WENT_WRONG;
      form.setError(errorMessage);
    } finally {
      form.setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4 text-center">Login to Workout Booking</h2>
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="bg-white shadow rounded-lg p-8 w-full max-w-md">
          <form onSubmit={handleLogin} className="space-y-4">
            <FormField
              id="emailOrUsername"
              label="Email or Username"
              value={form.data.emailOrUsername}
              onChange={(emailOrUsername) =>
                form.setData({ ...form.data, emailOrUsername })
              }
              disabled={form.loading}
              required
              autoComplete="username"
            />

            <FormField
              id="password"
              label="Password"
              type="password"
              value={form.data.password}
              onChange={(password) => form.setData({ ...form.data, password })}
              disabled={form.loading}
              required
              autoComplete="current-password"
            />

            {form.error && <FormMessage type="error" message={form.error} />}
            {form.success && <FormMessage type="success" message={form.success} />}

            <button
              type="submit"
              disabled={form.loading}
              className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:bg-gray-400 transition-colors font-medium"
            >
              {form.loading ? "Logging in..." : "Login"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
