'use client';

import { useActionState, useRef } from 'react';
import Link from 'next/link';
import { loginAction } from './actions';
import { FormField } from '@/components/FormField';
import { FormMessage } from '@/components/FormMessage';

const DEMO_ACCOUNTS = {
  member: {
    identifier:
      process.env.NEXT_PUBLIC_DEMO_MEMBER_IDENTIFIER || 'demo_member',
    password: process.env.NEXT_PUBLIC_DEMO_MEMBER_PASSWORD || 'demo123456',
  },
  admin: {
    identifier: process.env.NEXT_PUBLIC_DEMO_ADMIN_IDENTIFIER || 'demo_admin',
    password: process.env.NEXT_PUBLIC_DEMO_ADMIN_PASSWORD || 'demo123456',
  },
};

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null);
  const formRef = useRef(null);

  const handleDemoLogin = (role) => {
    const account = DEMO_ACCOUNTS[role];
    if (!formRef.current || !account) return;

    const identifierInput = formRef.current.elements.namedItem('emailOrUsername');
    const passwordInput = formRef.current.elements.namedItem('password');

    if (identifierInput && passwordInput) {
      identifierInput.value = account.identifier;
      passwordInput.value = account.password;
      formRef.current.requestSubmit();
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4 text-center">
        Login to Workout Booking
      </h2>
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="bg-white shadow rounded-lg p-8 w-full max-w-md space-y-6">
          <form ref={formRef} action={formAction} className="space-y-4">
            <FormField
              id="emailOrUsername"
              name="emailOrUsername"
              label="Email or Username"
              defaultValue={state?.values?.emailOrUsername || ''}
              disabled={isPending}
              required
              autoComplete="username"
            />

            <div>
              <FormField
                id="password"
                name="password"
                label="Password"
                type="password"
                disabled={isPending}
                required
                autoComplete="current-password"
              />
              <div className="flex justify-end mt-1">
                <Link
                  href="/forgot-password"
                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium"
                >
                  Forgot your password?
                </Link>
              </div>
            </div>

            {state?.error && <FormMessage type="error" message={state.error} />}

            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-medium"
            >
              {isPending ? 'Logging in...' : 'Login'}
            </button>
          </form>

          {/* 1-Click Demo Access for Portfolio / Recruiters */}
          <div className="pt-4 border-t border-gray-200">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 text-center mb-3">
              Quick Demo Access (1-Click Login)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleDemoLogin('member')}
                className="px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
              >
                Demo Member
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleDemoLogin('admin')}
                className="px-3 py-2 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-md transition-colors disabled:opacity-50"
              >
                Demo Admin
              </button>
            </div>
          </div>

          <div className="text-center text-sm text-gray-600 pt-2 border-t border-gray-100">
            Don&apos;t have an account?{' '}
            <Link
              href="/register"
              className="text-blue-600 hover:underline font-medium"
            >
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
