import { Injectable } from "@nestjs/common";
import type { TenantTx } from "../../../common/tenancy/tenant-db";
import { canShareManufacturerBarcode, type SharingSubject } from "../domain/barcode-rules";
import type { NamingMode, ProductDraft } from "../domain/product-draft";
import { isSimilar } from "../domain/similarity";
import { BarcodesRepository } from "../infrastructure/barcodes.repository";
import { LIVE_STATUSES, ProductsRepository } from "../infrastructure/products.repository";
import type { ProductRow } from "../infrastructure/tables/products.table";

export interface CheckResult {
  exact: ProductRow | null;
  similar: ProductRow[];
  clashes: { barcode: string; product: ProductRow }[];
}

const MAX_SIMILAR = 5;

/**
 * The duplicate checks of F01 §9, in one place for create, update and the dry run:
 * exact duplicate, similar names/models, barcode clashes. Read-only; the caller decides
 * what to refuse. Callers that write must hold the barcode locks first (`lockValues`).
 */
@Injectable()
export class ProductChecks {
  constructor(
    private readonly products: ProductsRepository,
    private readonly barcodes: BarcodesRepository,
  ) {}

  async run(
    t: TenantTx,
    draft: ProductDraft,
    mode: NamingMode,
    barcodeValues: string[],
    selfId?: string,
  ): Promise<CheckResult> {
    const live = await this.products.findLiveByDuplicateKey(t.tenantId, draft.duplicateKey, t);
    const exact = live && live.id !== selfId ? live : null;
    return {
      exact,
      similar: await this.similar(t, draft, mode, selfId, exact?.id),
      clashes: await this.clashes(t, draft, barcodeValues, selfId),
    };
  }

  private async similar(
    t: TenantTx,
    draft: ProductDraft,
    mode: NamingMode,
    selfId?: string,
    exactId?: string,
  ): Promise<ProductRow[]> {
    const candidate = { ...draft, id: selfId ?? "new", namingMode: mode };
    const pool = await this.products.similarityPool(t.tenantId, t);
    const ids = pool
      .filter((c) => c.id !== exactId && isSimilar(candidate, c))
      .map((c) => c.id)
      .slice(0, MAX_SIMILAR);
    return this.products.findManyByIds(t.tenantId, ids, t);
  }

  /** One clash per barcode (products in `selfId` never clash with themselves): a shop code, or a manufacturer code held by a product that may not share it. */
  async clashes(
    t: TenantTx,
    draft: SharingSubject,
    values: string[],
    selfId?: string | readonly string[],
  ): Promise<CheckResult["clashes"]> {
    const own = new Set(typeof selfId === "string" ? [selfId] : selfId);
    const held = await this.barcodes.activeByValues(t.tenantId, values, t);
    const owners = await this.products.findManyByIds(
      t.tenantId,
      held.map((h) => h.productId),
      t,
    );
    const ownerById = new Map(owners.map((o) => [o.id, o]));
    const clashes = new Map<string, ProductRow>();
    for (const row of held) {
      const owner = ownerById.get(row.productId);
      if (!owner || own.has(owner.id) || !LIVE_STATUSES.includes(owner.status)) continue;
      if (row.kind === "shop" || !canShareManufacturerBarcode(owner, draft)) {
        if (!clashes.has(row.value)) clashes.set(row.value, owner);
      }
    }
    return [...clashes].map(([barcode, product]) => ({ barcode, product }));
  }
}
