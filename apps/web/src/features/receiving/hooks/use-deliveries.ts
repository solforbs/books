import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { tenantKey, useTenantId } from "@/features/access/hooks/use-tenant";
import { deliveriesApi, type DeliveryListQuery } from "../api/deliveries-api";

const PAGE_SIZE = 30;

export function useDeliveryList(filters: Omit<DeliveryListQuery, "cursor" | "limit">) {
  const tenantId = useTenantId();
  return useInfiniteQuery({
    queryKey: tenantKey(tenantId, "deliveries", "list", JSON.stringify(filters)),
    queryFn: ({ pageParam }) =>
      deliveriesApi.list({ ...filters, limit: PAGE_SIZE, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: tenantId !== "",
  });
}

export function useDelivery(id: string) {
  const tenantId = useTenantId();
  return useQuery({
    queryKey: tenantKey(tenantId, "deliveries", "detail", id),
    queryFn: async () => (await deliveriesApi.get(id)).delivery,
    enabled: tenantId !== "" && id !== "",
  });
}
