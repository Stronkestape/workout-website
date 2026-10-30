export const isValidEmail = (email) => {
  if (!email || typeof email !== "string") return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

export const validateUsername = (username) => {
  if (!username || typeof username !== "string") {
    return {
      isValid: false,
      error: "Username is required",
    };
  }

  const cleanUsername = username.trim().toLowerCase();
  const usernameRegex = /^[a-z0-9_. ]{3,100}$/;

  if (!cleanUsername) {
    return {
      isValid: false,
      error: "Username is required",
    };
  }

  if (cleanUsername.length < 3) {
    return {
      isValid: false,
      error: "Username must be at least 3 characters",
    };
  }

  if (cleanUsername.length > 100) {
    return {
      isValid: false,
      error: "Username must be at most 100 characters",
    };
  }

  if (!usernameRegex.test(cleanUsername)) {
    return {
      isValid: false,
      error:
        "Username can only contain lowercase letters, numbers, underscores, dots, and spaces",
    };
  }

  return {
    isValid: true,
    cleanUsername,
  };
};

export const validatePassword = (password) => {
  if (!password || typeof password !== "string") {
    return {
      isValid: false,
      error: "Password is required",
    };
  }

  if (password.length < 6) {
    return {
      isValid: false,
      error: "Password must be at least 6 characters",
    };
  }

  return { isValid: true };
};

export const validatePasswordMatch = (password, confirmPassword) => {
  if (password !== confirmPassword) {
    return {
      isValid: false,
      error: "Passwords do not match",
    };
  }

  return { isValid: true };
};

export const validateFullName = (fullName) => {
  if (!fullName || fullName.trim() === "") {
    return { isValid: true };
  }

  const trimmedName = fullName.trim();

  if (trimmedName.length > 100) {
    return {
      isValid: false,
      error: "Full name is too long",
    };
  }

  return { isValid: true };
};

export const sanitizeSearchTerm = (rawTerm) => {
  if (typeof rawTerm !== "string") return "";
  return rawTerm.replace(/[,().%\\*]/g, "").trim();
};
