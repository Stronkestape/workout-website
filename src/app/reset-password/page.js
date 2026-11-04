'use client';

import { useActionState, useEffect, useState } from 'react';
import Link from 'next/link';
import { resetPasswordAction } from './actions';
import { getSupabaseBrowser } from '@/utils/supabaseQueries';
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
    let subscription = null;

    const initRecoverySession = async () => {
      const supabaseBrowser = await getSupabaseBrowser();
      if (!mounted) return;

      const { data: listener } = supabaseBrowser.auth.onAuthStateChange(
        (event, session) => {
          if (!mounted) return;
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
      subscription = listener?.subscription || null;

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

    initRecoverySession();

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  return (
    <div className="container mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4 text-center text-stone-900">Új Jelszó Megadása</h2>
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="bg-white shadow rounded-2xl p-8 w-full max-w-md border border-stone-200">
          {checkingSession ? (
            <div className="text-center py-6 text-stone-600 text-sm">
              Visszaállító link ellenőrzése...
            </div>
          ) : !hasValidSession ? (
            <div className="space-y-4 text-center">
              <FormMessage
                type="error"
                message="Ez a jelszó-visszaállító link érvénytelen vagy lejárt."
              />
              <Link
                href="/forgot-password"
                className="inline-block w-full bg-warm-terracotta hover:bg-warm-terracotta-hover text-white py-2.5 px-4 rounded-xl transition-colors font-semibold text-sm shadow-sm"
              >
                Új Visszaállító Link Kérése
              </Link>
            </div>
          ) : (
            <form action={formAction} className="space-y-4">
              <p className="text-sm text-stone-600">
                Kérjük, add meg az új jelszavadat az alábbi mezőkben.
              </p>

              <FormField
                id="newPassword"
                name="newPassword"
                label="Új jelszó"
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
                label="Új jelszó megerősítése"
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
                className="w-full bg-warm-terracotta hover:bg-warm-terracotta-hover text-white py-2.5 px-4 rounded-xl disabled:bg-stone-400 transition-colors font-semibold shadow-sm"
              >
                {isPending ? 'Jelszó mentése...' : 'Új Jelszó Mentése'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
