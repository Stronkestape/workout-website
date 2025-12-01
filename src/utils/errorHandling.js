export function handleError(error, context) {
  if (!error) return "An unexpected error occurred";

  if (error.code === "PGRST116") {
    return "Resource not found";
  }

  if (error.message?.includes("unique violation")) {
    return "This item already exists";
  }

  if (error.message?.includes("Invalid login credentials")) {
    return "Invalid email/username or password";
  }

  if (error.message?.includes("Email not confirmed")) {
    return "Please confirm your email before logging in";
  }

  console.error(`[${context}]`, error);
  return error.message || "Something went wrong";
}
