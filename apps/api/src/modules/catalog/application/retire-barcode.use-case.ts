import { Injectable } from "@nestjs/common";
import type { ProductResponse } from "@books/shared";
import { TenantDb } from "../../../common/tenancy/tenant-db";
import { AuditService } from "../../audit/application/audit.service";
import { auditBase, type Actor } from "../../identity/domain/actor";
import { CatalogErrors } from "../domain/catalog-errors";
import { BarcodesRepository } from "../infrastructure/barcodes.repository";
import { HistoryRepository } from "../infrastructure/history.repository";
import { ProductsRepository } from "../infrastructure/products.repository";
import { assertPermission } from "./access";
import { ProductLock } from "./product-lock";
import { ProductView } from "./product-view";

/**
 * `POST /products/:id/barcodes/:barcodeId/retire` (manage_products): the code stops being
 * found by scans and becomes free for another product; the row stays (G4). Retiring a
 * retired barcode changes nothing.
 */
@Injectable()
export class RetireBarcodeUseCase {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly lock: ProductLock,
    private readonly products: ProductsRepository,
    private readonly barcodes: BarcodesRepository,
    private readonly history: HistoryRepository,
    private readonly view: ProductView,
    private readonly audit: AuditService,
  ) {}

  async execute(actor: Actor, id: string, barcodeId: string): Promise<ProductResponse> {
    const { tenantId, userId } = actor.access;
    assertPermission(actor.access, "manage_products");
    const result = await this.tenantDb.transaction(tenantId, async (t) => {
      const row = await this.lock.live(t, id);
      const code = (await this.barcodes.forProducts(tenantId, [id], t)).find(
        (b) => b.id === barcodeId,
      );
      if (!code) throw CatalogErrors.barcodeNotFound();
      if (!code.active) return { value: null, product: await this.view.one(tenantId, row, t) };
      await this.barcodes.retireOne(tenantId, code.id, t);
      await this.history.add(
        tenantId,
        id,
        userId,
        [{ action: "barcode_retired", field: "barcode", before: { value: code.value } }],
        t,
      );
      const fresh = (await this.products.findById(tenantId, id, t))!;
      return { value: code.value, product: await this.view.one(tenantId, fresh, t) };
    });
    if (result.value) {
      await this.audit.record({
        ...auditBase(actor),
        action: "product_barcode_retired",
        targetId: id,
        details: { before: { barcode: result.value } },
      });
    }
    return { product: result.product };
  }
}
