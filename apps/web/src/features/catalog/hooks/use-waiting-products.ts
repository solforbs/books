import { useQuery } from "@tanstack/react-query";
import { useAccess } from "@/features/access/hooks/use-access";
import { tenantKey, useTenantId } from "@/features/access/hooks/use-tenant";
import { productsApi } from "../api/products-api";

const NONE: never[] = [];

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
    queryFn: async () => (await productsApi.waiting()).products,
    enabled: tenantId !== "" && allowed,
    staleTime: 30_000,
  });
  const products = allowed && query.data ? query.data : NONE;
  return { products, count: products.length, query, allowed };
}
