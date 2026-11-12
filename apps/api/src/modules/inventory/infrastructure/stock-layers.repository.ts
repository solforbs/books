import { Injectable } from "@nestjs/common";
import { asc, eq, inArray } from "drizzle-orm";
import { isUuid } from "../../../common/database/uuid";
import { TenantDb, type TenantTx } from "../../../common/tenancy/tenant-db";
import { TenantScopedRepository } from "../../../common/tenancy/tenant-scoped.repository";
import { stockLayers, type StockLayerRow } from "./tables/stock-layers.table";

@Injectable()
export class StockLayersRepository extends TenantScopedRepository<typeof stockLayers> {
  constructor(tenantDb: TenantDb) {
    super(tenantDb, stockLayers);
  }

  findManyByIds(tenantId: string, ids: string[], within?: TenantTx): Promise<StockLayerRow[]> {
    const valid = ids.filter(isUuid);
    if (valid.length === 0) return Promise.resolve([]);
    return this.find(tenantId, inArray(stockLayers.id, valid), {}, within);
  }

  countForProduct(tenantId: string, productId: string, within?: TenantTx): Promise<number> {
    if (!isUuid(productId)) return Promise.resolve(0);
    return this.count(tenantId, eq(stockLayers.productId, productId), within);
  }

  /** Locks layers in one fixed order (no deadlock between two commands on the same delivery). */
  lockManyByIds(tenantId: string, ids: string[], within: TenantTx): Promise<StockLayerRow[]> {
    const valid = ids.filter(isUuid);
    if (valid.length === 0) return Promise.resolve([]);
    return this.run(
      tenantId,
      (tx) =>
        tx
          .select()
          .from(stockLayers)
          .where(this.scope(tenantId, inArray(stockLayers.id, valid)))
          .orderBy(asc(stockLayers.id))
          .for("update"),
      within,
    );
  }
}
