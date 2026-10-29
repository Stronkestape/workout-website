'use server';

import { createSupabaseServerClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { validatePassword, validatePasswordMatch } from '@/utils/validators';
import { MESSAGES } from '@/utils/constants';

export async function resetPasswordAction(prevState, formData) {
  const newPassword = formData.get('newPassword')?.toString() || '';
  const confirmPassword = formData.get('confirmPassword')?.toString() || '';

  const fieldErrors = {};

  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.isValid) {
    fieldErrors.newPassword = passwordValidation.error;
  }

  const matchValidation = validatePasswordMatch(newPassword, confirmPassword);
  if (!matchValidation.isValid) {
    fieldErrors.confirmPassword = matchValidation.error;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const supabase = await createSupabaseServerClient();

  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return {
        error:
          error.message ||
          'Failed to reset password. Your reset link may have expired.',
      };
    }
  } catch {
    return { error: MESSAGES.SOMETHING_WENT_WRONG };
  }

  revalidatePath('/', 'layout');
  redirect('/calendar');
}
