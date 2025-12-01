export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);  
};

export const validateUsername = (username) => {
  const cleanUsername = username.trim().toLowerCase();
  const usernameRegex = /^[a-z0-9_. ]{3,100}$/;

  if (!cleanUsername) {
    return {
      isValid: false,
      error: "Username is required",
    };
  }

  if (cleanUsername.length > 100) {
    return {
      isValid: false,
      error: "Username must be at most 100 characters"
    };
  }

  if (!usernameRegex.test(cleanUsername)) {
    return {
      isValid: false,
      error: "Username can only contain lowercase letters, numbers, underscores, dots, and spaces"
    };
  }

  return {
    isValid: true,
    cleanUsername
  };

  
};

export const validatePassword = (password) => {
  if (!password) {
    return {
      isValid: false,
      error: "Password is required"
    };
  }
  
  if (password.length < 6) {
    return {
      isValid: false,
      error: "Password must be at least 6 characters"
    };
  }
  
  return { isValid: true };
};

export const validatePasswordMatch = (password, confirmPassword) => {
  if (password !== confirmPassword) {
    return {
      isValid: false,
      error: "Passwords do not match"
    };
  }
  
  return { isValid: true };
};

export const validateFullName = (fullName) => {
  // Full name is optional, so empty is valid
  if (!fullName || fullName.trim() === "") {
    return { isValid: true };
  }
  
  const trimmedName = fullName.trim();
  
  // Check for reasonable length
  if (trimmedName.length > 100) {
    return {
      isValid: false,
      error: "Full name is too long"
    };
  }
  
  return { isValid: true };
};
