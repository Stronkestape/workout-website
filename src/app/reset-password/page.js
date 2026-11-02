'use client';

import { useActionState, useEffect, useState } from 'react';
import Link from 'next/link';
import { resetPasswordAction } from './actions';
import { supabaseBrowser } from '@/lib/browser';
import { FormField } from '@/components/FormField';
import { FormMessage } from '@/components/FormMessage';

export default function ResetPasswordPage() {
  const [state, formAction, isPending] = useActionState(
    resetPasswordAction,
    null
  );
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);

  useEffect(() => {
    let mounted = true;

    const verifyRecoverySession = async () => {
      const {
        data: { session },
      } = await supabaseBrowser.auth.getSession();

      if (mounted) {
        if (session) {
          setHasValidSession(true);
        }
        setCheckingSession(false);
      }
    };

    const { data: listener } = supabaseBrowser.auth.onAuthStateChange(
      (event, session) => {
        if (
          event === 'PASSWORD_RECOVERY' ||
          event === 'SIGNED_IN' ||
          !!session
        ) {
          setHasValidSession(true);
          setCheckingSession(false);
        }
      }
    );

    verifyRecoverySession();

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="container mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4 text-center">Set New Password</h2>
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="bg-white shadow rounded-lg p-8 w-full max-w-md">
          {checkingSession ? (
            <div className="text-center py-6 text-gray-600 text-sm">
              Verifying password reset link...
            </div>
          ) : !hasValidSession ? (
            <div className="space-y-4 text-center">
              <FormMessage
                type="error"
                message="This password reset link is invalid or has expired."
              />
              <Link
                href="/forgot-password"
                className="inline-block w-full bg-blue-600 text-white py-2.5 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium text-sm"
              >
                Request a New Reset Link
              </Link>
            </div>
          ) : (
            <form action={formAction} className="space-y-4">
              <p className="text-sm text-gray-600">
                Please enter and confirm your new password below.
              </p>

              <FormField
                id="newPassword"
                name="newPassword"
                label="New Password"
                type="password"
                error={state?.fieldErrors?.newPassword}
                disabled={isPending}
                hint="Minimum 6 characters"
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

              {state?.error && (
                <FormMessage type="error" message={state.error} />
              )}

              <button
                type="submit"
                disabled={isPending}
                className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-medium"
              >
                {isPending ? 'Updating password...' : 'Save New Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
