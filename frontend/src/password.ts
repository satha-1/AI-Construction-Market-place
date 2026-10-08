const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }
  if (!/[A-Za-z]/.test(password)) {
    return "Password must include at least one letter.";
  }
  if (!/\d/.test(password)) {
    return "Password must include at least one number.";
  }
  if (!PASSWORD_RULE.test(password)) {
    return "Password must include letters and numbers.";
  }
  return null;
}

export function passwordsMatch(password: string, confirmPassword: string): string | null {
  if (password !== confirmPassword) {
    return "Passwords do not match.";
  }
  return null;
}
