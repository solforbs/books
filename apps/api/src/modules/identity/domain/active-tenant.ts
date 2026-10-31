import type { Role } from "@books/shared";

export interface ActiveMembership {
  tenantId: string;
  role: Role;
}

/**
 * Which business a session works in (ARCH-01 §8):
 * - keep the preferred one while the person is still an active member;
 * - otherwise pick automatically only when there is exactly one;
 * - otherwise none, and the person must choose (select-business).
 */
export function pickActiveMembership(
  memberships: ActiveMembership[],
  preferredTenantId: string | null,
): ActiveMembership | null {
  if (preferredTenantId) {
    const preferred = memberships.find((m) => m.tenantId === preferredTenantId);
    if (preferred) return preferred;
  }
  return memberships.length === 1 ? memberships[0]! : null;
}
