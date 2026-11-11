import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { TENANT_STALE_MS, tenantKey, useTenantId } from "@/features/access/hooks/use-tenant";
import { productsApi, type ProductListQuery } from "../api/products-api";

const PAGE_SIZE = 30;

/** Product pages with "Load more": each page asks for the next cursor. */
export function useProductList(filters: Omit<ProductListQuery, "cursor" | "limit">) {
  const tenantId = useTenantId();
  return useInfiniteQuery({
    queryKey: tenantKey(tenantId, "products", "list", JSON.stringify(filters)),
    queryFn: ({ pageParam }) =>
      productsApi.list({ ...filters, limit: PAGE_SIZE, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: tenantId !== "",
  });
}

/** A short search used to pick a product (for example, the one to merge into). */
export function useProductSearch(q: string) {
  const tenantId = useTenantId();
  return useQuery({
    queryKey: tenantKey(tenantId, "products", "search", q),
    queryFn: async () => (await productsApi.list({ q, limit: 8 })).products,
    enabled: tenantId !== "" && q.trim().length >= 2,
  });
}

export function useProduct(id: string) {
  const tenantId = useTenantId();
  return useQuery({
    queryKey: tenantKey(tenantId, "products", "detail", id),
    queryFn: async () => (await productsApi.get(id)).product,
    enabled: tenantId !== "" && id !== "",
  });
}

/** Suggestions for brand, model, storage, colour and condition. */
export function useProductOptions() {
  const tenantId = useTenantId();
  return useQuery({
    queryKey: tenantKey(tenantId, "products", "options"),
    queryFn: productsApi.options,
    enabled: tenantId !== "",
    staleTime: TENANT_STALE_MS,
  });
}

export function useProductHistory(id: string, enabled: boolean) {
  const tenantId = useTenantId();
  return useQuery({
    queryKey: tenantKey(tenantId, "products", "history", id),
    queryFn: async () => (await productsApi.history(id)).entries,
    enabled: enabled && tenantId !== "",
  });
}
