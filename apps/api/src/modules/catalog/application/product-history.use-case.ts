import { Injectable } from "@nestjs/common";
import type { ProductHistoryResponse } from "@books/shared";
import { TenantDb } from "../../../common/tenancy/tenant-db";
import { MembersService } from "../../identity/application/members.service";
import type { Actor } from "../../identity/domain/actor";
import { CatalogErrors } from "../domain/catalog-errors";
import { PRICE_FIELDS } from "../domain/product-changes";
import { HistoryRepository } from "../infrastructure/history.repository";
import { ProductsRepository } from "../infrastructure/products.repository";
import { assertPermission, hasPermission } from "./access";

/**
 * `GET /products/:id/history` (manage_products): who changed what, from what to what, when,
 * newest first (F01 §10). Entries about prices are shown only to people who may set prices
 * ("price history is visible to the owner").
 */
@Injectable()
export class ProductHistoryUseCase {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly products: ProductsRepository,
    private readonly history: HistoryRepository,
    private readonly members: MembersService,
  ) {}

  async execute(actor: Actor, id: string): Promise<ProductHistoryResponse> {
    const { tenantId } = actor.access;
    assertPermission(actor.access, "manage_products");
    const seesPrices = hasPermission(actor.access, "set_prices");
    const product = await this.tenantDb.transaction(tenantId, (t) =>
      this.products.findById(tenantId, id, t),
    );
    if (!product) throw CatalogErrors.productNotFound();
    const rows = await this.history.forProduct(tenantId, id);
    const names = await this.members.namesOf(rows.map((r) => r.byUserId));
    return {
      entries: rows
        .filter((r) => seesPrices || !r.field || !PRICE_FIELDS.includes(r.field))
        .map((r) => ({
          at: r.at.toISOString(),
          by: { id: r.byUserId, name: names.get(r.byUserId) ?? "" },
          action: r.action,
          field: r.field,
          before: r.before,
          after: r.after,
        })),
    };
  }
}
