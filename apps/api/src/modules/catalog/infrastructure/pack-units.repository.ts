import { Injectable } from "@nestjs/common";
import { and, asc, eq, inArray } from "drizzle-orm";
import { isUuid } from "../../../common/database/uuid";
import { TenantDb, type TenantTx } from "../../../common/tenancy/tenant-db";
import { TenantScopedRepository } from "../../../common/tenancy/tenant-scoped.repository";
import { productPackUnits, type PackUnitRow } from "./tables/product-pack-units.table";

@Injectable()
export class PackUnitsRepository extends TenantScopedRepository<typeof productPackUnits> {
  constructor(tenantDb: TenantDb) {
    super(tenantDb, productPackUnits);
  }

  forProducts(tenantId: string, productIds: string[], within?: TenantTx): Promise<PackUnitRow[]> {
    const valid = productIds.filter(isUuid);
    if (valid.length === 0) return Promise.resolve([]);
    return this.find(
      tenantId,
      inArray(productPackUnits.productId, valid),
      { orderBy: [asc(productPackUnits.createdAt), asc(productPackUnits.id)] },
      within,
    );
  }

  /** One pack of this product (any status), or null. */
  findOfProduct(tenantId: string, productId: string, packId: string, within?: TenantTx) {
    if (!isUuid(packId)) return Promise.resolve(null);
    return this.findOne(
      tenantId,
      and(eq(productPackUnits.productId, productId), eq(productPackUnits.id, packId)),
      within,
    );
  }

  activeForProduct(tenantId: string, productId: string, within?: TenantTx) {
    return this.find(
      tenantId,
      and(eq(productPackUnits.productId, productId), eq(productPackUnits.active, true)),
      {},
      within,
    );
  }
}
