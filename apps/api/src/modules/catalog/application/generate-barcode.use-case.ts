import { Injectable } from "@nestjs/common";
import { shopBarcodeFromSequence, type ProductResponse } from "@books/shared";
import { TenantDb } from "../../../common/tenancy/tenant-db";
import { AuditService } from "../../audit/application/audit.service";
import { auditBase, type Actor } from "../../identity/domain/actor";
import { CatalogErrors } from "../domain/catalog-errors";
import { BarcodeSequencesRepository } from "../infrastructure/barcode-sequences.repository";
import { BarcodesRepository } from "../infrastructure/barcodes.repository";
import { HistoryRepository } from "../infrastructure/history.repository";
import { PackUnitsRepository } from "../infrastructure/pack-units.repository";
import { ProductsRepository } from "../infrastructure/products.repository";
import { hasPermission, notAllowed } from "./access";
import { ProductConflicts } from "./product-conflicts";
import { ProductLock } from "./product-lock";
import { ProductView } from "./product-view";

/** A typed manufacturer code could equal a generated one; skip past such numbers. */
const MAX_ATTEMPTS = 25;

/**
 * `POST /products/:id/barcodes/generate` body `{ packUnitId? }`: gives the product (or one
 * of its packs) its own shop barcode, an EAN-13 starting with 20 (F01 §7). Needs
 * manage_products, or add_products on one's OWN product that is still waiting (so a cashier
 * who quick-added an item can label it). Numbers come from a per-business counter advanced
 * under a row lock, so two requests never get the same code. Asking again for something that
 * already has a shop barcode returns it unchanged.
 */
@Injectable()
export class GenerateBarcodeUseCase {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly lock: ProductLock,
    private readonly products: ProductsRepository,
    private readonly packs: PackUnitsRepository,
    private readonly barcodes: BarcodesRepository,
    private readonly sequences: BarcodeSequencesRepository,
    private readonly conflicts: ProductConflicts,
    private readonly history: HistoryRepository,
    private readonly view: ProductView,
    private readonly audit: AuditService,
  ) {}

  async execute(actor: Actor, id: string, packUnitId?: string): Promise<ProductResponse> {
    const { access } = actor;
    const { tenantId, userId } = access;
    let result;
    try {
      result = await this.tenantDb.transaction(tenantId, async (t) => {
        const row = await this.lock.live(t, id);
        const own = row.status === "waiting" && row.addedByUserId === userId;
        const allowed =
          hasPermission(access, "manage_products") ||
          (own && hasPermission(access, "add_products"));
        if (!allowed) throw notAllowed();
        if (packUnitId) {
          const pack = await this.packs.findOfProduct(tenantId, id, packUnitId, t);
          if (!pack?.active) throw CatalogErrors.packNotFound();
        }
        const existing = (await this.barcodes.activeForProduct(tenantId, id, t)).find(
          (b) => b.kind === "shop" && b.packUnitId === (packUnitId ?? null),
        );
        if (existing) return { value: null, product: await this.view.one(actor.access, row, t) };

        const value = await this.freeCode(tenantId, t);
        // Nothing else was written: commit so the skipped numbers stay skipped, then refuse.
        if (value === null) return { failed: true as const };
        await this.barcodes.create(
          tenantId,
          { productId: id, packUnitId: packUnitId ?? null, value, kind: "shop" },
          t,
        );
        await this.history.add(
          tenantId,
          id,
          userId,
          [
            {
              action: "barcode_generated",
              field: "barcode",
              after: { value, packUnitId: packUnitId ?? null },
            },
          ],
          t,
        );
        const fresh = (await this.products.findById(tenantId, id, t))!;
        return { value, product: await this.view.one(actor.access, fresh, t) };
      });
    } catch (err) {
      throw (await this.conflicts.translate(err, { tenantId })) ?? err;
    }
    if ("failed" in result) throw CatalogErrors.barcodeGenerationFailed();
    if (result.value) {
      await this.audit.record({
        ...auditBase(actor),
        action: "product_barcode_generated",
        targetId: id,
        details: { after: { barcode: result.value, packUnitId: packUnitId ?? null } },
      });
    }
    return { product: result.product };
  }

  /** `null` after MAX_ATTEMPTS occupied numbers; the counter has already moved past them. */
  private async freeCode(tenantId: string, t: Parameters<BarcodesRepository["lockValues"]>[2]) {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const code = shopBarcodeFromSequence(await this.sequences.next(tenantId, t));
      await this.barcodes.lockValues(tenantId, [code], t);
      if ((await this.barcodes.activeByValues(tenantId, [code], t)).length === 0) return code;
    }
    return null;
  }
}
