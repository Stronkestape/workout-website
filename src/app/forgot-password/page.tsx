'use client';

import React, { Suspense, useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { forgotPasswordAction } from './actions';
import { FormField } from '@/components/FormField';
import { FormMessage } from '@/components/FormMessage';

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get('email') || '';
  const [state, formAction, isPending] = useActionState(
    forgotPasswordAction,
    null
  );

  return (
    <form action={formAction} className="space-y-4">
      <p className="text-sm text-stone-600">
        Add meg a fiókodhoz tartozó e-mail címet, és küldünk egy biztonságos linket az új jelszavad beállításához.
      </p>

      <FormField
        id="email"
        name="email"
        label="E-mail cím"
        type="email"
        defaultValue={state?.values?.email ?? initialEmail}
        disabled={isPending}
        required
        autoComplete="email"
      />

      {state?.error && <FormMessage type="error" message={state.error} />}
      {state?.success && <FormMessage type="success" message={state.success} />}

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-warm-terracotta hover:bg-warm-terracotta-hover text-white py-2.5 px-4 rounded-xl disabled:bg-stone-400 transition-colors font-semibold shadow-sm"
      >
        {isPending ? 'Link küldése...' : 'Visszaállító Link Küldése'}
      </button>

      <div className="text-center text-sm text-stone-600 pt-2 border-t border-stone-200">
        Eszembe jutott a jelszavam:{' '}
        <Link href="/login" className="text-warm-terracotta hover:underline font-semibold">
          Vissza a bejelentkezéshez
        </Link>
      </div>
    </form>
  );
}

export default function ForgotPasswordPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4 text-center text-stone-900">Jelszó Visszaállítása | Mozgás Központ</h1>
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="bg-white shadow rounded-2xl p-8 w-full max-w-md border border-stone-200">
          <Suspense fallback={<div className="text-sm text-stone-500 text-center py-4">Betöltés...</div>}>
            <ForgotPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
