import {
  registerResponseSchema,
  sessionResponseSchema,
  type ChangePasswordRequest,
  type LoginRequest,
  type RecoverRequest,
  type RegisterRequest,
  type SelectBusinessRequest,
  type SessionResponse,
} from "@books/shared";
import { apiRequest, isApiError } from "@/lib/api";

const BASE = "/auth";

/**
 * Typed calls to /api/v1/auth. Calls where a 401 means "wrong details" skip the automatic
 * token refresh, so a wrong password is reported instead of hidden behind a refresh attempt.
 */
export const authApi = {
  register: (body: RegisterRequest) =>
    apiRequest(`${BASE}/register`, {
      method: "POST",
      body,
      schema: registerResponseSchema,
      skipRefresh: true,
    }),

  login: (body: LoginRequest) =>
    apiRequest(`${BASE}/login`, {
      method: "POST",
      body,
      schema: sessionResponseSchema,
      skipRefresh: true,
    }),

  selectBusiness: (body: SelectBusinessRequest) =>
    apiRequest(`${BASE}/select-business`, {
      method: "POST",
      body,
      schema: sessionResponseSchema,
    }),

  me: () => apiRequest(`${BASE}/me`, { schema: sessionResponseSchema }),

  /** The response body is not part of the contract, so it is ignored. */
  changePassword: (body: ChangePasswordRequest) =>
    apiRequest(`${BASE}/change-password`, { method: "POST", body }),

  /** The response body is not part of the contract; the user logs in again afterwards. */
  recover: (body: RecoverRequest) =>
    apiRequest(`${BASE}/recover`, { method: "POST", body, skipRefresh: true }),

  logout: () => apiRequest(`${BASE}/logout`, { method: "POST", skipRefresh: true }),
};

/** Current session, or null when nobody is logged in (even after trying a token refresh). */
export async function fetchSession(): Promise<SessionResponse | null> {
  try {
    return await authApi.me();
  } catch (error) {
    if (isApiError(error) && error.status === 401) return null;
    throw error;
  }
}
