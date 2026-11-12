import { Injectable } from "@nestjs/common";
import type { StockResponse, StockRow } from "@books/shared";
import { isUuid } from "../../../common/database/uuid";
import { TenantDb } from "../../../common/tenancy/tenant-db";
import { ProductDirectory } from "../../catalog/application/product-directory";
import type { TenantAccessContext } from "../../identity/domain/auth-context";
import { LocationsService } from "../../locations/application/locations.service";
import { locationScopeOf } from "../../locations/domain/location-scope";
import { assertCanReadStock, canSeeStockCosts } from "./stock-access";
import { StockService } from "./stock.service";

export interface StockCursor {
  nameKey: string;
  productId: string;
  locationName: string;
  locationId: string;
}

export interface StockQuery {
  locationId?: string;
  categoryId?: string;
  q?: string;
  limit: number;
  cursor?: StockCursor;
}

export const encodeStockCursor = (c: StockCursor) =>
  Buffer.from(JSON.stringify([c.nameKey, c.productId, c.locationName, c.locationId])).toString(
    "base64url",
  );

/** `null` when the cursor is not one this API handed out. */
export function decodeStockCursor(raw: string): StockCursor | null {
  try {
    const [nameKey, productId, locationName, locationId] = JSON.parse(
      Buffer.from(raw, "base64url").toString("utf8"),
    ) as unknown[];
    return typeof nameKey === "string" &&
      isUuid(productId) &&
      typeof locationName === "string" &&
      isUuid(locationId)
      ? { nameKey, productId, locationName, locationId }
      : null;
  } catch {
    return null;
  }
}

/** Orders two keys part by part (plain string comparison, the same for every request). */
const compare = (a: string[], b: string[]): number => {
  for (const [i, x] of a.entries()) {
    const y = b[i]!;
    if (x < y) return -1;
    if (x > y) return 1;
  }
  return 0;
};

type KeyedRow = StockRow & { nameKey: string };
const keyOf = (r: KeyedRow) => [r.nameKey, r.productId, r.locationName, r.locationId];

/**
 * `GET /stock` (receive_stock, manage_products or view_reports): one row per product and
 * location that has stock or units waiting for their IMEI, ordered by product name, then
 * location name. Stock is calculated from layers and units; the value is null without
 * see_cost_profit. The list is put together in memory from the stock rows and the matching
 * products (open question: fine for some thousands of rows, not for a very large catalogue).
 */
@Injectable()
export class ListStockUseCase {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly stock: StockService,
    private readonly products: ProductDirectory,
    private readonly locations: LocationsService,
  ) {}

  async execute(access: TenantAccessContext, query: StockQuery): Promise<StockResponse> {
    assertCanReadStock(access);
    const { tenantId } = access;
    const scope = locationScopeOf(access);
    const showCost = canSeeStockCosts(access);
    return this.tenantDb.transaction(tenantId, async (t) => {
      const names = await this.locations.visibleNames(tenantId, scope, t);
      let locationIds = [...names.keys()];
      if (query.locationId) locationIds = locationIds.filter((id) => id === query.locationId);
      const aggregates = await this.stock.stockRows(
        tenantId,
        { locationIds: scope === null && !query.locationId ? null : locationIds },
        t,
      );
      const products = await this.products.matchingAmong(
        tenantId,
        [...new Set(aggregates.map((a) => a.productId))],
        { q: query.q, categoryId: query.categoryId },
        t,
      );
      const rows: KeyedRow[] = [];
      for (const product of products) {
        const own = aggregates
          .filter((a) => a.productId === product.id)
          .map((a) => ({ a, locationName: names.get(a.locationId) ?? "" }))
          .sort((x, y) =>
            compare([x.locationName, x.a.locationId], [y.locationName, y.a.locationId]),
          );
        for (const { a, locationName } of own) {
          rows.push({
            nameKey: product.nameKey,
            productId: product.id,
            productName: product.name,
            categoryId: product.categoryId,
            trackingType: product.trackingType,
            locationId: a.locationId,
            locationName,
            onHand: a.onHand,
            incomplete: a.incomplete,
            costMissing: a.costMissing,
            valueCents: showCost ? a.valueCents : null,
          });
        }
      }
      const c = query.cursor;
      const after = c
        ? rows.filter(
            (r) => compare(keyOf(r), [c.nameKey, c.productId, c.locationName, c.locationId]) > 0,
          )
        : rows;
      const page = after.slice(0, query.limit);
      const last = page[page.length - 1];
      return {
        rows: page.map(({ nameKey: _key, ...row }) => row),
        nextCursor:
          after.length > query.limit && last
            ? encodeStockCursor({
                nameKey: last.nameKey,
                productId: last.productId,
                locationName: last.locationName,
                locationId: last.locationId,
              })
            : null,
      };
    });
  }
}
