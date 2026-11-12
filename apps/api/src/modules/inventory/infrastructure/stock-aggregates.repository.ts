import { Injectable } from "@nestjs/common";
import { and, eq, inArray, ne, sql, type SQL } from "drizzle-orm";
import { isUuid } from "../../../common/database/uuid";
import { TenantDb, type TenantTx } from "../../../common/tenancy/tenant-db";
import { TenantScopedRepository } from "../../../common/tenancy/tenant-scoped.repository";
import { stockLayers } from "./tables/stock-layers.table";
import { stockUnits } from "./tables/stock-units.table";

/** Stock of one product at one location, calculated from layers and units (never typed). */
export interface StockAggregate {
  productId: string;
  locationId: string;
  /** Pieces that can be sold: quantity layers remaining + complete in_stock units. */
  onHand: number;
  /** Pieces received without their IMEI/serial yet. */
  incomplete: number;
  /** On-hand pieces whose cost is not known. */
  costMissing: number;
  /** Value at cost of the on-hand pieces whose cost is known. */
  valueCents: number;
}

export interface StockFilter {
  /** null = every location; an empty list = none (a person with no location). */
  locationIds: string[] | null;
  productIds?: string[];
}

const n = (v: string | number | null | undefined) => Number(v ?? 0);

/**
 * Read model over `stock_layers` and `stock_units` (ARCH-02 section 2.1): quantity goods
 * count their layers, IMEI/serial goods count their units. Three small queries, merged here.
 */
@Injectable()
export class StockAggregatesRepository extends TenantScopedRepository<typeof stockLayers> {
  constructor(tenantDb: TenantDb) {
    super(tenantDb, stockLayers);
  }

  async byProductLocation(
    tenantId: string,
    filter: StockFilter,
    within?: TenantTx,
  ): Promise<StockAggregate[]> {
    if (filter.locationIds && filter.locationIds.length === 0) return [];
    if (filter.productIds && filter.productIds.length === 0) return [];
    const layerFilters = this.filters(stockLayers, filter);
    const unitFilters = this.filters(stockUnits, filter);

    return this.run(
      tenantId,
      async (tx) => {
        const quantity = await tx
          .select({
            productId: stockLayers.productId,
            locationId: stockLayers.locationId,
            onHand: sql<string>`coalesce(sum(${stockLayers.remainingQuantity}), 0)`,
            costMissing: sql<string>`coalesce(sum(case when ${stockLayers.costTotalCents} is null then ${stockLayers.remainingQuantity} else 0 end), 0)`,
            value: sql<string>`coalesce(sum(round(${stockLayers.costTotalCents}::numeric * ${stockLayers.remainingQuantity} / ${stockLayers.receivedQuantity})), 0)`,
          })
          .from(stockLayers)
          .where(
            this.scope(tenantId, and(eq(stockLayers.trackingType, "quantity"), ...layerFilters)),
          )
          .groupBy(stockLayers.productId, stockLayers.locationId);

        const incomplete = await tx
          .select({
            productId: stockLayers.productId,
            locationId: stockLayers.locationId,
            missing: sql<string>`coalesce(sum(${stockLayers.receivedQuantity} - (select count(*) from stock_units su where su.tenant_id = stock_layers.tenant_id and su.layer_id = stock_layers.id)), 0)`,
          })
          .from(stockLayers)
          .where(
            this.scope(tenantId, and(ne(stockLayers.trackingType, "quantity"), ...layerFilters)),
          )
          .groupBy(stockLayers.productId, stockLayers.locationId);

        const units = await tx
          .select({
            productId: stockUnits.productId,
            locationId: stockUnits.locationId,
            onHand: sql<string>`count(*)`,
            costMissing: sql<string>`count(*) filter (where ${stockUnits.costCents} is null)`,
            value: sql<string>`coalesce(sum(${stockUnits.costCents}), 0)`,
          })
          .from(stockUnits)
          .where(
            and(
              eq(stockUnits.tenantId, tenantId),
              eq(stockUnits.status, "in_stock"),
              ...unitFilters,
            ),
          )
          .groupBy(stockUnits.productId, stockUnits.locationId);

        const map = new Map<string, StockAggregate>();
        const at = (productId: string, locationId: string) => {
          const key = `${productId}|${locationId}`;
          let row = map.get(key);
          if (!row) {
            row = {
              productId,
              locationId,
              onHand: 0,
              incomplete: 0,
              costMissing: 0,
              valueCents: 0,
            };
            map.set(key, row);
          }
          return row;
        };
        for (const r of quantity) {
          const row = at(r.productId, r.locationId);
          row.onHand += n(r.onHand);
          row.costMissing += n(r.costMissing);
          row.valueCents += n(r.value);
        }
        for (const r of units) {
          const row = at(r.productId, r.locationId);
          row.onHand += n(r.onHand);
          row.costMissing += n(r.costMissing);
          row.valueCents += n(r.value);
        }
        for (const r of incomplete) at(r.productId, r.locationId).incomplete += n(r.missing);
        return [...map.values()].filter((r) => r.onHand > 0 || r.incomplete > 0);
      },
      within,
    );
  }

  private filters(
    table: typeof stockLayers | typeof stockUnits,
    filter: StockFilter,
  ): (SQL | undefined)[] {
    const productIds = filter.productIds?.filter(isUuid);
    const locationIds = filter.locationIds?.filter(isUuid);
    return [
      locationIds ? inArray(table.locationId, locationIds) : undefined,
      productIds ? inArray(table.productId, productIds) : undefined,
    ];
  }
}
