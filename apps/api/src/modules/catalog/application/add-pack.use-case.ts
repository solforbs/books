import { Injectable } from "@nestjs/common";
import type { PackUnitInput, ProductResponse } from "@books/shared";
import { TenantDb } from "../../../common/tenancy/tenant-db";
import { AuditService } from "../../audit/application/audit.service";
import { auditBase, type Actor } from "../../identity/domain/actor";
import { CatalogErrors } from "../domain/catalog-errors";
import { HistoryRepository } from "../infrastructure/history.repository";
import { PackUnitsRepository } from "../infrastructure/pack-units.repository";
import { ProductsRepository } from "../infrastructure/products.repository";
import { assertPermission, hasPermission, notAllowed } from "./access";
import { ProductConflicts } from "./product-conflicts";
import { ProductLock } from "./product-lock";
import { ProductView } from "./product-view";

/**
 * `POST /products/:id/packs` (manage_products; pack prices also need set_prices): adds a box
 * or carton. Phones and serial products are sold one by one (`packs_not_allowed`, F01 §13.13).
 * A pack's size is never edited: to change it, retire the pack and add a new one (F01 §10).
 */
@Injectable()
export class AddPackUseCase {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly lock: ProductLock,
    private readonly products: ProductsRepository,
    private readonly packs: PackUnitsRepository,
    private readonly conflicts: ProductConflicts,
    private readonly history: HistoryRepository,
    private readonly view: ProductView,
    private readonly audit: AuditService,
  ) {}

  async execute(actor: Actor, id: string, input: PackUnitInput): Promise<ProductResponse> {
    const { tenantId, userId } = actor.access;
    assertPermission(actor.access, "manage_products");
    if (
      (input.retailPrice != null || input.wholesalePrice != null) &&
      !hasPermission(actor.access, "set_prices")
    ) {
      throw notAllowed();
    }
    const name = input.name.replace(/\s+/g, " ").trim();
    let product;
    try {
      product = await this.tenantDb.transaction(tenantId, async (t) => {
        const row = await this.lock.live(t, id);
        if (row.trackingType !== "quantity") throw CatalogErrors.packsNotAllowed();
        const taken = (await this.packs.activeForProduct(tenantId, id, t)).some(
          (p) => p.name.toLowerCase() === name.toLowerCase(),
        );
        if (taken) throw CatalogErrors.packExists();
        await this.packs.create(
          tenantId,
          {
            productId: id,
            name,
            size: input.size,
            retailPrice: input.retailPrice ?? null,
            wholesalePrice: input.wholesalePrice ?? null,
          },
          t,
        );
        await this.history.add(
          tenantId,
          id,
          userId,
          [{ action: "pack_added", field: "pack", after: { name, size: input.size } }],
          t,
        );
        const fresh = (await this.products.findById(tenantId, id, t))!;
        return this.view.one(tenantId, fresh, t);
      });
    } catch (err) {
      throw (await this.conflicts.translate(err, { tenantId })) ?? err;
    }
    await this.audit.record({
      ...auditBase(actor),
      action: "product_pack_added",
      targetId: id,
      details: { after: { name, size: input.size } },
    });
    return { product };
  }
}
