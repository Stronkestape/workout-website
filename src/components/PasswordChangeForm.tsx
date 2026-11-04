'use client';

import React, { useActionState } from 'react';
import { updatePasswordAction } from '@/app/profile/actions';
import { FormField } from '@/components/FormField';
import { FormMessage } from '@/components/FormMessage';

export interface PasswordActionState {
  fieldErrors?: {
    newPassword?: string;
    confirmPassword?: string;
  };
  error?: string;
  success?: string;
}

export default function PasswordChangeForm(): React.JSX.Element {
  const [state, formAction, isPending] = useActionState<PasswordActionState | null, FormData>(
    updatePasswordAction,
    null
  );

  return (
    <form action={formAction} className="space-y-4">
      <FormField
        id="newPassword"
        name="newPassword"
        label="Új Jelszó"
        type="password"
        error={state?.fieldErrors?.newPassword}
        disabled={isPending}
        hint="Legalább 6 karakter"
        required
        autoComplete="new-password"
      />

      <FormField
        id="confirmPassword"
        name="confirmPassword"
        label="Új Jelszó Megerősítése"
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
        {isPending ? 'Módosítás folyamatban...' : 'Jelszó Módosítása'}
      </button>
    </form>
  );
}
