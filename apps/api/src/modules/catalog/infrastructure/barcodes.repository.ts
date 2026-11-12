import { Injectable } from "@nestjs/common";
import { and, eq, inArray, sql } from "drizzle-orm";
import { normalizeBarcode } from "@books/shared";
import { isUuid } from "../../../common/database/uuid";
import { TenantDb, type TenantTx } from "../../../common/tenancy/tenant-db";
import { TenantScopedRepository } from "../../../common/tenancy/tenant-scoped.repository";
import { productBarcodes, type BarcodeRow } from "./tables/product-barcodes.table";

@Injectable()
export class BarcodesRepository extends TenantScopedRepository<typeof productBarcodes> {
  constructor(tenantDb: TenantDb) {
    super(tenantDb, productBarcodes);
  }

  /**
   * Holds a per-code advisory lock until the transaction ends. Two requests claiming the same
   * code are serialised, so the clash check and the insert cannot interleave. Codes are
   * locked in sorted order, so two requests with several codes cannot deadlock.
   */
  async lockValues(tenantId: string, values: string[], within: TenantTx): Promise<void> {
    // Callers already normalise; doing it again here keeps the lock key case-blind regardless.
    const ordered = [...new Set(values.map(normalizeBarcode))].sort();
    for (const value of ordered) {
      await within.tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`barcode:${tenantId}:${value}`}, 0))`,
      );
    }
  }

  /** Live (active) barcode rows carrying any of these values. */
  activeByValues(tenantId: string, values: string[], within?: TenantTx): Promise<BarcodeRow[]> {
    if (values.length === 0) return Promise.resolve([]);
    return this.find(
      tenantId,
      and(
        inArray(productBarcodes.value, values.map(normalizeBarcode)),
        eq(productBarcodes.active, true),
      ),
      {},
      within,
    );
  }

  forProducts(tenantId: string, productIds: string[], within?: TenantTx): Promise<BarcodeRow[]> {
    const valid = productIds.filter(isUuid);
    if (valid.length === 0) return Promise.resolve([]);
    return this.find(
      tenantId,
      inArray(productBarcodes.productId, valid),
      { orderBy: [sql`${productBarcodes.createdAt} asc`, sql`${productBarcodes.id} asc`] },
      within,
    );
  }

  activeForProduct(tenantId: string, productId: string, within?: TenantTx) {
    return this.find(
      tenantId,
      and(eq(productBarcodes.productId, productId), eq(productBarcodes.active, true)),
      {},
      within,
    );
  }

  /** Stops one barcode being used. The row stays (G4). */
  retireOne(tenantId: string, id: string, within: TenantTx): Promise<number> {
    return this.updateById(tenantId, id, { active: false, retiredAt: new Date() }, within);
  }

  /** Releases every live barcode of a product (a rejected product frees its codes). */
  retireAllOf(tenantId: string, productId: string, within: TenantTx): Promise<number> {
    return this.update(
      tenantId,
      and(eq(productBarcodes.productId, productId), eq(productBarcodes.active, true))!,
      { active: false, retiredAt: new Date() },
      within,
    );
  }

  /** Retires the live barcodes of one pack unit (the pack was retired). */
  retireAllOfPack(tenantId: string, packUnitId: string, within: TenantTx): Promise<number> {
    return this.update(
      tenantId,
      and(eq(productBarcodes.packUnitId, packUnitId), eq(productBarcodes.active, true))!,
      { active: false, retiredAt: new Date() },
      within,
    );
  }
}
