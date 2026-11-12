import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { tenantKey, useTenantId } from "@/features/access/hooks/use-tenant";
import { stockApi, type StockQuery } from "../api/stock-api";

const PAGE_SIZE = 30;

export function useStockList(filters: Omit<StockQuery, "cursor" | "limit">) {
  const tenantId = useTenantId();
  return useInfiniteQuery({
    queryKey: tenantKey(tenantId, "stock", "list", JSON.stringify(filters)),
    queryFn: ({ pageParam }) => stockApi.list({ ...filters, limit: PAGE_SIZE, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: tenantId !== "",
  });
}

/** Units with this IMEI or serial; only asked for once a number has been typed. */
export function useUnitLookup(number: string) {
  const tenantId = useTenantId();
  return useQuery({
    queryKey: tenantKey(tenantId, "stock", "lookup", number),
    queryFn: async () => (await stockApi.lookup(number)).units,
    enabled: tenantId !== "" && number !== "",
  });
}
