import { Injectable } from "@nestjs/common";
import type { ProductResponse } from "@books/shared";
import { TenantDb } from "../../../common/tenancy/tenant-db";
import type { TenantAccessContext } from "../../identity/domain/auth-context";
import { CatalogErrors } from "../domain/catalog-errors";
import { ProductsRepository } from "../infrastructure/products.repository";
import { ProductView } from "./product-view";

/** `GET /products/:id` (any member): a product in any status, so old links keep working. */
@Injectable()
export class GetProductUseCase {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly products: ProductsRepository,
    private readonly view: ProductView,
  ) {}

  execute(access: TenantAccessContext, id: string): Promise<ProductResponse> {
    return this.tenantDb.transaction(access.tenantId, async (t) => {
      const row = await this.products.findById(access.tenantId, id, t);
      if (!row) throw CatalogErrors.productNotFound();
      return { product: await this.view.one(access, row, t) };
    });
  }
}
