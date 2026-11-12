import { Injectable } from "@nestjs/common";
import type { ProductResponse } from "@books/shared";
import { TenantDb } from "../../../common/tenancy/tenant-db";
import { AuditService } from "../../audit/application/audit.service";
import { BusinessDirectory } from "../../identity/application/business-directory";
import { auditBase, type Actor } from "../../identity/domain/actor";
import { ProductsRepository } from "../infrastructure/products.repository";
import { assertPermission } from "./access";
import { ProductConflicts } from "./product-conflicts";
import { ProductEditor, type UpdateInput } from "./product-editor";
import { ProductLock } from "./product-lock";
import { ProductView } from "./product-view";

/**
 * `PATCH /products/:id` (manage_products; price fields also need set_prices). Fields not
 * sent stay as they are. Past sales keep their price; the history records every change.
 */
@Injectable()
export class UpdateProductUseCase {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly lock: ProductLock,
    private readonly editor: ProductEditor,
    private readonly products: ProductsRepository,
    private readonly conflicts: ProductConflicts,
    private readonly business: BusinessDirectory,
    private readonly view: ProductView,
    private readonly audit: AuditService,
  ) {}

  async execute(actor: Actor, id: string, patch: UpdateInput): Promise<ProductResponse> {
    const { tenantId } = actor.access;
    assertPermission(actor.access, "manage_products");
    const vatEnabled = (await this.business.get(tenantId))?.vatEnabled ?? false;
    let result;
    try {
      result = await this.tenantDb.transaction(tenantId, async (t) => {
        const current = await this.lock.live(t, id);
        const { changes } = await this.editor.apply(actor, t, current, patch, vatEnabled);
        const updated = (await this.products.findById(tenantId, id, t))!;
        return { changes, product: await this.view.one(actor.access, updated, t) };
      });
    } catch (err) {
      throw (await this.conflicts.translate(err, { tenantId })) ?? err;
    }
    if (result.changes.length > 0) {
      await this.audit.record({
        ...auditBase(actor),
        action: "product_updated",
        targetId: id,
        details: { changes: result.changes },
      });
    }
    return { product: result.product };
  }
}
