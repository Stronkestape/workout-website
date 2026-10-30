'use server';

import { createSupabaseServerClient } from '@/lib/server';
import { headers } from 'next/headers';
import { isValidEmail, validateUsername, validatePassword } from '@/utils/validators';
import { MESSAGES } from '@/utils/constants';

export async function registerAction(prevState, formData) {
  const email = formData.get('email')?.toString().trim().toLowerCase() || '';
  const username = formData.get('username')?.toString().trim() || '';
  const password = formData.get('password')?.toString() || '';

  const fieldErrors = {};

  if (!isValidEmail(email)) {
    fieldErrors.email = MESSAGES.INVALID_EMAIL;
  }

  const usernameValidation = validateUsername(username);
  if (!usernameValidation.isValid) {
    fieldErrors.username = usernameValidation.error;
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    fieldErrors.password = passwordValidation.error;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, values: { email, username } };
  }

  const supabase = await createSupabaseServerClient();

  try {
    // 1. Check if username is available using boolean-only RPC (does not expose profile rows/emails)
    const { data: isAvailable, error: rpcError } = await supabase.rpc(
      'username_available',
      { candidate: usernameValidation.cleanUsername }
    );

    if (!rpcError && isAvailable === false) {
      return {
        fieldErrors: { username: MESSAGES.USERNAME_TAKEN },
        values: { email, username },
      };
    }

    // 2. Perform Supabase Auth signUp with dynamic origin redirect
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

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username: usernameValidation.cleanUsername },
        emailRedirectTo: `${origin}/auth/callback?next=/calendar`,
      },
    });

    if (signUpError) {
      if (signUpError.message?.toLowerCase().includes('already registered')) {
        return {
          fieldErrors: { email: MESSAGES.EMAIL_TAKEN },
          emailTaken: true,
          values: { email, username },
        };
      }
      const errorMessage = signUpError.message?.includes('Username is already taken')
        ? MESSAGES.USERNAME_TAKEN
        : signUpError.message || 'Failed to sign up';
      return { error: errorMessage, values: { email, username } };
    }

    // When email confirmation is enabled, Supabase returns an empty `identities` array
    // instead of an error if the email already exists in auth.users
    if (signUpData?.user && signUpData.user.identities?.length === 0) {
      return {
        fieldErrors: { email: MESSAGES.EMAIL_TAKEN },
        emailTaken: true,
        values: { email, username },
      };
    }

    return {
      success: 'Registration successful! Please check your email to confirm your account.',
    };
  } catch {
    return {
      error: MESSAGES.SOMETHING_WENT_WRONG,
      values: { email, username },
    };
  }
}
