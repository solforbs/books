import { Injectable } from "@nestjs/common";
import type { CheckProductResponse } from "@books/shared";
import { TenantDb } from "../../../common/tenancy/tenant-db";
import { BusinessDirectory } from "../../identity/application/business-directory";
import type { Actor } from "../../identity/domain/actor";
import { CatalogErrors } from "../domain/catalog-errors";
import { draftFromCreate } from "../domain/product-draft";
import { CategoriesRepository } from "../infrastructure/categories.repository";
import { assertPermission } from "./access";
import { cleanBarcodes, type CreateProductInput } from "./create-product.use-case";
import { ProductChecks } from "./product-checks";
import { ProductView } from "./product-view";

/**
 * `POST /products/check` (add_products): the duplicate checks of `POST /products` as a dry
 * run, so the form can show the name, the existing product and the similar ones before saving.
 * Writes nothing.
 */
@Injectable()
export class CheckProductUseCase {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly categories: CategoriesRepository,
    private readonly checks: ProductChecks,
    private readonly business: BusinessDirectory,
    private readonly view: ProductView,
  ) {}

  async execute(actor: Actor, input: CreateProductInput): Promise<CheckProductResponse> {
    const { tenantId } = actor.access;
    assertPermission(actor.access, "add_products");
    const vatEnabled = (await this.business.get(tenantId))?.vatEnabled ?? false;
    const barcodes = cleanBarcodes(input.barcodes);
    return this.tenantDb.transaction(tenantId, async (t) => {
      const category = await this.categories.findById(tenantId, input.categoryId, t);
      if (!category || category.hidden) throw CatalogErrors.categoryNotFound(400);
      const draft = draftFromCreate(category, input, vatEnabled);
      const found = await this.checks.run(t, draft, category.namingMode, barcodes);
      const rows = new Map(
        [
          ...(found.exact ? [found.exact] : []),
          ...found.similar,
          ...found.clashes.map((c) => c.product),
        ].map((r) => [r.id, r]),
      );
      const views = await this.view.many(actor.access, [...rows.values()], t);
      const byId = new Map(views.map((p) => [p.id, p]));
      return {
        exactDuplicate: found.exact ? (byId.get(found.exact.id) ?? null) : null,
        similar: found.similar.map((s) => byId.get(s.id)!),
        barcodeClashes: found.clashes.map((c) => ({
          barcode: c.barcode,
          product: byId.get(c.product.id)!,
        })),
        name: draft.name,
      };
    });
  }
}
