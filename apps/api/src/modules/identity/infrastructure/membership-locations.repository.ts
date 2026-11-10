import { Injectable } from "@nestjs/common";
import { and, asc, eq, inArray, notInArray, sql } from "drizzle-orm";
import { isUuid } from "../../../common/database/uuid";
import { TenantDb, type TenantTx } from "../../../common/tenancy/tenant-db";
import { TenantScopedRepository } from "../../../common/tenancy/tenant-scoped.repository";
import { membershipLocations } from "./tables/membership-locations.table";

/** Member-to-location assignments. Unassigning flips `active`; nothing is deleted (G4). */
@Injectable()
export class MembershipLocationsRepository extends TenantScopedRepository<
  typeof membershipLocations
> {
  constructor(tenantDb: TenantDb) {
    super(tenantDb, membershipLocations);
  }

  /** Active location ids per membership, for the given memberships. */
  async activeByMembership(
    tenantId: string,
    membershipIds: string[],
    within?: TenantTx,
  ): Promise<Map<string, string[]>> {
    const ids = membershipIds.filter(isUuid);
    const result = new Map<string, string[]>(ids.map((id) => [id, []]));
    if (ids.length === 0) return result;
    const rows = await this.find(
      tenantId,
      and(inArray(membershipLocations.membershipId, ids), eq(membershipLocations.active, true)),
      { orderBy: [asc(membershipLocations.createdAt), asc(membershipLocations.id)] },
      within,
    );
    for (const row of rows) result.get(row.membershipId)?.push(row.locationId);
    return result;
  }

  /** Makes exactly `locationIds` the member's active locations (others are unassigned). */
  async replace(
    tenantId: string,
    membershipId: string,
    locationIds: string[],
    within: TenantTx,
  ): Promise<void> {
    const keep = [...new Set(locationIds)];
    await this.update(
      tenantId,
      and(
        eq(membershipLocations.membershipId, membershipId),
        eq(membershipLocations.active, true),
        keep.length ? notInArray(membershipLocations.locationId, keep) : undefined,
      )!,
      { active: false },
      within,
    );
    if (keep.length === 0) return;
    await this.run(
      tenantId,
      (tx) =>
        tx
          .insert(membershipLocations)
          .values(keep.map((locationId) => ({ tenantId, membershipId, locationId })))
          .onConflictDoUpdate({
            target: [membershipLocations.membershipId, membershipLocations.locationId],
            set: { active: true, updatedAt: sql`now()` },
          }),
      within,
    );
  }

  /** Unassigns everyone from a location (it was closed); returns the affected memberships. */
  async unassignLocation(tenantId: string, locationId: string, within: TenantTx) {
    const rows = await this.find(
      tenantId,
      and(eq(membershipLocations.locationId, locationId), eq(membershipLocations.active, true)),
      {},
      within,
    );
    await this.update(
      tenantId,
      eq(membershipLocations.locationId, locationId),
      { active: false },
      within,
    );
    return rows.map((r) => r.membershipId);
  }
}
