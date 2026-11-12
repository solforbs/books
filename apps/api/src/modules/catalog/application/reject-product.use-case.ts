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
import { ProductUsageProbe, isInUse } from "./product-usage-probe";
import { ProductView } from "./product-view";

/**
 * `POST /products/:id/reject` (approve_items). Only a waiting product with no stock and no
 * sales can be rejected (F01 §8); otherwise it must be merged (`product_in_use`). Its
 * barcodes are released so they can be used again; the product itself stays (G4).
 */
@Injectable()
export class RejectProductUseCase {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly lock: ProductLock,
    private readonly products: ProductsRepository,
    private readonly barcodes: BarcodesRepository,
    private readonly history: HistoryRepository,
    private readonly probe: ProductUsageProbe,
    private readonly view: ProductView,
    private readonly audit: AuditService,
  ) {}

  async execute(actor: Actor, id: string): Promise<ProductResponse> {
    const { tenantId, userId } = actor.access;
    assertPermission(actor.access, "approve_items");
    const product = await this.tenantDb.transaction(tenantId, async (t) => {
      const row = await this.lock.live(t, id);
      if (row.status !== "waiting") throw CatalogErrors.notWaiting();
      const usage = await this.probe.usageOf(tenantId, id);
      if (isInUse(usage)) throw CatalogErrors.productInUse(usage);
      await this.barcodes.retireAllOf(tenantId, id, t);
      await this.products.updateById(
        tenantId,
        id,
        { status: "rejected", decidedByUserId: userId, decidedAt: new Date() },
        t,
      );
      await this.history.add(
        tenantId,
        id,
        userId,
        [{ action: "rejected", field: "status", before: "waiting", after: "rejected" }],
        t,
      );
      return this.view.one(actor.access, (await this.products.findById(tenantId, id, t))!, t);
    });
    await this.audit.record({
      ...auditBase(actor),
      action: "product_rejected",
      targetId: id,
      details: { before: { status: "waiting" }, after: { status: "rejected" } },
    });
    return { product };
  }
}
