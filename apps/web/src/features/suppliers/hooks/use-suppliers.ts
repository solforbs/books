import type { Supplier } from "@books/shared";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { tenantKey, useTenantId } from "@/features/access/hooks/use-tenant";
import { suppliersApi, type SupplierListQuery } from "../api/suppliers-api";
import { useSupplierAccess } from "./use-supplier-access";

const PAGE_SIZE = 30;
const NONE: never[] = [];
const WAITING_PAGE_SIZE = 100;
/** A safety stop (2000 waiting suppliers); far beyond what an approver can review. */
export const MAX_WAITING_SUPPLIER_PAGES = 20;

/** Every waiting supplier: follows `nextCursor` until the list is exhausted (or the cap). */
export async function fetchAllWaitingSuppliers(): Promise<Supplier[]> {
  const all: Supplier[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < MAX_WAITING_SUPPLIER_PAGES; page++) {
    const res = await suppliersApi.waiting({ limit: WAITING_PAGE_SIZE, cursor });
    all.push(...res.suppliers);
    if (!res.nextCursor) break;
    cursor = res.nextCursor;
  }
  return all;
}

export function useSupplierList(filters: Omit<SupplierListQuery, "cursor" | "limit">) {
  const tenantId = useTenantId();
  const { canRead } = useSupplierAccess();
  return useInfiniteQuery({
    queryKey: tenantKey(tenantId, "suppliers", "list", JSON.stringify(filters)),
    queryFn: ({ pageParam }) =>
      suppliersApi.list({ ...filters, limit: PAGE_SIZE, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: tenantId !== "" && canRead,
  });
}

export function useSupplier(id: string) {
  const tenantId = useTenantId();
  const { canRead } = useSupplierAccess();
  return useQuery({
    queryKey: tenantKey(tenantId, "suppliers", "detail", id),
    queryFn: async () => (await suppliersApi.get(id)).supplier,
    enabled: tenantId !== "" && id !== "" && canRead,
  });
}

/**
 * Suppliers waiting for completion (G1). Only approvers ever ask; everyone else, and shops
 * where nothing is waiting, never see any of this wording.
 */
export function useWaitingSuppliers() {
  const tenantId = useTenantId();
  const { canApprove } = useSupplierAccess();
  const query = useQuery({
    queryKey: tenantKey(tenantId, "suppliers", "waiting"),
    queryFn: fetchAllWaitingSuppliers,
    enabled: tenantId !== "" && canApprove,
    staleTime: 30_000,
  });
  const suppliers = canApprove && query.data ? query.data : NONE;
  return { suppliers, count: suppliers.length, query, allowed: canApprove };
}
