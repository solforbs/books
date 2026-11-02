/** Login and session rules from ARCH-01 §8. Pure values, no I/O. */
export const MAX_FAILED_LOGINS = 5;
export const LOCKOUT_MS = 15 * 60_000;

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
/** However often it is refreshed, a login lasts at most this long (security review L5). */
export const MAX_SESSION_LIFETIME_SECONDS = 90 * 24 * 60 * 60;
/**
 * A refresh token presented again this soon after its rotation, while its
 * successor is still active, is a second tab racing the first, not a thief.
 */
export const REFRESH_REUSE_GRACE_MS = 30_000;

export const ACCESS_COOKIE = "books_at";
export const ACCESS_COOKIE_PATH = "/api";
export const REFRESH_COOKIE = "books_rt";
export const REFRESH_COOKIE_PATH = "/api/v1/auth";

export function isLocked(lockedUntil: Date | null | undefined, now: Date): boolean {
  return !!lockedUntil && lockedUntil.getTime() > now.getTime();
}

/** Seconds until the lock lifts, rounded up, for the `account_locked` details. */
export function secondsUntilUnlock(lockedUntil: Date, now: Date): number {
  return Math.max(0, Math.ceil((lockedUntil.getTime() - now.getTime()) / 1000));
}

/** Expiry of the next refresh token: 30 days, but never past the family's 90-day cap. */
export function refreshExpiry(familyStartedAt: Date, now: Date): Date {
  const cap = familyStartedAt.getTime() + MAX_SESSION_LIFETIME_SECONDS * 1000;
  return new Date(Math.min(now.getTime() + REFRESH_TOKEN_TTL_SECONDS * 1000, cap));
}

/** A temporary password (add staff, reset) works for 72 hours (S1a security review). */
export const TEMPORARY_PASSWORD_TTL_MS = 72 * 60 * 60_000;

/**
 * Whether the person's current password is a temporary one past its 72 hours.
 * A password the person chose themselves (mustChangePassword false) never expires.
 */
export function isTemporaryPasswordExpired(
  user: { mustChangePassword: boolean; temporaryPasswordIssuedAt: Date | null },
  now: Date,
): boolean {
  if (!user.mustChangePassword || !user.temporaryPasswordIssuedAt) return false;
  return now.getTime() - user.temporaryPasswordIssuedAt.getTime() >= TEMPORARY_PASSWORD_TTL_MS;
}
