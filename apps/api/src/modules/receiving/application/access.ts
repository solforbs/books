import { effectivePermissions, type Permission } from "@books/shared";
import type { TenantAccessContext } from "../../identity/domain/auth-context";
import { DeliveryErrors } from "../domain/delivery-errors";

export function hasPermission(access: TenantAccessContext, permission: Permission): boolean {
  return effectivePermissions(access.role, access.permissionOverrides).has(permission);
}

export function assertPermission(access: TenantAccessContext, permission: Permission): void {
  if (!hasPermission(access, permission)) throw DeliveryErrors.forbidden();
}

/** Costs, totals and payments are only visible to people with see_cost_profit (F04 section 7). */
export const canSeeCosts = (access: TenantAccessContext) =>
  hasPermission(access, "see_cost_profit");

/** Owners and managers may confirm a phone that was sold before (F04 4.3) and overdraw a drawer (9.7). */
export const isOwnerOrManager = (access: TenantAccessContext) =>
  access.role === "owner" || access.role === "manager";

/**
 * Who may enter a missing cost afterwards (F04a plan): see_cost_profit, and either the owner
 * or a person who also receives stock. By default only the owner holds see_cost_profit among
 * the people who receive stock, so "a person the owner allowed" means the owner switched it
 * on for them; an accountant (who sees costs but does not receive stock) cannot enter them.
 */
export const canEnterCosts = (access: TenantAccessContext) =>
  hasPermission(access, "see_cost_profit") &&
  (access.role === "owner" || hasPermission(access, "receive_stock"));
