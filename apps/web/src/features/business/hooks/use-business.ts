import type { SessionResponse, UpdateBusinessRequest } from "@books/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TENANT_STALE_MS, tenantKey, useTenantId } from "@/features/access/hooks/use-tenant";
import { SESSION_QUERY_KEY } from "@/features/auth/hooks/use-session";
import { businessApi } from "../api/business-api";

export function useBusiness() {
  const tenantId = useTenantId();
  return useQuery({
    queryKey: tenantKey(tenantId, "business"),
    queryFn: async () => (await businessApi.get()).business,
    enabled: tenantId !== "",
    staleTime: TENANT_STALE_MS,
  });
}

/** Saving also renames the business in the top bar right away (it reads the session). */
export function useUpdateBusiness() {
  const queryClient = useQueryClient();
  const tenantId = useTenantId();
  return useMutation({
    mutationFn: (body: UpdateBusinessRequest) => businessApi.update(body),
    onSuccess: ({ business }) => {
      queryClient.setQueryData(tenantKey(tenantId, "business"), business);
      queryClient.setQueryData<SessionResponse | null>(SESSION_QUERY_KEY, (session) =>
        session
          ? {
              ...session,
              memberships: session.memberships.map((m) =>
                m.tenantId === tenantId ? { ...m, businessName: business.name } : m,
              ),
            }
          : session,
      );
    },
  });
}
