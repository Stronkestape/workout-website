'use server';

import { createSupabaseServerClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import {
  isValidEmail,
  validateUsername,
  validateFullName,
  validatePassword,
  validatePasswordMatch,
} from '@/utils/validators';
import { MESSAGES } from '@/utils/constants';

export async function updateProfileAction(prevState, formData) {
  const username = formData.get('username')?.toString().trim() || '';
  const email = formData.get('email')?.toString().trim() || '';
  const fullName = formData.get('fullName')?.toString().trim() || '';

  const values = { username, email, fullName };
  const fieldErrors = {};

  const usernameValidation = validateUsername(username);
  if (!usernameValidation.isValid) {
    fieldErrors.username = usernameValidation.error;
  }

  if (!isValidEmail(email)) {
    fieldErrors.email = MESSAGES.INVALID_EMAIL;
  }

  const fullNameValidation = validateFullName(fullName);
  if (!fullNameValidation.isValid) {
    fieldErrors.fullName = fullNameValidation.error;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, values };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'Not authenticated', values };
  }

  const cleanUsername = usernameValidation.cleanUsername;

  // Fetch current profile to compare changes
  const { data: currentProfile } = await supabase
    .from('user_profiles')
    .select('username, email')
    .eq('id', user.id)
    .single();

  if (currentProfile && cleanUsername !== currentProfile.username) {
    const { data: existing } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('username', cleanUsername)
      .maybeSingle();

    if (existing) {
      return {
        fieldErrors: { username: MESSAGES.USERNAME_TAKEN },
        values,
      };
    }
  }

  try {
    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({
        username: cleanUsername,
        email,
        full_name: fullName || null,
      })
      .eq('id', user.id);

    if (profileError) {
      return { error: profileError.message || 'Failed to update profile', values };
    }

    if (currentProfile && email !== currentProfile.email) {
      const { error: authError } = await supabase.auth.updateUser({
        email,
      });

      revalidatePath('/profile');
      revalidatePath('/', 'layout');

      if (authError) {
        return {
          success: MESSAGES.PROFILE_UPDATED_EMAIL_VERIFY,
          updatedAt: Date.now(),
          values: { username: cleanUsername, email, fullName },
        };
      }
    }

    revalidatePath('/profile');
    revalidatePath('/', 'layout');

    return {
      success: MESSAGES.PROFILE_UPDATED,
      updatedAt: Date.now(),
      values: { username: cleanUsername, email, fullName },
    };
  } catch {
    return { error: MESSAGES.SOMETHING_WENT_WRONG, values };
  }
}

export async function updatePasswordAction(prevState, formData) {
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
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      return { error: updateError.message || 'Failed to update password' };
    }

    return { success: MESSAGES.PASSWORD_UPDATED };
  } catch {
    return { error: MESSAGES.SOMETHING_WENT_WRONG };
  }
}

