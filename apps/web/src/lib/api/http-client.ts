import { ApiError, REFRESH_IN_PROGRESS } from "./api-error";
import { REFRESH_PATH, refreshSession } from "./refresh-session";
import { send, type Method } from "./transport";

export { API_BASE } from "./transport";

/** The part of a Zod schema we use; keeps this file independent of the Zod version. */
export interface ResponseSchema<T> {
  safeParse(data: unknown): { success: true; data: T } | { success: false };
}

export interface RequestOptions<T> {
  method?: Method;
  body?: unknown;
  /** Response validator. Omit when the response body is not used. */
  schema?: ResponseSchema<T>;
  /** Set for calls where a 401 means "wrong details", not "token expired" (login, register...). */
  skipRefresh?: boolean;
}

function validate<T>(data: unknown, schema: RequestOptions<T>["schema"]): T {
  if (!schema) return data as T;
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new ApiError(200, "invalid_response", "Unexpected response shape");
  return parsed.data;
}

/**
 * Calls the API and validates the response. When the access token has expired, it refreshes
 * the session (serialised across tabs) and retries the original request a single time.
 */
export async function apiRequest<T = unknown>(
  path: string,
  options: RequestOptions<T> = {},
): Promise<T> {
  const { method = "GET", body, schema, skipRefresh = false } = options;
  try {
    return validate(await send(path, method, body), schema);
  } catch (error) {
    const canRefresh = !skipRefresh && path !== REFRESH_PATH;
    if (!(error instanceof ApiError) || !error.isAuthExpired || !canRefresh) throw error;
    const outcome = await refreshSession();
    if (outcome === "failed") throw error;
    if (outcome === "busy") {
      // Not a logout: the session is being renewed elsewhere and a retry will work.
      throw new ApiError(409, REFRESH_IN_PROGRESS, "Session refresh in progress");
    }
    return validate(await send(path, method, body), schema);
  }
}
