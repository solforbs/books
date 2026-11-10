import { SetMetadata } from "@nestjs/common";

export const ALLOW_PENDING_PASSWORD_CHANGE_KEY = "books:allowPendingPasswordChange";

/**
 * Marks one of the few routes a person may use while they still have to change
 * their temporary password (GET /auth/me, POST /auth/change-password). Every
 * other authenticated route answers 403 `password_change_required` (AuthGuard).
 * Public routes (login, refresh, logout) need no session and are not affected.
 */
export const AllowPendingPasswordChange = () =>
  SetMetadata(ALLOW_PENDING_PASSWORD_CHANGE_KEY, true);
