import { Injectable } from "@nestjs/common";
import {
  cleanText,
  normalizeForCompare,
  type CategoryResponse,
  type createCategoryRequestSchema,
} from "@books/shared";
import type { z } from "zod";
import { isUniqueViolation } from "../../../common/database/pg-errors";
import { TenantDb } from "../../../common/tenancy/tenant-db";
import { AuditService } from "../../audit/application/audit.service";
import { auditBase, type Actor } from "../../identity/domain/actor";
import { CatalogErrors } from "../domain/catalog-errors";
import { CategoriesRepository } from "../infrastructure/categories.repository";
import { toCategory } from "./category-view";

export type CreateCategoryInput = z.output<typeof createCategoryRequestSchema>;

/**
 * `POST /product-categories` (manage_products). The name is unique in the business ignoring
 * capitals and spacing (`category_exists`).
 */
@Injectable()
export class CreateCategoryUseCase {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly categories: CategoriesRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(actor: Actor, input: CreateCategoryInput): Promise<CategoryResponse> {
    const { tenantId } = actor.access;
    const name = cleanText(input.name);
    const nameKey = normalizeForCompare(name);
    let row;
    try {
      row = await this.tenantDb.transaction(tenantId, async (t) => {
        if (await this.categories.findByNameKey(tenantId, nameKey, t)) {
          throw CatalogErrors.categoryExists();
        }
        return this.categories.create(
          tenantId,
          { name, nameKey, defaultTracking: input.defaultTracking, namingMode: input.namingMode },
          t,
        );
      });
    } catch (err) {
      if (isUniqueViolation(err)) throw CatalogErrors.categoryExists();
      throw err;
    }
    await this.audit.record({
      ...auditBase(actor),
      action: "product_category_created",
      targetId: row.id,
      details: {
        after: { name, defaultTracking: row.defaultTracking, namingMode: row.namingMode },
      },
    });
    return { category: toCategory(row, 0) };
  }
}
