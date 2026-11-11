import { Injectable } from "@nestjs/common";
import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNotNull,
  notInArray,
  sql,
  type SQL,
} from "drizzle-orm";
import { isUuid } from "../../../common/database/uuid";
import { TenantDb, type TenantTx } from "../../../common/tenancy/tenant-db";
import { TenantScopedRepository } from "../../../common/tenancy/tenant-scoped.repository";
import type { SimilarityCandidate } from "../domain/similarity";
import { productBarcodes } from "./tables/product-barcodes.table";
import { productCategories } from "./tables/product-categories.table";
import { products, type ProductRow, type ProductStatus } from "./tables/products.table";

export const LIVE_STATUSES: ProductStatus[] = ["waiting", "active", "hidden"];
/** Products that can be received and sold. */
export const SELLABLE_STATUSES: ProductStatus[] = ["waiting", "active"];

export interface ProductSearch {
  q?: string;
  categoryId?: string;
  statuses: ProductStatus[];
  limit: number;
  cursor?: { nameKey: string; id: string };
}

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

@Injectable()
export class ProductsRepository extends TenantScopedRepository<typeof products> {
  constructor(tenantDb: TenantDb) {
    super(tenantDb, products);
  }

  /** Locks one product row for a read-check-write sequence. */
  async lockById(tenantId: string, id: string, within: TenantTx) {
    if (!isUuid(id)) return null;
    return this.run(
      tenantId,
      async (tx) => {
        const [row] = await tx
          .select()
          .from(products)
          .where(this.scope(tenantId, eq(products.id, id)))
          .for("update");
        return row ?? null;
      },
      within,
    );
  }

  /** Locks several products in one fixed order (no deadlock between two merges). */
  async lockMany(tenantId: string, ids: string[], within: TenantTx): Promise<ProductRow[]> {
    const valid = ids.filter(isUuid);
    if (valid.length === 0) return [];
    return this.run(
      tenantId,
      (tx) =>
        tx
          .select()
          .from(products)
          .where(this.scope(tenantId, inArray(products.id, valid)))
          .orderBy(asc(products.id))
          .for("update"),
      within,
    );
  }

  findManyByIds(tenantId: string, ids: string[], within?: TenantTx) {
    const valid = ids.filter(isUuid);
    if (valid.length === 0) return Promise.resolve([]);
    return this.find(tenantId, inArray(products.id, valid), {}, within);
  }

  /** The live product (not merged or rejected) carrying this duplicate key. */
  findLiveByDuplicateKey(tenantId: string, key: string, within?: TenantTx) {
    return this.findOne(
      tenantId,
      and(eq(products.duplicateKey, key), notInArray(products.status, ["merged", "rejected"])),
      within,
    );
  }

  /** Light rows of every live product, for the similar-name check. */
  similarityPool(tenantId: string, within?: TenantTx): Promise<SimilarityCandidate[]> {
    return this.run(
      tenantId,
      (tx) =>
        tx
          .select({
            id: products.id,
            name: products.name,
            namingMode: productCategories.namingMode,
            brand: products.brand,
            model: products.model,
            storage: products.storage,
            colour: products.colour,
            condition: products.condition,
          })
          .from(products)
          .innerJoin(
            productCategories,
            and(
              eq(productCategories.tenantId, products.tenantId),
              eq(productCategories.id, products.categoryId),
            ),
          )
          .where(this.scope(tenantId, inArray(products.status, LIVE_STATUSES))),
      within,
    );
  }

  /** Active and waiting products of a category (what blocks hiding the category). */
  async countSellableByCategory(tenantId: string, within?: TenantTx): Promise<Map<string, number>> {
    const rows = await this.run(
      tenantId,
      (tx) =>
        tx
          .select({ categoryId: products.categoryId, n: count() })
          .from(products)
          .where(this.scope(tenantId, inArray(products.status, SELLABLE_STATUSES)))
          .groupBy(products.categoryId),
      within,
    );
    return new Map(rows.map((r) => [r.categoryId, r.n]));
  }

  /** One page of the product list, ordered by name. Fetches `limit + 1` to detect a next page. */
  search(tenantId: string, query: ProductSearch, within?: TenantTx): Promise<ProductRow[]> {
    const filters: SQL[] = [inArray(products.status, query.statuses)];
    if (query.categoryId) filters.push(eq(products.categoryId, query.categoryId));
    for (const token of searchTokens(query.q)) filters.push(matchesToken(token));
    if (query.cursor) {
      filters.push(
        sql`(${products.nameKey}, ${products.id}) > (${query.cursor.nameKey}, ${query.cursor.id}::uuid)`,
      );
    }
    return this.find(
      tenantId,
      and(...filters),
      { orderBy: [asc(products.nameKey), asc(products.id)], limit: query.limit + 1 },
      within,
    );
  }

  /** Distinct typed values with how often they are used, most used first (for suggestions). */
  async distinctValues(
    tenantId: string,
    column: "brand" | "storage" | "colour" | "condition",
  ): Promise<string[]> {
    const col = products[column];
    const rows = await this.run(tenantId, (tx) =>
      tx
        .select({ value: col, n: count() })
        .from(products)
        .where(this.scope(tenantId, and(isNotNull(col), notInArray(products.status, ["rejected"]))))
        .groupBy(col)
        .orderBy(desc(count()), asc(col))
        .limit(500),
    );
    return rows.map((r) => r.value!);
  }

  async distinctModels(tenantId: string): Promise<{ brand: string | null; model: string }[]> {
    const rows = await this.run(tenantId, (tx) =>
      tx
        .select({ brand: products.brand, model: products.model, n: count() })
        .from(products)
        .where(
          this.scope(
            tenantId,
            and(isNotNull(products.model), notInArray(products.status, ["rejected"])),
          ),
        )
        .groupBy(products.brand, products.model)
        .orderBy(desc(count()), asc(products.model))
        .limit(500),
    );
    return rows.map((r) => ({ brand: r.brand, model: r.model! }));
  }

  /** Active and waiting products that carry any of these barcodes (scan lookup). */
  findSellableByBarcode(tenantId: string, value: string, within?: TenantTx) {
    return this.find(
      tenantId,
      and(
        inArray(products.status, SELLABLE_STATUSES),
        sql`exists (select 1 from ${productBarcodes} b where b.tenant_id = ${products.tenantId} and b.product_id = ${products.id} and b.active and b.value = ${value})`,
      ),
      { orderBy: [asc(products.nameKey), asc(products.id)] },
      within,
    );
  }
}

/** Words of the search box: normalised like names, at most 8, each must match somewhere. */
export function searchTokens(q: string | undefined): string[] {
  return (q ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 8);
}

function matchesToken(token: string): SQL {
  const like = `%${escapeLike(token)}%`;
  return sql`(${products.nameKey} like ${like}
    or lower(coalesce(${products.brand}, '')) like ${like}
    or lower(coalesce(${products.model}, '')) like ${like}
    or exists (select 1 from ${productBarcodes} b where b.tenant_id = ${products.tenantId}
      and b.product_id = ${products.id} and b.active and lower(b.value) like ${like}))`;
}
