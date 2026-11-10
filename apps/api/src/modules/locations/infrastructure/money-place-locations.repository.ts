import { Injectable } from "@nestjs/common";
import { and, asc, eq, inArray, notInArray, sql } from "drizzle-orm";
import { isUuid } from "../../../common/database/uuid";
import { TenantDb, type TenantTx } from "../../../common/tenancy/tenant-db";
import { TenantScopedRepository } from "../../../common/tenancy/tenant-scoped.repository";
import { moneyPlaceLocations } from "./tables/money-place-locations.table";

/** Money place to location links. Unlinking flips `active`; nothing is deleted (G4). */
@Injectable()
export class MoneyPlaceLocationsRepository extends TenantScopedRepository<
  typeof moneyPlaceLocations
> {
  constructor(tenantDb: TenantDb) {
    super(tenantDb, moneyPlaceLocations);
  }

  /** Active location ids per money place (every place of the business when `placeIds` is null). */
  async activeByPlace(
    tenantId: string,
    placeIds: string[] | null,
    within?: TenantTx,
  ): Promise<Map<string, string[]>> {
    const ids = placeIds?.filter(isUuid) ?? null;
    if (ids && ids.length === 0) return new Map();
    const rows = await this.find(
      tenantId,
      and(
        eq(moneyPlaceLocations.active, true),
        ids ? inArray(moneyPlaceLocations.moneyPlaceId, ids) : undefined,
      ),
      { orderBy: [asc(moneyPlaceLocations.createdAt), asc(moneyPlaceLocations.id)] },
      within,
    );
    const result = new Map<string, string[]>();
    for (const row of rows) {
      result.set(row.moneyPlaceId, [...(result.get(row.moneyPlaceId) ?? []), row.locationId]);
    }
    return result;
  }

  /** Makes exactly `locationIds` the place's active links (others are unlinked). */
  async replace(
    tenantId: string,
    moneyPlaceId: string,
    locationIds: string[],
    within: TenantTx,
  ): Promise<void> {
    const keep = [...new Set(locationIds)];
    await this.update(
      tenantId,
      and(
        eq(moneyPlaceLocations.moneyPlaceId, moneyPlaceId),
        eq(moneyPlaceLocations.active, true),
        keep.length ? notInArray(moneyPlaceLocations.locationId, keep) : undefined,
      )!,
      { active: false },
      within,
    );
    if (keep.length === 0) return;
    await this.run(
      tenantId,
      (tx) =>
        tx
          .insert(moneyPlaceLocations)
          .values(keep.map((locationId) => ({ tenantId, moneyPlaceId, locationId })))
          .onConflictDoUpdate({
            target: [moneyPlaceLocations.moneyPlaceId, moneyPlaceLocations.locationId],
            set: { active: true, updatedAt: sql`now()` },
          }),
      within,
    );
  }
}
