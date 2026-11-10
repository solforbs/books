import type { CreateLocationRequest, UpdateLocationRequest } from "@books/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TENANT_STALE_MS, tenantKey, useTenantId } from "@/features/access/hooks/use-tenant";
import { locationsApi } from "../api/locations-api";

/** Locations this person may see (owners: all, open and closed). */
export function useLocations() {
  const tenantId = useTenantId();
  return useQuery({
    queryKey: tenantKey(tenantId, "locations"),
    queryFn: async () => (await locationsApi.list()).locations,
    enabled: tenantId !== "",
    staleTime: TENANT_STALE_MS,
  });
}

/**
 * Any location change can also add a cash drawer or change who sees what, so locations and
 * money places are both refreshed afterwards.
 */
function useLocationMutation<TArgs>(call: (args: TArgs) => Promise<unknown>) {
  const queryClient = useQueryClient();
  const tenantId = useTenantId();
  return useMutation({
    mutationFn: call,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: tenantKey(tenantId, "locations") }),
        queryClient.invalidateQueries({ queryKey: tenantKey(tenantId, "money-places") }),
      ]);
    },
  });
}

export const useCreateLocation = () =>
  useLocationMutation((body: CreateLocationRequest) => locationsApi.create(body));

export const useUpdateLocation = () =>
  useLocationMutation(({ id, body }: { id: string; body: UpdateLocationRequest }) =>
    locationsApi.update(id, body),
  );

export const useCloseLocation = () => useLocationMutation((id: string) => locationsApi.close(id));

export const useReopenLocation = () => useLocationMutation((id: string) => locationsApi.reopen(id));
