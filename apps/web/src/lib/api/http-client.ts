import { CLIENT_HEADER, CLIENT_HEADER_VALUE } from "@books/shared";
import { ApiError, toApiError } from "./api-error";

export const API_BASE = "/api/v1";
const REFRESH_PATH = "/auth/refresh";

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

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

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

/** One HTTP round trip. Tokens live in httpOnly cookies, so we only send credentials. */
async function send(path: string, method: Method, body: unknown): Promise<unknown> {
  const headers: Record<string, string> = { Accept: "application/json" };
  // CSRF guard: the API rejects state-changing requests without this header.
  if (method !== "GET") headers[CLIENT_HEADER] = CLIENT_HEADER_VALUE;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      credentials: "include",
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "network_error", "Network request failed");
  }

  const data = await readBody(response);
  if (!response.ok) throw toApiError(response.status, data);
  return data;
}

// Several requests may expire at once; they share one refresh call.
let refreshing: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  refreshing ??= send(REFRESH_PATH, "POST", undefined)
    .then(() => true)
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

function validate<T>(data: unknown, schema: RequestOptions<T>["schema"]): T {
  if (!schema) return data as T;
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new ApiError(200, "invalid_response", "Unexpected response shape");
  return parsed.data;
}

/**
 * Calls the API and validates the response. When the access token has expired, it calls
 * /auth/refresh once and retries the original request a single time.
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
    if (!(await refreshSession())) throw error;
    return validate(await send(path, method, body), schema);
  }
}
