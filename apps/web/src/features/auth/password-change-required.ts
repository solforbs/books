import type { AuthErrorCode, SessionResponse } from "@books/shared";
import type { QueryClient } from "@tanstack/react-query";
import { isApiError } from "@/lib/api";
import { SESSION_QUERY_KEY } from "./hooks/use-session";

const PASSWORD_CHANGE_REQUIRED = "password_change_required" satisfies AuthErrorCode;

/**
 * The server answers 403 `password_change_required` to everything except /auth/me,
 * change-password and logout while a temporary password is in use. When any call gets it, mark
 * the cached session so the route guards send the person to the change-password screen.
 * Those three calls never return this code, so this cannot loop, and logout keeps working.
 */
export function handlePasswordChangeRequired(client: QueryClient, error: unknown): void {
  if (!isApiError(error) || error.status !== 403 || error.code !== PASSWORD_CHANGE_REQUIRED) return;
  const session = client.getQueryData<SessionResponse | null>(SESSION_QUERY_KEY);
  if (!session) {
    // Nothing cached to mark: ask the server who is logged in (GET /auth/me is always allowed).
    void client.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
    return;
  }
  if (session.user.mustChangePassword) return;
  client.setQueryData<SessionResponse>(SESSION_QUERY_KEY, {
    ...session,
    user: { ...session.user, mustChangePassword: true },
  });
}
