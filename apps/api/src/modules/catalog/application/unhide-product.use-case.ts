import { Injectable } from "@nestjs/common";
import type { ProductResponse } from "@books/shared";
import { TenantDb } from "../../../common/tenancy/tenant-db";
import { AuditService } from "../../audit/application/audit.service";
import { auditBase, type Actor } from "../../identity/domain/actor";
import { HistoryRepository } from "../infrastructure/history.repository";
import { ProductsRepository } from "../infrastructure/products.repository";
import { assertPermission } from "./access";
import { ProductLock } from "./product-lock";
import { ProductView } from "./product-view";

/**
 * `POST /products/:id/unhide` (manage_products): brings a hidden product back to the status
 * it had (active or waiting). Unhiding a visible product changes nothing.
 */
@Injectable()
export class UnhideProductUseCase {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly lock: ProductLock,
    private readonly products: ProductsRepository,
    private readonly history: HistoryRepository,
    private readonly view: ProductView,
    private readonly audit: AuditService,
  ) {}

  async execute(actor: Actor, id: string): Promise<ProductResponse> {
    const { tenantId, userId } = actor.access;
    assertPermission(actor.access, "manage_products");
    const result = await this.tenantDb.transaction(tenantId, async (t) => {
      const row = await this.lock.live(t, id);
      if (row.status !== "hidden") {
        return { changed: false, product: await this.view.one(actor.access, row, t) };
      }
      const back = row.hiddenFrom ?? "active";
      await this.products.updateById(tenantId, id, { status: back, hiddenFrom: null }, t);
      await this.history.add(
        tenantId,
        id,
        userId,
        [{ action: "unhidden", field: "status", before: "hidden", after: back }],
        t,
      );
      const updated = (await this.products.findById(tenantId, id, t))!;
      return { changed: true, product: await this.view.one(actor.access, updated, t) };
    });
    if (result.changed) {
      await this.audit.record({
        ...auditBase(actor),
        action: "product_unhidden",
        targetId: id,
        details: { before: { status: "hidden" }, after: { status: result.product.status } },
      });
    }
    return { product: result.product };
  }
}
