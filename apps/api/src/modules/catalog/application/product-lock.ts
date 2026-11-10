import { Injectable } from "@nestjs/common";
import type { TenantTx } from "../../../common/tenancy/tenant-db";
import { CatalogErrors } from "../domain/catalog-errors";
import { ProductsRepository } from "../infrastructure/products.repository";
import type { ProductRow } from "../infrastructure/tables/products.table";

/** Locks the product a write is about, so concurrent changes to it happen one after another. */
@Injectable()
export class ProductLock {
  constructor(private readonly products: ProductsRepository) {}

  /** Any product of this business, whatever its status; 404 `product_not_found` otherwise. */
  async any(t: TenantTx, id: string): Promise<ProductRow> {
    const row = await this.products.lockById(t.tenantId, id, t);
    if (!row) throw CatalogErrors.productNotFound();
    return row;
  }

  /** A product that is still in use: not merged or rejected (409 `product_closed`). */
  async live(t: TenantTx, id: string): Promise<ProductRow> {
    const row = await this.any(t, id);
    if (row.status === "merged" || row.status === "rejected") throw CatalogErrors.productClosed();
    return row;
  }
}
