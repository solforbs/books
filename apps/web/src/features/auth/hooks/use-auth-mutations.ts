import type { SessionResponse } from "@books/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "../api/auth-api";
import { SESSION_QUERY_KEY, useSetSession } from "./use-session";

/** Login, choose business and similar calls return the new session; store it right away. */
function useSessionMutation<TBody>(call: (body: TBody) => Promise<SessionResponse>) {
  const setSession = useSetSession();
  return useMutation({ mutationFn: call, onSuccess: (session) => setSession(session) });
}

export const useLogin = () => useSessionMutation(authApi.login);
export const useSelectBusiness = () => useSessionMutation(authApi.selectBusiness);

/** Registration keeps the session aside until the owner has saved the recovery codes. */
export const useRegister = () => useMutation({ mutationFn: authApi.register });

export const useRecover = () => useMutation({ mutationFn: authApi.recover });

export function useChangePassword() {
  const setSession = useSetSession();
  return useMutation({
    mutationFn: async (body: Parameters<typeof authApi.changePassword>[0]) => {
      await authApi.changePassword(body);
      return authApi.me();
    },
    onSuccess: (session) => setSession(session),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const setSession = useSetSession();
  return useMutation({
    // Even if the server call fails (offline), this device forgets the session.
    mutationFn: () => authApi.logout().catch(() => undefined),
    onSettled: () => {
      // Drop every other cached business's data; the session entry stays, set to "nobody".
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== SESSION_QUERY_KEY[0] });
      setSession(null);
    },
  });
}
