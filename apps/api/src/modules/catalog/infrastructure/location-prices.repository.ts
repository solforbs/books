import { Injectable } from "@nestjs/common";
import { and, eq, inArray } from "drizzle-orm";
import { isUuid } from "../../../common/database/uuid";
import { TenantDb, type TenantTx } from "../../../common/tenancy/tenant-db";
import { TenantScopedRepository } from "../../../common/tenancy/tenant-scoped.repository";
import { inScope, type LocationScope } from "../../locations/domain/location-scope";
import {
  productLocationPrices,
  type LocationPriceRow,
} from "./tables/product-location-prices.table";

export interface LocationPriceValue {
  locationId: string;
  retailPrice: number | null;
  wholesalePrice: number | null;
}

@Injectable()
export class LocationPricesRepository extends TenantScopedRepository<typeof productLocationPrices> {
  constructor(tenantDb: TenantDb) {
    super(tenantDb, productLocationPrices);
  }

  forProducts(
    tenantId: string,
    productIds: string[],
    within?: TenantTx,
  ): Promise<LocationPriceRow[]> {
    const valid = productIds.filter(isUuid);
    if (valid.length === 0) return Promise.resolve([]);
    return this.find(tenantId, inArray(productLocationPrices.productId, valid), {}, within);
  }

  /**
   * Makes the stored prices equal `wanted`: new locations are added, changed ones updated,
   * and a location that is no longer wanted keeps its row with both prices cleared (G4).
   * Only locations inside `scope` are cleared; rows outside it are left untouched.
   */
  async replace(
    tenantId: string,
    productId: string,
    wanted: LocationPriceValue[],
    within: TenantTx,
    scope: LocationScope,
  ): Promise<void> {
    const current = await this.forProducts(tenantId, [productId], within);
    const byLocation = new Map(current.map((r) => [r.locationId, r]));
    const wantedIds = new Set(wanted.map((w) => w.locationId));
    for (const w of wanted) {
      const existing = byLocation.get(w.locationId);
      if (existing) {
        await this.updateById(
          tenantId,
          existing.id,
          { retailPrice: w.retailPrice, wholesalePrice: w.wholesalePrice },
          within,
        );
      } else {
        await this.create(tenantId, { productId, ...w }, within);
      }
    }
    for (const old of current) {
      if (
        inScope(scope, old.locationId) &&
        !wantedIds.has(old.locationId) &&
        (old.retailPrice !== null || old.wholesalePrice !== null)
      ) {
        await this.update(
          tenantId,
          and(eq(productLocationPrices.id, old.id))!,
          { retailPrice: null, wholesalePrice: null },
          within,
        );
      }
    }
  }
}
