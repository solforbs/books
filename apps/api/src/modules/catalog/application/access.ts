import { effectivePermissions, type Permission } from "@books/shared";
import { forbidden } from "../../../common/errors/app-error";
import type { TenantAccessContext } from "../../identity/domain/auth-context";

/** Permissions of the caller from the membership read on this very request. */
export function hasPermission(access: TenantAccessContext, permission: Permission): boolean {
  return effectivePermissions(access.role, access.permissionOverrides).has(permission);
}

export const notAllowed = () => forbidden("forbidden", "You are not allowed to do this");

export function assertPermission(access: TenantAccessContext, permission: Permission): void {
  if (!hasPermission(access, permission)) throw notAllowed();
}
