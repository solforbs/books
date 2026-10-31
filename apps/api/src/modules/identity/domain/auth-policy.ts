/** Login and session rules from ARCH-01 §8. Pure values, no I/O. */
export const MAX_FAILED_LOGINS = 5;
export const LOCKOUT_MS = 15 * 60_000;

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

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
