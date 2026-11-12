import {
  AUTH_ERROR_CODES,
  CATEGORY_ERROR_CODES,
  LOCATION_ERROR_CODES,
  PRODUCT_ERROR_CODES,
  STAFF_ERROR_CODES,
  SUPPLIER_ERROR_CODES,
} from "@books/shared";
import { CLIENT_ERROR_CODES, isApiError, type ApiError } from "./api-error";

const KNOWN_CODES = new Set<string>([
  ...AUTH_ERROR_CODES,
  ...LOCATION_ERROR_CODES,
  ...STAFF_ERROR_CODES,
  ...PRODUCT_ERROR_CODES,
  ...CATEGORY_ERROR_CODES,
  ...SUPPLIER_ERROR_CODES,
  ...CLIENT_ERROR_CODES,
]);

/** `details.reason` values that have their own, clearer message than the plain code. */
const KNOWN_REASONS = new Set<string>(["member_of_other_business"]);

function reasonOf(error: ApiError): string | undefined {
  const details = error.details;
  if (typeof details !== "object" || details === null || !("reason" in details)) return undefined;
  return typeof details.reason === "string" ? details.reason : undefined;
}

/** i18n key for a friendly message about any thrown error. Unknown codes get a generic text. */
export function errorMessageKey(error: unknown): string {
  if (!isApiError(error)) return "errors.unknown";
  const reason = reasonOf(error);
  if (reason && KNOWN_REASONS.has(reason)) return `errors.${reason}`;
  if (KNOWN_CODES.has(error.code)) return `errors.${error.code}`;
  return "errors.unknown";
}
