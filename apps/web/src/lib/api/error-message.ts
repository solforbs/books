import { AUTH_ERROR_CODES } from "@books/shared";
import { CLIENT_ERROR_CODES, isApiError, PENDING_API_ERROR_CODES } from "./api-error";

const KNOWN_CODES = new Set<string>([
  ...AUTH_ERROR_CODES,
  ...CLIENT_ERROR_CODES,
  ...PENDING_API_ERROR_CODES,
]);

/** i18n key for a friendly message about any thrown error. Unknown codes get a generic text. */
export function errorMessageKey(error: unknown): string {
  if (isApiError(error) && KNOWN_CODES.has(error.code)) return `errors.${error.code}`;
  return "errors.unknown";
}
