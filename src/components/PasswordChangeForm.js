"use client";

import { useState } from "react";
import { supabaseBrowser } from "../lib/browser";
import { validatePassword, validatePasswordMatch } from "../utils/validators";
import { FormField } from "@/components/FormField";
import { FormMessage } from "@/components/FormMessage";
import { useFormState } from "../hooks/useFormState";
import { MESSAGES } from "../utils/constants";

export default function PasswordChangeForm() {
  const form = useFormState({
    newPassword: "",
    confirmPassword: "",
  });

  const [fieldErrors, setFieldErrors] = useState({});

  const validateForm = () => {
    const errors = {};

    const passwordValidation = validatePassword(form.data.newPassword);
    if (!passwordValidation.isValid) {
      errors.newPassword = passwordValidation.error;
    }

    const matchValidation = validatePasswordMatch(
      form.data.newPassword,
      form.data.confirmPassword
    );
    if (!matchValidation.isValid) {
      errors.confirmPassword = matchValidation.error;
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    form.clearMessages();

    if (!validateForm()) return;

    form.setLoading(true);

    try {
      const { error: updateError } = await supabaseBrowser.auth.updateUser({
        password: form.data.newPassword,
      });

      if (updateError) throw updateError;

      form.setSuccess(MESSAGES.PASSWORD_UPDATED);
      form.reset();
    } catch (err) {
      form.setError(err.message || "Failed to update password");
    } finally {
      form.setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField
        id="newPassword"
        label="New Password"
        type="password"
        value={form.data.newPassword}
        onChange={(newPassword) => form.setData({ ...form.data, newPassword })}
        error={fieldErrors.newPassword}
        disabled={form.loading}
        hint="Minimum 6 characters (consider using a stronger password)"
        required
        autoComplete="new-password"
      />

      <FormField
        id="confirmPassword"
        label="Confirm New Password"
        type="password"
        value={form.data.confirmPassword}
        onChange={(confirmPassword) => form.setData({ ...form.data, confirmPassword })}
        error={fieldErrors.confirmPassword}
        disabled={form.loading}
        required
        autoComplete="new-password"
      />

      {form.error && <FormMessage type="error" message={form.error} />}
      {form.success && <FormMessage type="success" message={form.success} />}

      <button
        type="submit"
        disabled={form.loading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
      >
        {form.loading ? "Updating..." : "Update Password"}
      </button>
    </form>
  );
}