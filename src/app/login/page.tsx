'use client';

import React, { useActionState, useRef } from 'react';
import Link from 'next/link';
import { loginAction } from './actions';
import { FormField } from '@/components/FormField';
import { FormMessage } from '@/components/FormMessage';

const DEMO_ADMIN_ENABLED = process.env.NEXT_PUBLIC_DEMO_ADMIN === 'true';

const DEMO_ACCOUNTS: Record<string, { identifier: string; password?: string }> = {
  member: {
    identifier:
      process.env.NEXT_PUBLIC_DEMO_MEMBER_IDENTIFIER || 'demo_member',
    password: process.env.NEXT_PUBLIC_DEMO_MEMBER_PASSWORD || 'demo123456',
  },
  instructor: {
    identifier:
      process.env.NEXT_PUBLIC_DEMO_INSTRUCTOR_IDENTIFIER || 'demo_instructor',
    password: process.env.NEXT_PUBLIC_DEMO_INSTRUCTOR_PASSWORD || 'demo123456',
  },
  ...(DEMO_ADMIN_ENABLED && process.env.NEXT_PUBLIC_DEMO_ADMIN_PASSWORD
    ? {
        admin: {
          identifier:
            process.env.NEXT_PUBLIC_DEMO_ADMIN_IDENTIFIER || 'demo_admin',
          password: process.env.NEXT_PUBLIC_DEMO_ADMIN_PASSWORD,
        },
      }
    : {}),
};

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleDemoLogin = (role: 'member' | 'instructor' | 'admin') => {
    const account = DEMO_ACCOUNTS[role];
    if (!formRef.current || !account || !account.password) return;

    const identifierInput = formRef.current.elements.namedItem('emailOrUsername') as HTMLInputElement | null;
    const passwordInput = formRef.current.elements.namedItem('password') as HTMLInputElement | null;

    if (identifierInput && passwordInput) {
      identifierInput.value = account.identifier;
      passwordInput.value = account.password;
      formRef.current.requestSubmit();
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4 text-center text-stone-900">
        Bejelentkezés | Mozgás Központ
      </h1>
      <div className="flex items-center justify-center min-h-[75vh] py-8">
        <div className="bg-white shadow rounded-lg p-8 w-full max-w-md space-y-6">
          <form ref={formRef} action={formAction} className="space-y-4">
            <FormField
              id="emailOrUsername"
              name="emailOrUsername"
              label="E-mail cím vagy Felhasználónév"
              defaultValue={state?.values?.emailOrUsername || ''}
              disabled={isPending}
              required
              autoComplete="username"
            />

            <div>
              <FormField
                id="password"
                name="password"
                label="Jelszó"
                type="password"
                disabled={isPending}
                required
                autoComplete="current-password"
              />
              <div className="flex justify-end mt-1">
                <Link
                  href="/forgot-password"
                  className="text-xs text-stone-700 hover:text-stone-900 hover:underline font-semibold"
                >
                  Elfelejtetted a jelszavad?
                </Link>
              </div>
            </div>

            <div className="min-h-[24px]">
              {state?.error && <FormMessage type="error" message={state.error} />}
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-warm-terracotta hover:bg-warm-terracotta-hover text-white py-2.5 px-4 rounded-xl disabled:bg-stone-400 transition-colors font-semibold shadow-xs"
            >
              {isPending ? 'Bejelentkezés folyamatban...' : 'Bejelentkezés'}
            </button>
          </form>

          {/* 1-Click Demo Access for Portfolio / Recruiters */}
          <div className="pt-4 border-t border-gray-200">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-700 text-center mb-3">
              Gyors Demó Belépés (1 kattintással)
            </p>
            <div
              className={`grid gap-2 ${
                DEMO_ACCOUNTS.admin ? 'grid-cols-3' : 'grid-cols-2'
              }`}
            >
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleDemoLogin('member')}
                className="px-2.5 py-2 text-xs font-semibold text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-md transition-colors disabled:opacity-50"
              >
                Demó Vendég
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleDemoLogin('instructor')}
                className="px-2.5 py-2 text-xs font-semibold text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md transition-colors disabled:opacity-50"
              >
                Demó Oktató
              </button>
              {DEMO_ACCOUNTS.admin && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleDemoLogin('admin')}
                  className="px-2.5 py-2 text-xs font-semibold text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-md transition-colors disabled:opacity-50"
                >
                  Demó Admin
                </button>
              )}
            </div>
          </div>

          <div className="text-center text-sm text-stone-700 pt-2 border-t border-gray-100">
            Még nincs fiókod?{' '}
            <Link
              href="/register"
              className="text-[#8c3010] hover:underline font-semibold"
            >
              Regisztrálj most
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
