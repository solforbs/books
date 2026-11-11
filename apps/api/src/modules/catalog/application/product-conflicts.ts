import { Injectable } from "@nestjs/common";
import type { AppError } from "../../../common/errors/app-error";
import { isUniqueViolation, pgConstraint } from "../../../common/database/pg-errors";
import { CatalogErrors } from "../domain/catalog-errors";
import { BarcodesRepository } from "../infrastructure/barcodes.repository";
import { ProductsRepository } from "../infrastructure/products.repository";

export interface ConflictContext {
  tenantId: string;
  duplicateKey?: string;
  barcodes?: string[];
}

/**
 * The checks run before every write, but two requests can still race past them. The unique
 * indexes then refuse the second one; this turns that database error into the same API error
 * the check would have given. Returns null for anything it does not recognise.
 */
@Injectable()
export class ProductConflicts {
  constructor(
    private readonly products: ProductsRepository,
    private readonly barcodes: BarcodesRepository,
  ) {}

  async translate(err: unknown, ctx: ConflictContext): Promise<AppError | null> {
    if (!isUniqueViolation(err)) return null;
    const constraint = pgConstraint(err) ?? "";
    if (constraint === "products_duplicate_key_unique" && ctx.duplicateKey) {
      const existing = await this.products.findLiveByDuplicateKey(ctx.tenantId, ctx.duplicateKey);
      if (existing) return CatalogErrors.duplicateProduct(existing.id, existing.name);
    }
    if (constraint.startsWith("product_barcodes_") && ctx.barcodes?.length) {
      const [row] = await this.barcodes.activeByValues(ctx.tenantId, ctx.barcodes);
      const owner = row ? await this.products.findById(ctx.tenantId, row.productId) : null;
      if (row && owner) return CatalogErrors.barcodeInUse(row.value, owner.id, owner.name);
    }
    if (constraint === "product_pack_units_active_name_unique") return CatalogErrors.packExists();
    return null;
  }
}
