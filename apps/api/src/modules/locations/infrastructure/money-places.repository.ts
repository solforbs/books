import { Injectable } from "@nestjs/common";
import { asc, inArray } from "drizzle-orm";
import { isUuid } from "../../../common/database/uuid";
import { TenantDb, type TenantTx } from "../../../common/tenancy/tenant-db";
import { TenantScopedRepository } from "../../../common/tenancy/tenant-scoped.repository";
import { moneyPlaces, type MoneyPlaceRow } from "./tables/money-places.table";

@Injectable()
export class MoneyPlacesRepository extends TenantScopedRepository<typeof moneyPlaces> {
  constructor(tenantDb: TenantDb) {
    super(tenantDb, moneyPlaces);
  }

  all(tenantId: string, within?: TenantTx) {
    return this.find(
      tenantId,
      undefined,
      { orderBy: [asc(moneyPlaces.createdAt), asc(moneyPlaces.id)] },
      within,
    );
  }

  /** The cash drawers of these locations, keyed by location id. */
  async drawersOf(
    tenantId: string,
    locationIds: string[],
    within?: TenantTx,
  ): Promise<Map<string, MoneyPlaceRow>> {
    const ids = locationIds.filter(isUuid);
    if (ids.length === 0) return new Map();
    const rows = await this.find(tenantId, inArray(moneyPlaces.drawerLocationId, ids), {}, within);
    return new Map(rows.map((r) => [r.drawerLocationId!, r]));
  }
}
