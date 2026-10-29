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
      <h2 className="text-2xl font-bold mb-4 text-center">Create Account</h2>
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="bg-white shadow rounded-lg p-8 w-full max-w-md">
          <form action={formAction} className="space-y-4">
            <FormField
              id="email"
              name="email"
              label="Email"
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
              label="Username"
              defaultValue={state?.values?.username || ''}
              error={state?.fieldErrors?.username}
              disabled={isPending}
              hint="3–20 characters: lowercase letters, numbers, underscores, and dots"
              required
              autoComplete="username"
            />

            <FormField
              id="password"
              name="password"
              label="Password"
              type="password"
              error={state?.fieldErrors?.password}
              disabled={isPending}
              required
              autoComplete="new-password"
            />

            {state?.emailTaken && (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-900">
                <p className="font-medium mb-1">
                  This email address is already associated with an account.
                </p>
                <div className="flex gap-3 mt-2">
                  <Link
                    href={`/forgot-password${
                      state.values?.email
                        ? `?email=${encodeURIComponent(state.values.email)}`
                        : ''
                    }`}
                    className="text-blue-600 hover:text-blue-800 font-semibold underline"
                  >
                    Send password reset email
                  </Link>
                  <span className="text-amber-400">•</span>
                  <Link
                    href="/login"
                    className="text-blue-600 hover:text-blue-800 font-semibold underline"
                  >
                    Go to Login
                  </Link>
                </div>
              </div>
            )}

            {state?.error && <FormMessage type="error" message={state.error} />}
            {state?.success && <FormMessage type="success" message={state.success} />}

            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-medium"
            >
              {isPending ? 'Creating account...' : 'Create Account'}
            </button>

            <div className="text-center text-sm text-gray-600 pt-2 border-t border-gray-100">
              Already have an account?{' '}
              <Link href="/login" className="text-blue-600 hover:underline font-medium">
                Log in
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
