'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { registerAction } from './actions';
import { FormField } from '@/components/FormField';
import { FormMessage } from '@/components/FormMessage';

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(registerAction, null);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4 text-center text-stone-900">
        Fiók Létrehozása | Mozgás Központ
      </h1>
      <div className="flex items-center justify-center min-h-[75vh] py-8">
        <div className="bg-white shadow rounded-lg p-8 w-full max-w-md">
          <form action={formAction} className="space-y-4">
            <FormField
              id="email"
              name="email"
              label="E-mail cím"
              type="email"
              defaultValue={state?.values?.email || ''}
              error={state?.fieldErrors?.email}
              disabled={isPending}
              required
              autoComplete="email"
            />

            <FormField
              id="username"
              name="username"
              label="Felhasználónév"
              defaultValue={state?.values?.username || ''}
              error={state?.fieldErrors?.username}
              disabled={isPending}
              hint="3–20 karakter: kisbetűk, számok, aláhúzás és pont"
              required
              autoComplete="username"
            />

            <FormField
              id="password"
              name="password"
              label="Jelszó"
              type="password"
              error={state?.fieldErrors?.password}
              disabled={isPending}
              required
              autoComplete="new-password"
            />

            {state?.emailTaken && (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-900">
                <p className="font-medium mb-1">
                  Ez az e-mail cím már társítva van egy regisztrált fiókhoz.
                </p>
                <div className="flex gap-3 mt-2">
                  <Link
                    href={`/forgot-password${
                      state.values?.email
                        ? `?email=${encodeURIComponent(state.values.email)}`
                        : ''
                    }`}
                    className="text-stone-800 hover:text-stone-900 font-semibold underline"
                  >
                    Jelszó-visszaállító link küldése
                  </Link>
                  <span className="text-amber-400">•</span>
                  <Link
                    href="/login"
                    className="text-stone-800 hover:text-stone-900 font-semibold underline"
                  >
                    Vissza a bejelentkezéshez
                  </Link>
                </div>
              </div>
            )}

            <div className="min-h-[24px]">
              {state?.error && <FormMessage type="error" message={state.error} />}
              {state?.success && <FormMessage type="success" message={state.success} />}
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-warm-terracotta hover:bg-warm-terracotta-hover text-white py-2.5 px-4 rounded-xl disabled:bg-stone-400 transition-colors font-semibold shadow-xs"
            >
              {isPending ? 'Fiók létrehozása folyamatban...' : 'Regisztráció'}
            </button>

            <div className="text-center text-sm text-stone-700 pt-2 border-t border-gray-100">
              Már van fiókod?{' '}
              <Link href="/login" className="text-warm-terracotta hover:underline font-semibold">
                Jelentkezz be
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
