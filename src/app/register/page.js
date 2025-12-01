"use client";

import { useState } from "react";
import { supabaseBrowser } from "../../lib/browser";
import { isValidEmail, validateUsername, validatePassword } from "../../utils/validators";
import { FormField } from "@/components/FormField";
import { FormMessage } from "@/components/FormMessage";
import { useFormState } from "../../hooks/useFormState";
import { MESSAGES } from "../../utils/constants";

export default function RegisterPage() {
  const form = useFormState({
    email: "",
    username: "",
    password: "",
  });

  const [fieldErrors, setFieldErrors] = useState({});

  const validateForm = async () => {
    const errors = {};

    if (!isValidEmail(form.data.email)) {
      errors.email = MESSAGES.INVALID_EMAIL;
    }

    const usernameValidation = validateUsername(form.data.username);
    if (!usernameValidation.isValid) {
      errors.username = usernameValidation.error;
    }

    const passwordValidation = validatePassword(form.data.password);
    if (!passwordValidation.isValid) {
      errors.password = passwordValidation.error;
    }

    if (usernameValidation.isValid) {
      const { data: existing } = await supabaseBrowser
        .from("user_profiles")
        .select("id")
        .eq("username", usernameValidation.cleanUsername)
        .maybeSingle();

      if (existing) {
        errors.username = MESSAGES.USERNAME_TAKEN;
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    form.clearMessages();

    if (!(await validateForm())) return;

    form.setLoading(true);

    try {
      const cleanUsername = validateUsername(form.data.username).cleanUsername;

      const { error: signUpError } = await supabaseBrowser.auth.signUp({
        email: form.data.email,
        password: form.data.password,
        options: {
          data: { username: cleanUsername },
        },
      });

      if (signUpError) throw signUpError;

      form.setSuccess("Registration successful! Please check your email to confirm your account.");
    } catch (err) {
      const errorMessage = err.message?.includes("Username is already taken")
        ? MESSAGES.USERNAME_TAKEN
        : err.message || "Failed to sign up";
      form.setError(errorMessage);
    } finally {
      form.setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4 text-center">Create Account</h2>
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="bg-white shadow rounded-lg p-8 w-full max-w-md">
          <form onSubmit={handleRegister} className="space-y-4">
            <FormField
              id="email"
              label="Email"
              type="email"
              value={form.data.email}
              onChange={(email) => form.setData({ ...form.data, email })}
              error={fieldErrors.email}
              disabled={form.loading}
              required
              autoComplete="email"
            />

            <FormField
              id="username"
              label="Username"
              value={form.data.username}
              onChange={(username) => form.setData({ ...form.data, username })}
              error={fieldErrors.username}
              disabled={form.loading}
              hint="3–20 characters: lowercase letters, numbers, underscores, and dots"
              required
              autoComplete="username"
            />

            <FormField
              id="password"
              label="Password"
              type="password"
              value={form.data.password}
              onChange={(password) => form.setData({ ...form.data, password })}
              error={fieldErrors.password}
              disabled={form.loading}
              required
              autoComplete="new-password"
            />

            {form.error && <FormMessage type="error" message={form.error} />}
            {form.success && <FormMessage type="success" message={form.success} />}

            <button
              type="submit"
              disabled={form.loading}
              className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:bg-gray-400 transition-colors font-medium"
            >
              {form.loading ? "Creating account..." : "Create Account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}