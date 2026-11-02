import { Injectable } from "@nestjs/common";
import type { Role } from "@books/shared";
import type { TenantAccessContext } from "../domain/auth-context";
import { MembershipLocationsRepository } from "../infrastructure/membership-locations.repository";
import { MembershipsRepository } from "../infrastructure/memberships.repository";
import { TenantsRepository } from "../infrastructure/tenants.repository";

/**
 * How long a membership lookup is reused. Changes made through the API clear the
 * person's entry at once (`forgetUser`); the window only matters for changes made
 * by another API instance or directly in the database.
 */
export const TENANT_ACCESS_CACHE_MS = 5_000;
const MAX_CACHE_ENTRIES = 10_000;

interface CacheEntry {
  access: TenantAccessContext | null;
  expiresAt: number;
}

/**
 * The caller's membership in a business (role, switches, locations), read from
 * the database rather than taken from the 15-minute access token, so a
 * switched-off member or a changed role takes effect on the next request
 * (security review M3).
 */
@Injectable()
export class TenantAccess {
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    private readonly memberships: MembershipsRepository,
    private readonly memberLocations: MembershipLocationsRepository,
    private readonly tenants: TenantsRepository,
  ) {}

  /** The active member's access in an active business, else null. */
  async accessOf(
    userId: string,
    tenantId: string,
    now = Date.now(),
  ): Promise<TenantAccessContext | null> {
    const key = `${userId}:${tenantId}`;
    const hit = this.cache.get(key);
    if (hit && hit.expiresAt > now) return hit.access;

    const access = await this.load(userId, tenantId);
    if (this.cache.size >= MAX_CACHE_ENTRIES) this.cache.clear();
    this.cache.set(key, { access, expiresAt: now + TENANT_ACCESS_CACHE_MS });
    return access;
  }

  async roleOf(userId: string, tenantId: string, now = Date.now()): Promise<Role | null> {
    return (await this.accessOf(userId, tenantId, now))?.role ?? null;
  }

  /** Drop cached answers for a user, e.g. right after their membership changed. */
  forgetUser(userId: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${userId}:`)) this.cache.delete(key);
    }
  }

  private async load(userId: string, tenantId: string): Promise<TenantAccessContext | null> {
    const membership = await this.memberships.findActive(userId, tenantId);
    if (!membership) return null;
    if ((await this.tenants.findActiveByIds([tenantId])).length !== 1) return null;
    const locations =
      membership.role === "owner"
        ? []
        : ((await this.memberLocations.activeByMembership(tenantId, [membership.id])).get(
            membership.id,
          ) ?? []);
    return {
      tenantId,
      userId,
      membershipId: membership.id,
      role: membership.role,
      permissionOverrides: membership.permissionOverrides,
      locationIds: locations,
    };
  }
}
