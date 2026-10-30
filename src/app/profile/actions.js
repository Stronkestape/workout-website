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
    const { data: isAvailable, error: rpcError } = await supabase.rpc(
      'username_available',
      { candidate: cleanUsername }
    );

    if (!rpcError && isAvailable === false) {
      return {
        fieldErrors: { username: MESSAGES.USERNAME_TAKEN },
        values,
      };
    }
  }

  try {
    const emailChanged = Boolean(currentProfile && email !== currentProfile.email);

    // 1. If email changed, update Supabase Auth FIRST so profile and auth never desynchronize
    if (emailChanged) {
      const { error: authError } = await supabase.auth.updateUser({
        email,
      });

      if (authError) {
        return {
          error: authError.message || 'Failed to update email address',
          values,
        };
      }
    }

    // 2. Update user_profiles
    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({
        username: cleanUsername,
        email,
        full_name: fullName || null,
      })
      .eq('id', user.id);

    if (profileError) {
      if (profileError.code === '23505') {
        return {
          fieldErrors: { username: MESSAGES.USERNAME_TAKEN },
          values,
        };
      }
      return { error: profileError.message || 'Failed to update profile', values };
    }

    revalidatePath('/profile');
    revalidatePath('/', 'layout');

    if (emailChanged) {
      return {
        success: MESSAGES.PROFILE_UPDATED_EMAIL_VERIFY,
        updatedAt: Date.now(),
        values: { username: cleanUsername, email, fullName },
      };
    }

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

