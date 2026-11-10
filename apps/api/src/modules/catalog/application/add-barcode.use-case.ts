import { Injectable } from "@nestjs/common";
import type { ProductResponse, addBarcodeRequestSchema } from "@books/shared";
import type { z } from "zod";
import { TenantDb } from "../../../common/tenancy/tenant-db";
import { AuditService } from "../../audit/application/audit.service";
import { auditBase, type Actor } from "../../identity/domain/actor";
import { checkBarcodeValue } from "../domain/barcode-rules";
import { CatalogErrors } from "../domain/catalog-errors";
import { BarcodesRepository } from "../infrastructure/barcodes.repository";
import { HistoryRepository } from "../infrastructure/history.repository";
import { PackUnitsRepository } from "../infrastructure/pack-units.repository";
import { ProductsRepository } from "../infrastructure/products.repository";
import { assertPermission } from "./access";
import { ProductChecks } from "./product-checks";
import { ProductConflicts } from "./product-conflicts";
import { ProductLock } from "./product-lock";
import { ProductView } from "./product-view";

export type AddBarcodeInput = z.output<typeof addBarcodeRequestSchema>;

/**
 * `POST /products/:id/barcodes` (manage_products): adds a manufacturer barcode to the
 * product or one of its packs. Blocked (`barcode_in_use`, naming the owner) when another
 * product carries it, unless both products differ in condition alone (F01 §7, §9). Adding a
 * code the product already carries changes nothing.
 */
@Injectable()
export class AddBarcodeUseCase {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly lock: ProductLock,
    private readonly products: ProductsRepository,
    private readonly packs: PackUnitsRepository,
    private readonly barcodes: BarcodesRepository,
    private readonly checks: ProductChecks,
    private readonly conflicts: ProductConflicts,
    private readonly history: HistoryRepository,
    private readonly view: ProductView,
    private readonly audit: AuditService,
  ) {}

  async execute(actor: Actor, id: string, input: AddBarcodeInput): Promise<ProductResponse> {
    const { tenantId, userId } = actor.access;
    assertPermission(actor.access, "manage_products");
    const check = checkBarcodeValue(input.value);
    if (!check.ok) throw CatalogErrors.invalidBarcode(check.reason);
    const value = check.value;
    let result;
    try {
      result = await this.tenantDb.transaction(tenantId, async (t) => {
        const row = await this.lock.live(t, id);
        if (input.packUnitId) {
          const pack = await this.packs.findOfProduct(tenantId, id, input.packUnitId, t);
          if (!pack?.active) throw CatalogErrors.packNotFound();
        }
        await this.barcodes.lockValues(tenantId, [value], t);
        const [owned] = (await this.barcodes.activeByValues(tenantId, [value], t)).filter(
          (b) => b.productId === id,
        );
        if (owned) return { added: false, product: await this.view.one(tenantId, row, t) };
        const clash = (await this.checks.clashes(t, row, [value], id))[0];
        if (clash) {
          throw CatalogErrors.barcodeInUse(clash.barcode, clash.product.id, clash.product.name);
        }
        await this.barcodes.create(
          tenantId,
          { productId: id, packUnitId: input.packUnitId ?? null, value, kind: "manufacturer" },
          t,
        );
        await this.history.add(
          tenantId,
          id,
          userId,
          [
            {
              action: "barcode_added",
              field: "barcode",
              after: { value, packUnitId: input.packUnitId ?? null },
            },
          ],
          t,
        );
        const fresh = (await this.products.findById(tenantId, id, t))!;
        return { added: true, product: await this.view.one(tenantId, fresh, t) };
      });
    } catch (err) {
      throw (await this.conflicts.translate(err, { tenantId, barcodes: [value] })) ?? err;
    }
    if (result.added) {
      await this.audit.record({
        ...auditBase(actor),
        action: "product_barcode_added",
        targetId: id,
        details: { after: { barcode: value, packUnitId: input.packUnitId ?? null } },
      });
    }
    return { product: result.product };
  }
}
