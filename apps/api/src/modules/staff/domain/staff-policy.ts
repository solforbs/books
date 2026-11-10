import { effectivePermissions, type Role, type StaffMember } from "@books/shared";
import type { TenantAccessContext } from "../../identity/domain/auth-context";
import { StaffErrors } from "./staff-errors";

/** Roles a manager with `add_staff` may add or reset (F02 §2.3). */
export const ROLES_ADDABLE_BY_MANAGERS: readonly Role[] = ["cashier", "storekeeper"];

export const isOwner = (access: Pick<TenantAccessContext, "role">) => access.role === "owner";

export function assertOwner(access: TenantAccessContext): void {
  if (!isOwner(access)) throw StaffErrors.forbidden();
}

/**
 * Owners manage anyone. A member with `add_staff` manages only cashiers and
 * storekeepers whose every location is one of their own (F02 §2.3, §8.13).
 */
export function canManagePerson(
  access: TenantAccessContext,
  role: Role,
  locationIds: string[],
): boolean {
  if (isOwner(access)) return true;
  if (!effectivePermissions(access.role, access.permissionOverrides).has("add_staff")) {
    return false;
  }
  const own = new Set(access.locationIds);
  return (
    ROLES_ADDABLE_BY_MANAGERS.includes(role) &&
    locationIds.length > 0 &&
    locationIds.every((id) => own.has(id))
  );
}

/** Whether a change takes away an active owner (role changed away, or switched off). */
export function removesOwner(
  member: Pick<StaffMember, "role" | "status">,
  next: { role?: Role; status?: StaffMember["status"] },
): boolean {
  if (member.role !== "owner" || member.status !== "active") return false;
  return (next.role !== undefined && next.role !== "owner") || next.status === "switched_off";
}

/**
 * Nobody changes their own role, switches, locations or status. The last owner
 * trying to step down gets the more helpful `last_owner` (F02 §8.1, T8).
 */
export function assertNotSelf(
  access: TenantAccessContext,
  member: Pick<StaffMember, "userId" | "role" | "status">,
  next: { role?: Role; status?: StaffMember["status"] },
  activeOwners: number,
): void {
  if (member.userId !== access.userId) return;
  if (removesOwner(member, next) && activeOwners <= 1) throw StaffErrors.lastOwner();
  throw StaffErrors.cannotChangeSelf();
}

/** Non-owners need at least one location (F02 §8.2). */
export function assertHasLocation(role: Role, locationIds: string[]): void {
  if (role !== "owner" && locationIds.length === 0) throw StaffErrors.locationRequired();
}
