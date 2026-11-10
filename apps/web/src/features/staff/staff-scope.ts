import { ROLES, type Location, type Role, type StaffMember } from "@books/shared";
import type { Access } from "@/features/access/hooks/use-access";

/** Roles a manager with "add staff" may give (F02 §2.3); owners may give any role. */
const HELPER_ROLES: readonly Role[] = ["cashier", "storekeeper"];

export function assignableRoles(access: Access): readonly Role[] {
  if (access.isOwner) return ROLES;
  return access.can("add_staff") ? HELPER_ROLES : [];
}

/** Owners pick any open location; others only their own. */
export function assignableLocations(access: Access, openLocations: Location[]): Location[] {
  if (access.isOwner) return openLocations;
  const own = access.data?.locationIds ?? [];
  return openLocations.filter((l) => own.includes(l.id));
}

/**
 * Non-owners may reset passwords only of cashiers/storekeepers who work at one of their own
 * locations; the API checks the same.
 */
export function canResetPassword(access: Access, member: StaffMember): boolean {
  if (access.isOwner) return true;
  if (!access.can("add_staff") || !HELPER_ROLES.includes(member.role)) return false;
  const own = access.data?.locationIds ?? [];
  return member.locationIds.some((id) => own.includes(id));
}
