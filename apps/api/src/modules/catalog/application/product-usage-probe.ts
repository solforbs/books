import { Injectable } from "@nestjs/common";
import type { TenantTx } from "../../../common/tenancy/tenant-db";
import type { Usage } from "../domain/catalog-errors";

/**
 * EXTENSION POINT (F01 §10): how much stock and how many sales a product already has.
 * Stock arrives with F04 and sales with F06, so until then nothing is in use and the
 * default reports zeros. Those slices replace this provider
 * (`{ provide: ProductUsageProbe, useClass: ... }`) with one that asks the inventory and
 * sales modules. It decides: hiding (stock only), changing tracking type or base unit,
 * and rejecting a waiting product (stock or sales).
 */
@Injectable()
export class ProductUsageProbe {
  async usageOf(_tenantId: string, _productId: string): Promise<Usage> {
    return { stockQuantity: 0, saleCount: 0 };
  }
}

export const isInUse = (usage: Usage) => usage.stockQuantity > 0 || usage.saleCount > 0;

/**
 * EXTENSION POINT (F01 §8, §13.4): when a product is merged into another, everything that
 * belongs to it (stock, IMEIs, sales) must move to the target in the same transaction.
 * Barcodes, packs and history are moved by the catalog itself; stock and sales will be moved
 * by the modules that own them. Nothing exists to move yet.
 */
@Injectable()
export class ProductMergeMover {
  async moveUsage(_t: TenantTx, _fromProductId: string, _intoProductId: string): Promise<void> {
    return;
  }
}
