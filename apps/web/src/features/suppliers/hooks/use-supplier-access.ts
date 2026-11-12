import { useAccess } from "@/features/access/hooks/use-access";

/** What this person may do with suppliers; the API enforces the same rules. */
export function useSupplierAccess() {
  const { can } = useAccess();
  const canManage = can("manage_suppliers");
  const canReceive = can("receive_stock");
  return {
    canManage,
    canRead: canManage || canReceive,
    // People who can manage suppliers use the full form instead (the API refuses them).
    canQuickAdd: canReceive && !canManage,
    canApprove: can("approve_items"),
  };
}
