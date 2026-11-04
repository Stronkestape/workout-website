export interface ValidationResult {
  isValid: boolean;
  error?: string;
  cleanUsername?: string;
}

export const isValidEmail = (email: unknown): boolean => {
  if (!email || typeof email !== "string") return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

export const validateUsername = (username: unknown): ValidationResult => {
  if (!username || typeof username !== "string") {
    return {
      isValid: false,
      error: "A felhasználónév megadása kötelező",
    };
  }

  const cleanUsername = username.trim().toLowerCase();
  const usernameRegex = /^[a-z0-9_. ]{3,100}$/;

  if (!cleanUsername) {
    return {
      isValid: false,
      error: "A felhasználónév megadása kötelező",
    };
  }

  if (cleanUsername.length < 3) {
    return {
      isValid: false,
      error: "A felhasználónévnek legalább 3 karakterből kell állnia",
    };
  }

  if (cleanUsername.length > 100) {
    return {
      isValid: false,
      error: "A felhasználónév legfeljebb 100 karakter lehet",
    };
  }

  if (!usernameRegex.test(cleanUsername)) {
    return {
      isValid: false,
      error:
        "A felhasználónév csak kisbetűket, számokat, aláhúzást, pontot és szóközt tartalmazhat",
    };
  }

  return {
    isValid: true,
    cleanUsername,
  };
};

export const validatePassword = (password: unknown): ValidationResult => {
  if (!password || typeof password !== "string") {
    return {
      isValid: false,
      error: "A jelszó megadása kötelező",
    };
  }

  if (password.length < 6) {
    return {
      isValid: false,
      error: "A jelszónak legalább 6 karakterből kell állnia",
    };
  }

  return { isValid: true };
};

export const validatePasswordMatch = (
  password: unknown,
  confirmPassword: unknown
): ValidationResult => {
  if (password !== confirmPassword) {
    return {
      isValid: false,
      error: "A megadott jelszavak nem egyeznek",
    };
  }

  return { isValid: true };
};

export const validateFullName = (fullName: unknown): ValidationResult => {
  if (!fullName || typeof fullName !== "string" || fullName.trim() === "") {
    return { isValid: true };
  }

  const trimmedName = fullName.trim();

  if (trimmedName.length > 100) {
    return {
      isValid: false,
      error: "A teljes név legfeljebb 100 karakter lehet",
    };
  }

  return { isValid: true };
};

export const sanitizeSearchTerm = (rawTerm: unknown): string => {
  if (typeof rawTerm !== "string") return "";
  return rawTerm
    .replace(/[%,()\\*.]/g, "")
    .trim();
};
