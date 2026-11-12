import { effectivePermissions, type Permission } from "@books/shared";
import type { TenantAccessContext } from "../../identity/domain/auth-context";
import { SupplierErrors } from "../domain/supplier-errors";

export function hasPermission(access: TenantAccessContext, permission: Permission): boolean {
  return effectivePermissions(access.role, access.permissionOverrides).has(permission);
}

export function assertPermission(access: TenantAccessContext, permission: Permission): void {
  if (!hasPermission(access, permission)) throw SupplierErrors.forbidden();
}

/** The supplier list is read by those who manage suppliers and by those who receive stock (F04). */
export function assertCanRead(access: TenantAccessContext): void {
  if (!hasPermission(access, "manage_suppliers") && !hasPermission(access, "receive_stock")) {
    throw SupplierErrors.forbidden();
  }
}
