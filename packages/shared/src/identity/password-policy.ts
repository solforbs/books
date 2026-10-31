/**
 * Strong password rule (ARCH-01 §8), identical on device and server:
 * - at least 10 characters (max 128)
 * - at least 3 of: lower case, upper case, digits, symbols
 * - not a common / easily guessed password
 */
export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

const COMMON_PASSWORDS = new Set([
  "password123",
  "password1234",
  "qwerty12345",
  "1234567890",
  "12345678910",
  "iloveyou123",
  "admin12345",
  "welcome123",
  "letmein1234",
  "passw0rd123",
  "qwertyuiop",
  "abcdef12345",
  "mpesa12345",
  "kenya12345",
  "nairobi123",
  "password@123",
  "p@ssw0rd123",
  "1q2w3e4r5t",
  "asdfghjkl1",
  "zaq12wsxcde",
]);

export type PasswordProblem = "too_short" | "too_long" | "too_simple" | "too_common";

export function checkPassword(password: string, personalWords: string[] = []): PasswordProblem[] {
  const problems: PasswordProblem[] = [];
  if (password.length < PASSWORD_MIN_LENGTH) problems.push("too_short");
  if (password.length > PASSWORD_MAX_LENGTH) problems.push("too_long");

  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z\d]/].filter((re) => re.test(password)).length;
  if (kinds < 3) problems.push("too_simple");

  const lower = password.toLowerCase();
  const containsPersonal = personalWords
    .map((w) => w.trim().toLowerCase())
    .filter((w) => w.length >= 4)
    .some((w) => lower.includes(w));
  if (COMMON_PASSWORDS.has(lower) || containsPersonal || /^(.)\1+$/.test(password)) {
    problems.push("too_common");
  }
  return problems;
}

export function isStrongPassword(password: string, personalWords: string[] = []): boolean {
  return checkPassword(password, personalWords).length === 0;
}
