import { Injectable } from "@nestjs/common";
import type { Role } from "@books/shared";
import { MembershipsRepository } from "../infrastructure/memberships.repository";
import { TenantsRepository } from "../infrastructure/tenants.repository";

/** How long a membership lookup is reused; a disabled member is cut off within this. */
export const TENANT_ACCESS_CACHE_MS = 5_000;
const MAX_CACHE_ENTRIES = 10_000;

interface CacheEntry {
  role: Role | null;
  expiresAt: number;
}

/**
 * The caller's role in a business, read from the database rather than taken
 * from the 15-minute access token, so a disabled member or a changed role
 * takes effect within seconds (security review M3).
 */
@Injectable()
export class TenantAccess {
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    private readonly memberships: MembershipsRepository,
    private readonly tenants: TenantsRepository,
  ) {}

  /** The active member's role in an active business, else null. */
  async roleOf(userId: string, tenantId: string, now = Date.now()): Promise<Role | null> {
    const key = `${userId}:${tenantId}`;
    const hit = this.cache.get(key);
    if (hit && hit.expiresAt > now) return hit.role;

    const membership = await this.memberships.findActive(userId, tenantId);
    const tenantActive =
      membership !== null && (await this.tenants.findActiveByIds([tenantId])).length === 1;
    const role = membership && tenantActive ? membership.role : null;

    if (this.cache.size >= MAX_CACHE_ENTRIES) this.cache.clear();
    this.cache.set(key, { role, expiresAt: now + TENANT_ACCESS_CACHE_MS });
    return role;
  }

  /** Drop cached answers for a user, e.g. right after their membership changed. */
  forgetUser(userId: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${userId}:`)) this.cache.delete(key);
    }
  }
}
