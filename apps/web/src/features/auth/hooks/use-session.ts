import type { SessionResponse } from "@books/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { isApiError } from "@/lib/api";
import { fetchSession } from "../api/auth-api";

export const SESSION_QUERY_KEY = ["auth", "session"] as const;

/**
 * The logged-in session, restored on load via /auth/me (which refreshes tokens when needed).
 * It only changes through explicit login/logout actions, never by background refetching.
 */
export function useSession() {
  return useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: fetchSession,
    staleTime: Infinity,
    gcTime: Infinity,
    // One quick retry only: a slow server should not keep people stuck on "Loading".
    retry: (failureCount, error) =>
      failureCount < 1 && (!isApiError(error) || error.status === 0 || error.status >= 500),
    retryDelay: 500,
  });
}

export function useSetSession() {
  const queryClient = useQueryClient();
  return useCallback(
    (session: SessionResponse | null) => queryClient.setQueryData(SESSION_QUERY_KEY, session),
    [queryClient],
  );
}
