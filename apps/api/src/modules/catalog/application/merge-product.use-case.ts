import { Injectable } from "@nestjs/common";
import type { ProductResponse } from "@books/shared";
import { TenantDb, type TenantTx } from "../../../common/tenancy/tenant-db";
import { AuditService } from "../../audit/application/audit.service";
import { auditBase, type Actor } from "../../identity/domain/actor";
import { CatalogErrors } from "../domain/catalog-errors";
import { BarcodesRepository } from "../infrastructure/barcodes.repository";
import { HistoryRepository } from "../infrastructure/history.repository";
import { PackUnitsRepository } from "../infrastructure/pack-units.repository";
import { ProductsRepository } from "../infrastructure/products.repository";
import type { ProductRow } from "../infrastructure/tables/products.table";
import { assertPermission } from "./access";
import { ProductChecks } from "./product-checks";
import { ProductMergeMover } from "./product-usage-probe";
import { ProductView } from "./product-view";

/**
 * `POST /products/:id/merge` body `{ intoProductId }` (approve_items): "same as an existing
 * product" (F01 §8). In one transaction the source's barcodes and packs move to the target,
 * the usage hook moves stock and sales (later slices), and the source becomes `merged` with
 * `mergedIntoId`. It cannot be undone (F01 §13.4). Returns the source product.
 * Target must be another active or waiting product of this business.
 */
@Injectable()
export class MergeProductUseCase {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly products: ProductsRepository,
    private readonly packs: PackUnitsRepository,
    private readonly barcodes: BarcodesRepository,
    private readonly checks: ProductChecks,
    private readonly history: HistoryRepository,
    private readonly mover: ProductMergeMover,
    private readonly view: ProductView,
    private readonly audit: AuditService,
  ) {}

  async execute(actor: Actor, id: string, intoProductId: string): Promise<ProductResponse> {
    const { tenantId, userId } = actor.access;
    assertPermission(actor.access, "approve_items");
    const done = await this.tenantDb.transaction(tenantId, async (t) => {
      if (id === intoProductId) throw CatalogErrors.invalidMergeTarget("same_product");
      const locked = await this.products.lockMany(tenantId, [id, intoProductId], t);
      const source = locked.find((p) => p.id === id);
      if (!source) throw CatalogErrors.productNotFound();
      const target = locked.find((p) => p.id === intoProductId);
      if (!target) throw CatalogErrors.invalidMergeTarget("not_found");
      if (source.status === "merged" || source.status === "rejected") {
        throw CatalogErrors.productClosed();
      }
      if (target.status !== "active" && target.status !== "waiting") {
        throw CatalogErrors.invalidMergeTarget(`target_${target.status}`);
      }
      const { moved: movedBarcodes, notMoved } = await this.moveOwnership(t, source, target);
      await this.mover.moveUsage(t, source.id, target.id);
      await this.products.updateById(
        tenantId,
        source.id,
        {
          status: "merged",
          mergedIntoId: target.id,
          hiddenFrom: null,
          decidedByUserId: userId,
          decidedAt: new Date(),
        },
        t,
      );
      await this.history.add(
        tenantId,
        source.id,
        userId,
        [
          {
            action: "merged",
            field: "status",
            before: source.status,
            after: { status: "merged", intoProductId: target.id, intoName: target.name },
          },
        ],
        t,
      );
      await this.history.add(
        tenantId,
        target.id,
        userId,
        [
          {
            action: "merge_received",
            after: { fromProductId: source.id, fromName: source.name, barcodes: movedBarcodes },
          },
        ],
        t,
      );
      if (notMoved.length > 0) {
        await this.history.add(
          tenantId,
          target.id,
          userId,
          [
            {
              action: "merge_barcode_not_moved",
              after: { fromProductId: source.id, fromName: source.name, barcodes: notMoved },
            },
          ],
          t,
        );
      }
      const merged = (await this.products.findById(tenantId, source.id, t))!;
      return {
        product: await this.view.one(actor.access, merged, t),
        target,
        source,
        movedBarcodes,
      };
    });
    await this.audit.record({
      ...auditBase(actor),
      action: "product_merged",
      targetId: id,
      details: {
        before: { status: done.source.status, name: done.source.name },
        after: { status: "merged", intoProductId: done.target.id, intoName: done.target.name },
        barcodes: done.movedBarcodes,
      },
    });
    return { product: done.product };
  }

  /**
   * Moves live packs and barcodes to the target. A pack the target already has (same size and
   * name) is not duplicated: its barcodes join the target's pack. A pack that cannot move
   * (name clash, or the target is not a quantity product) is retired with its barcodes, so a
   * carton code can never start scanning as a single piece. A code the target already
   * carries is simply retired on the source. A manufacturer code that the target could not
   * hold under the F01 §7 sharing rule (another product that is not a condition sibling of the
   * target carries it) is retired on the source too and reported in `notMoved`. Shop codes
   * always move.
   */
  private async moveOwnership(t: TenantTx, source: ProductRow, target: ProductRow) {
    const { tenantId } = t;
    const [sourcePacks, targetPacks, sourceCodes, targetCodes] = await Promise.all([
      this.packs.activeForProduct(tenantId, source.id, t),
      this.packs.activeForProduct(tenantId, target.id, t),
      this.barcodes.activeForProduct(tenantId, source.id, t),
      this.barcodes.activeForProduct(tenantId, target.id, t),
    ]);
    await this.barcodes.lockValues(
      tenantId,
      sourceCodes.map((c) => c.value),
      t,
    );

    const packTarget = new Map<string, string | null>();
    for (const pack of sourcePacks) {
      const twin = targetPacks.find(
        (p) => p.size === pack.size && p.name.toLowerCase() === pack.name.toLowerCase(),
      );
      const nameTaken = targetPacks.some((p) => p.name.toLowerCase() === pack.name.toLowerCase());
      if (twin) {
        packTarget.set(pack.id, twin.id);
        await this.packs.updateById(tenantId, pack.id, { active: false, retiredAt: new Date() }, t);
      } else if (target.trackingType === "quantity" && !nameTaken) {
        packTarget.set(pack.id, pack.id);
        await this.packs.updateById(tenantId, pack.id, { productId: target.id }, t);
      } else {
        packTarget.set(pack.id, null);
        await this.packs.updateById(tenantId, pack.id, { active: false, retiredAt: new Date() }, t);
      }
    }
    const held = new Set(targetCodes.map((c) => c.value));
    const moved: string[] = [];
    const notMoved: string[] = [];
    for (const code of sourceCodes) {
      const newPack = code.packUnitId ? (packTarget.get(code.packUnitId) ?? null) : null;
      if (held.has(code.value) || (code.packUnitId && newPack === null)) {
        await this.barcodes.retireOne(tenantId, code.id, t);
        continue;
      }
      if (code.kind === "manufacturer") {
        const clash = await this.checks.clashes(t, target, [code.value], [source.id, target.id]);
        if (clash.length > 0) {
          await this.barcodes.retireOne(tenantId, code.id, t);
          notMoved.push(code.value);
          continue;
        }
      }
      await this.barcodes.updateById(
        tenantId,
        code.id,
        { productId: target.id, packUnitId: newPack },
        t,
      );
      held.add(code.value);
      moved.push(code.value);
    }
    return { moved, notMoved };
  }
}
