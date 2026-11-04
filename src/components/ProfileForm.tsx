'use client';

import React, { useActionState, useEffect } from 'react';
import { updateProfileAction } from '@/app/profile/actions';
import { FormField } from '@/components/FormField';
import { FormMessage } from '@/components/FormMessage';

export interface UserProfileData {
  id?: string;
  username: string;
  email: string;
  full_name?: string | null;
  [key: string]: unknown;
}

export interface ProfileActionState {
  values?: {
    username?: string;
    email?: string;
    fullName?: string;
  };
  fieldErrors?: {
    username?: string;
    email?: string;
    fullName?: string;
  };
  error?: string;
  success?: string;
  updatedAt?: number;
}

export interface ProfileFormProps {
  profile: UserProfileData;
  onUpdate?: () => void;
}

export default function ProfileForm({ profile, onUpdate }: ProfileFormProps) {
  const [state, formAction, isPending] = useActionState<ProfileActionState | null, FormData>(
    updateProfileAction,
    null
  );

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
        label="Felhasználónév"
        defaultValue={state?.values?.username ?? profile.username}
        error={state?.fieldErrors?.username}
        disabled={isPending}
        hint="3–20 karakter: kisbetűk, számok, aláhúzás és pont"
        required
        autoComplete="username"
      />

      <FormField
        id="email"
        name="email"
        label="E-mail cím"
        type="email"
        defaultValue={state?.values?.email ?? profile.email}
        error={state?.fieldErrors?.email}
        disabled={isPending}
        hint="Az e-mail cím megváltoztatása megerősítést igényel"
        required
        autoComplete="email"
      />

      <FormField
        id="fullName"
        name="fullName"
        label="Teljes Név (Opcionális)"
        defaultValue={state?.values?.fullName ?? (profile.full_name || '')}
        error={state?.fieldErrors?.fullName}
        disabled={isPending}
        autoComplete="name"
      />

      {state?.error && <FormMessage type="error" message={state.error} />}
      {state?.success && <FormMessage type="success" message={state.success} />}

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
      >
        {isPending ? 'Mentés...' : 'Módosítások Mentése'}
      </button>
    </form>
  );
}
