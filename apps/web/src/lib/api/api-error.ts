import { apiErrorSchema } from "@books/shared";

/** Codes the client itself produces when there is no usable API error body. */
export const CLIENT_ERROR_CODES = ["network_error", "invalid_response", "unknown"] as const;

/**
 * 409 from /auth/refresh: another tab just refreshed; retry instead of logging out.
 * TODO: switch to the shared constant once it lands in @books/shared AUTH_ERROR_CODES.
 */
export const REFRESH_IN_PROGRESS = "refresh_in_progress";

/** API codes the web client knows before the shared contract lists them. */
export const PENDING_API_ERROR_CODES = [REFRESH_IN_PROGRESS] as const;

/** A failed API call. `code` is stable and is what the UI translates. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** The access token is gone or too old; a refresh may fix it. */
  get isAuthExpired(): boolean {
    return this.status === 401 || this.code === "session_expired";
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

/** Turns any non-2xx response body into an ApiError, even when the body is not our shape. */
export function toApiError(status: number, body: unknown): ApiError {
  const parsed = apiErrorSchema.safeParse(body);
  if (parsed.success) {
    const { code, message, details } = parsed.data.error;
    return new ApiError(status, code, message, details);
  }
  return new ApiError(status, "unknown", `Request failed with status ${status}`);
}
