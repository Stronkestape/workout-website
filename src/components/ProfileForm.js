"use client";

import { useState } from "react";
import { supabaseBrowser } from "../lib/browser";
import { isValidEmail, validateUsername, validateFullName } from "../utils/validators";
import { FormField } from "@/components/FormField";
import { FormMessage } from "@/components/FormMessage";
import { useFormState } from "../hooks/useFormState";
import { MESSAGES } from "../utils/constants";

export default function ProfileForm({ profile, onUpdate }) {
  const form = useFormState({
    username: profile.username,
    email: profile.email,
    fullName: profile.full_name || "",
  });

  const [fieldErrors, setFieldErrors] = useState({});

  const validateForm = async () => {
    const errors = {};

    const usernameValidation = validateUsername(form.data.username);
    if (!usernameValidation.isValid) {
      errors.username = usernameValidation.error;
    }

    if (!isValidEmail(form.data.email)) {
      errors.email = MESSAGES.INVALID_EMAIL;
    }

    const fullNameValidation = validateFullName(form.data.fullName);
    if (!fullNameValidation.isValid) {
      errors.fullName = fullNameValidation.error;
    }

    if (usernameValidation.isValid && form.data.username !== profile.username) {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    form.clearMessages();

    if (!(await validateForm())) return;

    form.setLoading(true);

    try {
      const cleanUsername = validateUsername(form.data.username).cleanUsername;

      const { error: profileError } = await supabaseBrowser
        .from("user_profiles")
        .update({
          username: cleanUsername,
          email: form.data.email.trim(),
          full_name: form.data.fullName.trim() || null,
        })
        .eq("id", profile.id);

      if (profileError) throw profileError;

      if (form.data.email !== profile.email) {
        const { error: authError } = await supabaseBrowser.auth.updateUser({
          email: form.data.email.trim(),
        });

        if (authError) {
          form.setSuccess(MESSAGES.PROFILE_UPDATED_EMAIL_VERIFY);
          onUpdate();
          return;
        }
      }

      form.setSuccess(MESSAGES.PROFILE_UPDATED);
      onUpdate();
    } catch (err) {
      form.setError(err.message || "Failed to update profile");
    } finally {
      form.setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField
        id="username"
        label="Username"
        value={form.data.username}
        onChange={(username) => form.setData({ ...form.data, username })}
        error={fieldErrors.username}
        disabled={form.loading}
        hint="3–20 characters: lowercase letters, numbers, underscores, and dots"
        required
      />

      <FormField
        id="email"
        label="Email"
        type="email"
        value={form.data.email}
        onChange={(email) => form.setData({ ...form.data, email })}
        error={fieldErrors.email}
        disabled={form.loading}
        hint="Changing your email requires verification"
        required
      />

      <FormField
        id="fullName"
        label="Full Name (Optional)"
        value={form.data.fullName}
        onChange={(fullName) => form.setData({ ...form.data, fullName })}
        error={fieldErrors.fullName}
        disabled={form.loading}
      />

      {form.error && <FormMessage type="error" message={form.error} />}
      {form.success && <FormMessage type="success" message={form.success} />}

      <button
        type="submit"
        disabled={form.loading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
      >
        {form.loading ? "Saving..." : "Save Changes"}
      </button>
    </form>
  );
}