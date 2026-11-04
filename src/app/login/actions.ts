'use server';

import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { MESSAGES, VALIDATION } from '@/utils/constants';

export interface LoginActionState {
  error?: string;
  values?: {
    emailOrUsername?: string;
  };
}

export async function loginAction(
  prevState: LoginActionState | null | undefined,
  formData: FormData
): Promise<LoginActionState> {
  const emailOrUsername = formData.get('emailOrUsername')?.toString().trim() || '';
  const password = formData.get('password')?.toString() || '';

  if (!emailOrUsername) {
    return {
      error: 'Kérjük, add meg az e-mail címedet vagy a felhasználónevedet.',
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
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
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

    const userId = authData?.user?.id;
    if (userId) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('username, user_tier')
        .eq('id', userId)
        .maybeSingle();

      const cookieStore = await cookies();
      const isProd = process.env.NODE_ENV === 'production';
      const cookieOptions = {
        path: '/',
        maxAge: 604800,
        sameSite: 'lax' as const,
        secure: isProd,
        httpOnly: false,
      };

      cookieStore.set('mk_role', profile?.user_tier || 'regular', cookieOptions);
      cookieStore.set(
        'mk_user',
        encodeURIComponent(profile?.username || ''),
        cookieOptions
      );
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
