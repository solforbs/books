import { effectivePermissions } from "@books/shared";
import { forbidden } from "../../../common/errors/app-error";
import type { TenantAccessContext } from "../../identity/domain/auth-context";

/** Stock is read by those who receive stock, manage products or read reports (stock contract). */
export function assertCanReadStock(access: TenantAccessContext): void {
  const granted = effectivePermissions(access.role, access.permissionOverrides);
  const mayRead =
    granted.has("receive_stock") || granted.has("manage_products") || granted.has("view_reports");
  if (!mayRead) throw forbidden("forbidden", "You are not allowed to do this");
}

export const canSeeStockCosts = (access: TenantAccessContext) =>
  effectivePermissions(access.role, access.permissionOverrides).has("see_cost_profit");
