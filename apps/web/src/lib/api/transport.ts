import { CLIENT_HEADER, CLIENT_HEADER_VALUE } from "@books/shared";
import { ApiError, toApiError } from "./api-error";

export const API_BASE = "/api/v1";

export type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

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
export async function send(path: string, method: Method, body?: unknown): Promise<unknown> {
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
