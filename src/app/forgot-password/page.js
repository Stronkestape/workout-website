'use client';

import { Suspense, useActionState } from 'react';
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
      <p className="text-sm text-gray-600">
        Enter the email address associated with your account, and we&apos;ll send
        you a link to reset your password.
      </p>

      <FormField
        id="email"
        name="email"
        label="Email Address"
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
        className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-medium"
      >
        {isPending ? 'Sending reset link...' : 'Send Reset Link'}
      </button>

      <div className="text-center text-sm text-gray-600 pt-2 border-t border-gray-100">
        Remembered your password?{' '}
        <Link href="/login" className="text-blue-600 hover:underline font-medium">
          Back to Login
        </Link>
      </div>
    </form>
  );
}

export default function ForgotPasswordPage() {
  return (
    <div className="container mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4 text-center">Reset Your Password</h2>
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="bg-white shadow rounded-lg p-8 w-full max-w-md">
          <Suspense fallback={<div className="text-sm text-gray-500">Loading...</div>}>
            <ForgotPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
