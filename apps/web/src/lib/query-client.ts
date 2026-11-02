import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { handlePasswordChangeRequired } from "@/features/auth/password-change-required";
import { isApiError } from "./api";

/** Client errors (4xx) will not fix themselves, so only network/server failures are retried. */
export function createQueryClient(): QueryClient {
  // Every failed query or mutation passes through here, so a server-enforced password change
  // is handled in one place instead of on every screen.
  const onError = (error: unknown) => handlePasswordChangeRequired(client, error);
  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({ onError }),
    mutationCache: new MutationCache({ onError }),
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          if (isApiError(error) && error.status >= 400 && error.status < 500) return false;
          return failureCount < 2;
        },
        refetchOnWindowFocus: false,
      },
      mutations: { retry: false },
    },
  });
  return client;
}
