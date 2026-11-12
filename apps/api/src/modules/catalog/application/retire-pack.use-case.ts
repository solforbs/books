import { Injectable } from "@nestjs/common";
import type { ProductResponse } from "@books/shared";
import { TenantDb } from "../../../common/tenancy/tenant-db";
import { AuditService } from "../../audit/application/audit.service";
import { auditBase, type Actor } from "../../identity/domain/actor";
import { CatalogErrors } from "../domain/catalog-errors";
import { BarcodesRepository } from "../infrastructure/barcodes.repository";
import { HistoryRepository } from "../infrastructure/history.repository";
import { PackUnitsRepository } from "../infrastructure/pack-units.repository";
import type { PackUnitRow } from "../infrastructure/tables/product-pack-units.table";
import { ProductsRepository } from "../infrastructure/products.repository";
import { assertPermission } from "./access";
import { ProductLock } from "./product-lock";
import { ProductView } from "./product-view";

const snapshot = (p: PackUnitRow) => ({
  name: p.name,
  size: p.size,
  wholesalePrice: p.wholesalePrice,
  retailPrice: p.retailPrice,
});

/**
 * `POST /products/:id/packs/:packId/retire` (manage_products). The pack and its barcodes stop
 * being offered; old records keep pointing at it (F01 §10). Retiring a retired pack changes
 * nothing.
 */
@Injectable()
export class RetirePackUseCase {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly lock: ProductLock,
    private readonly products: ProductsRepository,
    private readonly packs: PackUnitsRepository,
    private readonly barcodes: BarcodesRepository,
    private readonly history: HistoryRepository,
    private readonly view: ProductView,
    private readonly audit: AuditService,
  ) {}

  async execute(actor: Actor, id: string, packId: string): Promise<ProductResponse> {
    const { tenantId, userId } = actor.access;
    assertPermission(actor.access, "manage_products");
    const result = await this.tenantDb.transaction(tenantId, async (t) => {
      const row = await this.lock.live(t, id);
      const pack = await this.packs.findOfProduct(tenantId, id, packId, t);
      if (!pack) throw CatalogErrors.packNotFound();
      if (!pack.active)
        return { changed: false, pack, product: await this.view.one(actor.access, row, t) };
      await this.packs.updateById(tenantId, pack.id, { active: false, retiredAt: new Date() }, t);
      await this.barcodes.retireAllOfPack(tenantId, pack.id, t);
      await this.history.add(
        tenantId,
        id,
        userId,
        [{ action: "pack_retired", field: "pack", before: snapshot(pack) }],
        t,
      );
      const fresh = (await this.products.findById(tenantId, id, t))!;
      return { changed: true, pack, product: await this.view.one(actor.access, fresh, t) };
    });
    if (result.changed) {
      await this.audit.record({
        ...auditBase(actor),
        action: "product_pack_retired",
        targetId: id,
        details: { before: snapshot(result.pack) },
      });
    }
    return { product: result.product };
  }
}
