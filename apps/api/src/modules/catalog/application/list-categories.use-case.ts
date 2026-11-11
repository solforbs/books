import { Injectable } from "@nestjs/common";
import type { CategoriesResponse } from "@books/shared";
import { TenantDb } from "../../../common/tenancy/tenant-db";
import type { TenantAccessContext } from "../../identity/domain/auth-context";
import { CategoriesRepository } from "../infrastructure/categories.repository";
import { ProductsRepository } from "../infrastructure/products.repository";
import { hasPermission } from "./access";
import { toCategory } from "./category-view";

/** `GET /product-categories` (any member; hidden categories only for manage_products). */
@Injectable()
export class ListCategoriesUseCase {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly categories: CategoriesRepository,
    private readonly products: ProductsRepository,
  ) {}

  execute(access: TenantAccessContext): Promise<CategoriesResponse> {
    const { tenantId } = access;
    return this.tenantDb.transaction(tenantId, async (t) => {
      const rows = await this.categories.all(tenantId, hasPermission(access, "manage_products"), t);
      const counts = await this.products.countSellableByCategory(tenantId, t);
      return { categories: rows.map((r) => toCategory(r, counts.get(r.id) ?? 0)) };
    });
  }
}
