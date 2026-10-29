'use client';

import { useActionState } from 'react';
import { updatePasswordAction } from '@/app/profile/actions';
import { FormField } from '@/components/FormField';
import { FormMessage } from '@/components/FormMessage';

export default function PasswordChangeForm() {
  const [state, formAction, isPending] = useActionState(updatePasswordAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <FormField
        id="newPassword"
        name="newPassword"
        label="New Password"
        type="password"
        error={state?.fieldErrors?.newPassword}
        disabled={isPending}
        hint="Minimum 6 characters (consider using a stronger password)"
        required
        autoComplete="new-password"
      />

      <FormField
        id="confirmPassword"
        name="confirmPassword"
        label="Confirm New Password"
        type="password"
        error={state?.fieldErrors?.confirmPassword}
        disabled={isPending}
        required
        autoComplete="new-password"
      />

      {state?.error && <FormMessage type="error" message={state.error} />}
      {state?.success && <FormMessage type="success" message={state.success} />}

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
      >
        {isPending ? 'Updating...' : 'Update Password'}
      </button>
    </form>
  );
}
