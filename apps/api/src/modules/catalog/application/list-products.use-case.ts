import { Injectable } from "@nestjs/common";
import type { ProductsResponse } from "@books/shared";
import { TenantDb } from "../../../common/tenancy/tenant-db";
import { normalizeBarcode } from "@books/shared";
import {
  ProductsRepository,
  SELLABLE_STATUSES,
  type ProductSearch,
} from "../infrastructure/products.repository";
import type { ProductStatus } from "../infrastructure/tables/products.table";
import { ProductView } from "./product-view";

export interface ProductListQuery {
  q?: string;
  categoryId?: string;
  status?: ProductStatus;
  limit: number;
  cursor?: { nameKey: string; id: string };
}

export const encodeCursor = (nameKey: string, id: string) =>
  Buffer.from(JSON.stringify([nameKey, id])).toString("base64url");

/** `null` when the cursor is not one this API handed out. */
export function decodeCursor(raw: string): { nameKey: string; id: string } | null {
  try {
    const [nameKey, id] = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as unknown[];
    return typeof nameKey === "string" && typeof id === "string" ? { nameKey, id } : null;
  } catch {
    return null;
  }
}

/**
 * `GET /products`, `GET /products/waiting` and `GET /products/lookup` (any member; waiting
 * needs approve_items, checked by the controller). Without `status` only active and waiting
 * products are listed; hidden, merged and rejected ones only when asked for. Ordered by
 * name, paged by an opaque cursor.
 */
@Injectable()
export class ListProductsUseCase {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly products: ProductsRepository,
    private readonly view: ProductView,
  ) {}

  async list(tenantId: string, query: ProductListQuery): Promise<ProductsResponse> {
    const search: ProductSearch = {
      q: query.q,
      categoryId: query.categoryId,
      statuses: query.status ? [query.status] : SELLABLE_STATUSES,
      limit: query.limit,
      cursor: query.cursor,
    };
    return this.tenantDb.transaction(tenantId, async (t) => {
      const rows = await this.products.search(tenantId, search, t);
      const page = rows.slice(0, query.limit);
      const last = page[page.length - 1];
      return {
        products: await this.view.many(tenantId, page, t),
        nextCursor: rows.length > query.limit && last ? encodeCursor(last.nameKey, last.id) : null,
      };
    });
  }

  /** Every active or waiting product carrying this scanned code (several only for condition variants). */
  async lookup(tenantId: string, barcode: string): Promise<ProductsResponse> {
    const value = normalizeBarcode(barcode);
    return this.tenantDb.transaction(tenantId, async (t) => {
      const rows = value ? await this.products.findSellableByBarcode(tenantId, value, t) : [];
      return { products: await this.view.many(tenantId, rows, t), nextCursor: null };
    });
  }
}
