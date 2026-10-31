import type { AuthErrorCode } from "@books/shared";
import { AppError } from "../../../common/errors/app-error";

const err = (status: number, code: AuthErrorCode, message: string, details?: unknown) =>
  new AppError(status, code, message, details);

/** Stable auth error codes (AUTH_ERROR_CODES in @books/shared). */
export const IdentityErrors = {
  identifierTaken: () => err(409, "identifier_taken", "Phone or email is already registered"),
  // Same error for unknown user, wrong password and disabled user: no enumeration.
  invalidCredentials: () => err(401, "invalid_credentials", "Wrong phone/email or password"),
  wrongCurrentPassword: () => err(400, "invalid_credentials", "Current password is wrong"),
  accountLocked: (retryAfterSeconds: number) =>
    err(423, "account_locked", "Too many failed attempts, try again later", {
      retryAfterSeconds,
    }),
  notAuthenticated: () => err(401, "not_authenticated", "Please log in"),
  sessionExpired: () => err(401, "session_expired", "Session expired, please log in again"),
  businessNotSelected: () => err(403, "business_not_selected", "Choose a business first"),
  notAMember: () => err(403, "not_a_member", "You are not a member of this business"),
  invalidRecoveryCode: () =>
    err(400, "invalid_recovery_code", "Recovery code is wrong or already used"),
  weakPassword: () =>
    err(400, "validation_failed", "Request validation failed", [
      { path: "newPassword", message: "weak_password" },
    ]),
};
