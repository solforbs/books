import type { ReactNode } from "react";
import { Navigate } from "react-router";
import { useSupplierAccess } from "../hooks/use-supplier-access";

type Need = "read" | "manage" | "approve";

/** Opening a suppliers page by its address without the permission goes back to a page they may use. */
export function RequireSuppliersAccess({ need, children }: { need: Need; children: ReactNode }) {
  const access = useSupplierAccess();
  const allowed =
    need === "read" ? access.canRead : need === "manage" ? access.canManage : access.canApprove;
  if (allowed) return <>{children}</>;
  return <Navigate to={access.canRead && need !== "read" ? "/suppliers" : "/"} replace />;
}
