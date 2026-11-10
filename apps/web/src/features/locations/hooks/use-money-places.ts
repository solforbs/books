import type { CreateMoneyPlaceRequest, UpdateMoneyPlaceRequest } from "@books/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TENANT_STALE_MS, tenantKey, useTenantId } from "@/features/access/hooks/use-tenant";
import { moneyPlacesApi } from "../api/locations-api";

export function useMoneyPlaces() {
  const tenantId = useTenantId();
  return useQuery({
    queryKey: tenantKey(tenantId, "money-places"),
    queryFn: async () => (await moneyPlacesApi.list()).moneyPlaces,
    enabled: tenantId !== "",
    staleTime: TENANT_STALE_MS,
  });
}

function useMoneyPlaceMutation<TArgs>(call: (args: TArgs) => Promise<unknown>) {
  const queryClient = useQueryClient();
  const tenantId = useTenantId();
  return useMutation({
    mutationFn: call,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: tenantKey(tenantId, "money-places") }),
  });
}

export const useCreateMoneyPlace = () =>
  useMoneyPlaceMutation((body: CreateMoneyPlaceRequest) => moneyPlacesApi.create(body));

export const useUpdateMoneyPlace = () =>
  useMoneyPlaceMutation(({ id, body }: { id: string; body: UpdateMoneyPlaceRequest }) =>
    moneyPlacesApi.update(id, body),
  );
