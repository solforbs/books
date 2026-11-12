import { Injectable } from "@nestjs/common";
import type { ProductResponse } from "@books/shared";
import { TenantDb } from "../../../common/tenancy/tenant-db";
import { AuditService } from "../../audit/application/audit.service";
import { BusinessDirectory } from "../../identity/application/business-directory";
import { auditBase, type Actor } from "../../identity/domain/actor";
import { CatalogErrors } from "../domain/catalog-errors";
import { HistoryRepository } from "../infrastructure/history.repository";
import { ProductsRepository } from "../infrastructure/products.repository";
import { assertPermission } from "./access";
import { ProductConflicts } from "./product-conflicts";
import { ProductEditor, type UpdateInput } from "./product-editor";
import { ProductLock } from "./product-lock";
import { ProductView } from "./product-view";

/**
 * `POST /products/:id/approve` (approve_items). A waiting product becomes active, after
 * optional fixes of name, category, price and so on (F01 §8; the same rules as an update,
 * so price fixes need `set_prices`). An active product needs a price: if the product has
 * none yet, the approver must send one (`validation_failed` on `retailPrice`).
 */
@Injectable()
export class ApproveProductUseCase {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly lock: ProductLock,
    private readonly editor: ProductEditor,
    private readonly products: ProductsRepository,
    private readonly history: HistoryRepository,
    private readonly conflicts: ProductConflicts,
    private readonly business: BusinessDirectory,
    private readonly view: ProductView,
    private readonly audit: AuditService,
  ) {}

  async execute(actor: Actor, id: string, fixes: Partial<UpdateInput>): Promise<ProductResponse> {
    const { tenantId, userId } = actor.access;
    assertPermission(actor.access, "approve_items");
    const vatEnabled = (await this.business.get(tenantId))?.vatEnabled ?? false;
    let result;
    try {
      result = await this.tenantDb.transaction(tenantId, async (t) => {
        const row = await this.lock.live(t, id);
        if (row.status !== "waiting") throw CatalogErrors.notWaiting();
        const { changes } = await this.editor.apply(
          actor,
          t,
          row,
          fixes as UpdateInput,
          vatEnabled,
        );
        const fixed = (await this.products.findById(tenantId, id, t))!;
        if (fixed.retailPrice === null)
          throw CatalogErrors.fieldRequired("retailPrice", "price_required");
        await this.products.updateById(
          tenantId,
          id,
          { status: "active", decidedByUserId: userId, decidedAt: new Date() },
          t,
        );
        await this.history.add(
          tenantId,
          id,
          userId,
          [{ action: "approved", field: "status", before: "waiting", after: "active" }],
          t,
        );
        const approved = (await this.products.findById(tenantId, id, t))!;
        return { changes, product: await this.view.one(actor.access, approved, t) };
      });
    } catch (err) {
      throw (await this.conflicts.translate(err, { tenantId })) ?? err;
    }
    await this.audit.record({
      ...auditBase(actor),
      action: "product_approved",
      targetId: id,
      details: {
        before: { status: "waiting" },
        after: { status: "active" },
        fixes: result.changes,
      },
    });
    return { product: result.product };
  }
}
