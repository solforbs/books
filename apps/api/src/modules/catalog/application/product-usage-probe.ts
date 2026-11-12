import { Injectable } from "@nestjs/common";
import type { TenantTx } from "../../../common/tenancy/tenant-db";
import { StockService } from "../../inventory/application/stock.service";
import { CatalogErrors, type Usage } from "../domain/catalog-errors";

/**
 * F01 section 10: how much stock and how many sales a product already has. Stock comes from
 * the inventory module (pieces on hand plus pieces waiting for their IMEI); sales (F06) do not
 * exist yet, so the count is zero. It decides: hiding (stock only), changing tracking type or
 * base unit, and rejecting a waiting product (stock or sales).
 */
@Injectable()
export class ProductUsageProbe {
  constructor(private readonly stock: StockService) {}

  async usageOf(tenantId: string, productId: string): Promise<Usage> {
    return { stockQuantity: await this.stock.piecesOfProduct(tenantId, productId), saleCount: 0 };
  }
}

export const isInUse = (usage: Usage) => usage.stockQuantity > 0 || usage.saleCount > 0;

/**
 * F01 section 8, 13.4: when a product is merged into another, everything that belongs to it
 * must move to the target. Stock layers, units and movements are append-only records of what
 * was received, so they cannot be re-pointed: a product that ever had stock cannot be merged
 * (409 `product_in_use`) until sales and adjustments exist to settle it. Open question.
 */
@Injectable()
export class ProductMergeMover {
  constructor(private readonly stock: StockService) {}

  async moveUsage(t: TenantTx, fromProductId: string, _intoProductId: string): Promise<void> {
    if (await this.stock.productHasLayers(t.tenantId, fromProductId)) {
      throw CatalogErrors.productInUse({ stockQuantity: 0, saleCount: 0 });
    }
  }
}
