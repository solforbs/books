import { Injectable } from "@nestjs/common";
import {
  cleanText,
  normalizeForCompare,
  type CategoryResponse,
  type updateCategoryRequestSchema,
} from "@books/shared";
import type { z } from "zod";
import { isUniqueViolation } from "../../../common/database/pg-errors";
import { TenantDb } from "../../../common/tenancy/tenant-db";
import { AuditService } from "../../audit/application/audit.service";
import { auditBase, type Actor } from "../../identity/domain/actor";
import { CatalogErrors } from "../domain/catalog-errors";
import { CategoriesRepository } from "../infrastructure/categories.repository";
import { ProductsRepository } from "../infrastructure/products.repository";
import type { CategoryRow } from "../infrastructure/tables/product-categories.table";
import { toCategory } from "./category-view";

export type UpdateCategoryInput = z.output<typeof updateCategoryRequestSchema>;

/**
 * `PATCH /product-categories/:id` (manage_products). A category with active or waiting
 * products cannot be hidden (`category_in_use`, F01 §13.10); the row is locked while that is
 * checked, so no product can be added to it in the meantime. Categories are never deleted.
 */
@Injectable()
export class UpdateCategoryUseCase {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly categories: CategoriesRepository,
    private readonly products: ProductsRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(actor: Actor, id: string, input: UpdateCategoryInput): Promise<CategoryResponse> {
    const { tenantId } = actor.access;
    let result;
    try {
      result = await this.tenantDb.transaction(tenantId, async (t) => {
        const row = await this.categories.lockById(tenantId, id, "update", t);
        if (!row) throw CatalogErrors.categoryNotFound();
        const count = (await this.products.countSellableByCategory(tenantId, t)).get(id) ?? 0;
        if (input.hidden === true && !row.hidden && count > 0) {
          throw CatalogErrors.categoryInUse(count);
        }
        const set = await this.changes(tenantId, row, input, t);
        if (Object.keys(set).length > 0) await this.categories.updateById(tenantId, id, set, t);
        const updated = (await this.categories.findById(tenantId, id, t))!;
        return { before: row, category: toCategory(updated, count), changed: Object.keys(set) };
      });
    } catch (err) {
      if (isUniqueViolation(err)) throw CatalogErrors.categoryExists();
      throw err;
    }
    if (result.changed.length > 0) {
      await this.audit.record({
        ...auditBase(actor),
        action: "product_category_updated",
        targetId: id,
        details: {
          before: pick(result.before, result.changed),
          after: pick(result.category, result.changed),
        },
      });
    }
    return { category: result.category };
  }

  private async changes(
    tenantId: string,
    row: CategoryRow,
    input: UpdateCategoryInput,
    t: Parameters<CategoriesRepository["findByNameKey"]>[2],
  ) {
    const set: Partial<
      Pick<CategoryRow, "name" | "nameKey" | "defaultTracking" | "namingMode" | "hidden">
    > = {};
    if (input.name !== undefined) {
      const name = cleanText(input.name);
      const nameKey = normalizeForCompare(name);
      if (name !== row.name) {
        const clash = await this.categories.findByNameKey(tenantId, nameKey, t);
        if (clash && clash.id !== row.id) throw CatalogErrors.categoryExists();
        set.name = name;
        set.nameKey = nameKey;
      }
    }
    if (input.defaultTracking !== undefined && input.defaultTracking !== row.defaultTracking) {
      set.defaultTracking = input.defaultTracking;
    }
    if (input.namingMode !== undefined && input.namingMode !== row.namingMode) {
      set.namingMode = input.namingMode;
    }
    if (input.hidden !== undefined && input.hidden !== row.hidden) set.hidden = input.hidden;
    return set;
  }
}

function pick(source: object, keys: string[]): Record<string, unknown> {
  const wanted = keys.filter((k) => k !== "nameKey");
  return Object.fromEntries(wanted.map((k) => [k, (source as Record<string, unknown>)[k]]));
}
