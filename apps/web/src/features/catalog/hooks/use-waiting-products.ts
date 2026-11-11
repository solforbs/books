import type { Product } from "@books/shared";
import { useQuery } from "@tanstack/react-query";
import { useAccess } from "@/features/access/hooks/use-access";
import { tenantKey, useTenantId } from "@/features/access/hooks/use-tenant";
import { productsApi } from "../api/products-api";

const NONE: never[] = [];
const PAGE_SIZE = 100;
/** A safety stop (2000 waiting products); far beyond what an approver can review. */
export const MAX_WAITING_PAGES = 20;

/** Every waiting product: follows `nextCursor` until the list is exhausted (or the cap). */
export async function fetchAllWaiting(): Promise<Product[]> {
  const all: Product[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < MAX_WAITING_PAGES; page++) {
    const res = await productsApi.waiting({ limit: PAGE_SIZE, cursor });
    all.push(...res.products);
    if (!res.nextCursor) break;
    cursor = res.nextCursor;
  }
  return all;
}

/**
 * Products waiting for an approver (G1). Only people who can approve ever ask; everyone else
 * (and shops where nothing is waiting) never see any approval wording.
 */
export function useWaitingProducts() {
  const tenantId = useTenantId();
  const { can } = useAccess();
  const allowed = can("approve_items");
  const query = useQuery({
    queryKey: tenantKey(tenantId, "products", "waiting"),
    queryFn: fetchAllWaiting,
    enabled: tenantId !== "" && allowed,
    staleTime: 30_000,
  });
  const products = allowed && query.data ? query.data : NONE;
  return { products, count: products.length, query, allowed };
}
