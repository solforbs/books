import { Injectable } from "@nestjs/common";
import type { TenantTx } from "../../../common/tenancy/tenant-db";
import { PackUnitsRepository } from "../infrastructure/pack-units.repository";
import { ProductsRepository } from "../infrastructure/products.repository";
import type { PackUnitRow } from "../infrastructure/tables/product-pack-units.table";
import type { ProductRow } from "../infrastructure/tables/products.table";

/**
 * Public read interface of the catalog for other modules (receiving, stock). They never touch
 * the product tables; they ask here by id.
 */
@Injectable()
export class ProductDirectory {
  constructor(
    private readonly products: ProductsRepository,
    private readonly packs: PackUnitsRepository,
  ) {}

  byIds(tenantId: string, ids: string[], within?: TenantTx): Promise<ProductRow[]> {
    return this.products.findManyByIds(tenantId, ids, within);
  }

  /** Every pack unit (active or retired) of these products. */
  packsOf(tenantId: string, productIds: string[], within?: TenantTx): Promise<PackUnitRow[]> {
    return this.packs.forProducts(tenantId, productIds, within);
  }

  /** The products among `ids` that match the search words and category, ordered by name. */
  matchingAmong(
    tenantId: string,
    ids: string[],
    filter: { q?: string; categoryId?: string },
    within?: TenantTx,
  ): Promise<ProductRow[]> {
    return this.products.searchAmong(tenantId, ids, filter, within);
  }
}
