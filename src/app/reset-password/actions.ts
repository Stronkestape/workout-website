'use server';

import { createSupabaseServerClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { validatePassword, validatePasswordMatch } from '@/utils/validators';
import { MESSAGES } from '@/utils/constants';

export interface ResetPasswordActionState {
  fieldErrors?: {
    newPassword?: string;
    confirmPassword?: string;
  };
  error?: string;
}

export async function resetPasswordAction(
  prevState: ResetPasswordActionState | null | undefined,
  formData: FormData
): Promise<ResetPasswordActionState> {
  const newPassword = formData.get('newPassword')?.toString() || '';
  const confirmPassword = formData.get('confirmPassword')?.toString() || '';

  const fieldErrors: { newPassword?: string; confirmPassword?: string } = {};

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
          'Nem sikerült a jelszó visszaállítása. Lehet, hogy a visszaállító link lejárt.',
      };
    }
  } catch {
    return { error: MESSAGES.SOMETHING_WENT_WRONG };
  }

  revalidatePath('/', 'layout');
  redirect('/calendar');
}
