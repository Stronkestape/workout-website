'use client';

import { useActionState, useEffect } from 'react';
import { updateProfileAction } from '@/app/profile/actions';
import { FormField } from '@/components/FormField';
import { FormMessage } from '@/components/FormMessage';

export default function ProfileForm({ profile, onUpdate }) {
  const [state, formAction, isPending] = useActionState(updateProfileAction, null);

  useEffect(() => {
    if (state?.updatedAt) {
      onUpdate?.();
    }
  }, [state?.updatedAt, onUpdate]);

  return (
    <form action={formAction} className="space-y-4">
      <FormField
        id="username"
        name="username"
        label="Username"
        defaultValue={state?.values?.username ?? profile.username}
        error={state?.fieldErrors?.username}
        disabled={isPending}
        hint="3–20 characters: lowercase letters, numbers, underscores, and dots"
        required
      />

      <FormField
        id="email"
        name="email"
        label="Email"
        type="email"
        defaultValue={state?.values?.email ?? profile.email}
        error={state?.fieldErrors?.email}
        disabled={isPending}
        hint="Changing your email requires verification"
        required
      />

      <FormField
        id="fullName"
        name="fullName"
        label="Full Name (Optional)"
        defaultValue={state?.values?.fullName ?? (profile.full_name || '')}
        error={state?.fieldErrors?.fullName}
        disabled={isPending}
      />

      {state?.error && <FormMessage type="error" message={state.error} />}
      {state?.success && <FormMessage type="success" message={state.success} />}

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
      >
        {isPending ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  );
}
