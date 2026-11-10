import { Injectable } from "@nestjs/common";
import { asc, eq } from "drizzle-orm";
import { isUuid } from "../../../common/database/uuid";
import { TenantDb, type TenantTx } from "../../../common/tenancy/tenant-db";
import { TenantScopedRepository } from "../../../common/tenancy/tenant-scoped.repository";
import { productCategories } from "./tables/product-categories.table";

@Injectable()
export class CategoriesRepository extends TenantScopedRepository<typeof productCategories> {
  constructor(tenantDb: TenantDb) {
    super(tenantDb, productCategories);
  }

  /** Every category, alphabetical; hidden ones only when asked for. */
  all(tenantId: string, includeHidden: boolean, within?: TenantTx) {
    return this.find(
      tenantId,
      includeHidden ? undefined : eq(productCategories.hidden, false),
      { orderBy: [asc(productCategories.nameKey)] },
      within,
    );
  }

  findByNameKey(tenantId: string, nameKey: string, within?: TenantTx) {
    return this.findOne(tenantId, eq(productCategories.nameKey, nameKey), within);
  }

  /**
   * Locks one category row. Hiding takes the exclusive lock, adding a product the shared
   * one, so a hide cannot slip past a product being added to the category at that moment.
   */
  async lockById(tenantId: string, id: string, mode: "update" | "share", within: TenantTx) {
    if (!isUuid(id)) return null;
    return this.run(
      tenantId,
      async (tx) => {
        const query = tx
          .select()
          .from(productCategories)
          .where(this.scope(tenantId, eq(productCategories.id, id)));
        const [row] = await (mode === "update" ? query.for("update") : query.for("share"));
        return row ?? null;
      },
      within,
    );
  }
}
