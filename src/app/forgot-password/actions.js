'use server';

import { createSupabaseServerClient } from '@/lib/server';
import { headers } from 'next/headers';
import { isValidEmail } from '@/utils/validators';
import { MESSAGES } from '@/utils/constants';

export async function forgotPasswordAction(prevState, formData) {
  const email = formData.get('email')?.toString().trim().toLowerCase() || '';

  if (!isValidEmail(email)) {
    return {
      error: MESSAGES.INVALID_EMAIL,
      values: { email },
    };
  }

  const supabase = await createSupabaseServerClient();

  try {
    const headerList = await headers();
    const host = headerList.get('x-forwarded-host') || headerList.get('host');
    const proto = headerList.get('x-forwarded-proto') || 'https';
    const origin =
      headerList.get('origin') ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : host
          ? `${proto}://${host}`
          : 'http://localhost:3000');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/reset-password`,
    });

    if (error) {
      return {
        error: error.message || MESSAGES.SOMETHING_WENT_WRONG,
        values: { email },
      };
    }

    return {
      success:
        'Password reset instructions have been sent to your email. Please check your inbox (and spam folder).',
    };
  } catch {
    return {
      error: MESSAGES.SOMETHING_WENT_WRONG,
      values: { email },
    };
  }
}
