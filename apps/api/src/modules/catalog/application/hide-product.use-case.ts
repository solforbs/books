import { Injectable } from "@nestjs/common";
import type { ProductResponse } from "@books/shared";
import { TenantDb } from "../../../common/tenancy/tenant-db";
import { AuditService } from "../../audit/application/audit.service";
import { auditBase, type Actor } from "../../identity/domain/actor";
import { CatalogErrors } from "../domain/catalog-errors";
import { HistoryRepository } from "../infrastructure/history.repository";
import { ProductsRepository } from "../infrastructure/products.repository";
import { assertPermission } from "./access";
import { ProductLock } from "./product-lock";
import { ProductUsageProbe } from "./product-usage-probe";
import { ProductView } from "./product-view";

/**
 * `POST /products/:id/hide` (manage_products). Hidden products leave search and selling but
 * stay in old sales and reports (F01 §10). Refused while stock remains (`product_has_stock`).
 * Hiding a hidden product changes nothing. A waiting product stays waiting underneath.
 */
@Injectable()
export class HideProductUseCase {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly lock: ProductLock,
    private readonly products: ProductsRepository,
    private readonly history: HistoryRepository,
    private readonly probe: ProductUsageProbe,
    private readonly view: ProductView,
    private readonly audit: AuditService,
  ) {}

  async execute(actor: Actor, id: string): Promise<ProductResponse> {
    const { tenantId, userId } = actor.access;
    assertPermission(actor.access, "manage_products");
    const result = await this.tenantDb.transaction(tenantId, async (t) => {
      const row = await this.lock.live(t, id);
      if (row.status === "hidden") {
        return { changed: false, product: await this.view.one(tenantId, row, t) };
      }
      const usage = await this.probe.usageOf(tenantId, id);
      if (usage.stockQuantity > 0) throw CatalogErrors.productHasStock(usage.stockQuantity);
      const hiddenFrom = row.status === "waiting" ? "waiting" : "active";
      await this.products.updateById(tenantId, id, { status: "hidden", hiddenFrom }, t);
      await this.history.add(
        tenantId,
        id,
        userId,
        [{ action: "hidden", field: "status", before: row.status, after: "hidden" }],
        t,
      );
      const updated = (await this.products.findById(tenantId, id, t))!;
      return { changed: true, product: await this.view.one(tenantId, updated, t) };
    });
    if (result.changed) {
      await this.audit.record({
        ...auditBase(actor),
        action: "product_hidden",
        targetId: id,
        details: { before: { status: "visible" }, after: { status: "hidden" } },
      });
    }
    return { product: result.product };
  }
}
