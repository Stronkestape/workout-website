'use server';

import { createSupabaseServerClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { MESSAGES, VALIDATION } from '@/utils/constants';

export async function loginAction(prevState, formData) {
  const emailOrUsername = formData.get('emailOrUsername')?.toString().trim() || '';
  const password = formData.get('password')?.toString() || '';

  if (!emailOrUsername) {
    return {
      error: 'Please enter your email or username',
      values: { emailOrUsername },
    };
  }

  if (!password || password.length < VALIDATION.PASSWORD_MIN_LENGTH) {
    return {
      error: MESSAGES.PASSWORD_TOO_SHORT,
      values: { emailOrUsername },
    };
  }

  const supabase = await createSupabaseServerClient();

  try {
    // Lookup email by username/email via RPC
    const { data, error: lookupError } = await supabase.rpc(
      'get_user_by_username_or_email',
      { identifier: emailOrUsername }
    );

    if (lookupError || !data?.length) {
      return {
        error: MESSAGES.INVALID_LOGIN,
        values: { emailOrUsername },
      };
    }

    const email = data[0].email;

    // Authenticate user
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      return {
        error: authError.message?.includes('Invalid login credentials')
          ? MESSAGES.INVALID_LOGIN
          : authError.message || MESSAGES.SOMETHING_WENT_WRONG,
        values: { emailOrUsername },
      };
    }
  } catch {
    return {
      error: MESSAGES.SOMETHING_WENT_WRONG,
      values: { emailOrUsername },
    };
  }

  revalidatePath('/', 'layout');
  redirect('/calendar');
}
