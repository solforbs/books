import { Injectable } from "@nestjs/common";
import { and, asc, desc, eq, inArray, or, sql, type SQL } from "drizzle-orm";
import { isUuid } from "../../../common/database/uuid";
import { TenantDb, type TenantTx } from "../../../common/tenancy/tenant-db";
import {
  TenantScopedRepository,
  type TenantInsert,
} from "../../../common/tenancy/tenant-scoped.repository";
import { stockUnits, type StockUnitRow } from "./tables/stock-units.table";

@Injectable()
export class StockUnitsRepository extends TenantScopedRepository<typeof stockUnits> {
  constructor(tenantDb: TenantDb) {
    super(tenantDb, stockUnits);
  }

  /** Units of these layers, in the order they were registered. */
  forLayers(tenantId: string, layerIds: string[], within?: TenantTx): Promise<StockUnitRow[]> {
    const valid = layerIds.filter(isUuid);
    if (valid.length === 0) return Promise.resolve([]);
    return this.find(
      tenantId,
      inArray(stockUnits.layerId, valid),
      { orderBy: [asc(stockUnits.createdAt), asc(stockUnits.id)] },
      within,
    );
  }

  /**
   * Serialises two requests that receive unit numbers in the same business: ONE advisory lock
   * per business, held until the transaction ends. A lock per IMEI would need thousands of
   * lock slots for a big delivery and can exhaust the PostgreSQL lock table. The partial unique
   * indexes stay as the second guard.
   */
  async lockUnitNumbers(tenantId: string, within: TenantTx): Promise<void> {
    await within.tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`unit-numbers:${tenantId}`}, 0))`,
    );
  }

  /** Inserts many units in a few statements (chunks keep the parameter count low). */
  async createMany(
    tenantId: string,
    rows: TenantInsert<typeof stockUnits>[],
    within: TenantTx,
  ): Promise<StockUnitRow[]> {
    const created: StockUnitRow[] = [];
    for (let i = 0; i < rows.length; i += 1000) {
      const chunk = rows.slice(i, i + 1000).map((r) => ({ ...r, tenantId }));
      created.push(
        ...(await this.run(
          tenantId,
          (tx) => tx.insert(stockUnits).values(chunk).returning(),
          within,
        )),
      );
    }
    return created;
  }

  /**
   * Existing units (any status) that carry one of these IMEIs in either IMEI field, or one of
   * these serials for this product.
   */
  findByNumbers(
    tenantId: string,
    productId: string,
    imeis: string[],
    serials: string[],
    within?: TenantTx,
  ): Promise<StockUnitRow[]> {
    const parts: SQL[] = [];
    if (imeis.length > 0) {
      parts.push(inArray(stockUnits.imei, imeis), inArray(stockUnits.imei2, imeis));
    }
    if (serials.length > 0) {
      parts.push(and(eq(stockUnits.productId, productId), inArray(stockUnits.serial, serials))!);
    }
    if (parts.length === 0) return Promise.resolve([]);
    return this.find(tenantId, or(...parts), {}, within);
  }

  /** Every unit in the business that has this number as IMEI, second IMEI or serial. */
  lookup(tenantId: string, candidates: string[], within?: TenantTx): Promise<StockUnitRow[]> {
    if (candidates.length === 0) return Promise.resolve([]);
    return this.find(
      tenantId,
      or(
        inArray(stockUnits.imei, candidates),
        inArray(stockUnits.imei2, candidates),
        inArray(stockUnits.serial, candidates),
      ),
      { orderBy: [desc(stockUnits.createdAt), desc(stockUnits.id)], limit: 50 },
      within,
    );
  }

  /** Sets the cost of many units at once (each only once: the database refuses a change). */
  async setCosts(
    tenantId: string,
    costs: { id: string; costCents: number }[],
    within: TenantTx,
  ): Promise<void> {
    if (costs.length === 0) return;
    const values = sql.join(
      costs.map((c) => sql`(${c.id}::uuid, ${c.costCents}::bigint)`),
      sql`, `,
    );
    await this.run(
      tenantId,
      async (tx) => {
        await tx.execute(sql`update stock_units u set cost_cents = v.cost, updated_at = now()
          from (values ${values}) as v(id, cost)
          where u.id = v.id and u.tenant_id = ${tenantId}::uuid`);
      },
      within,
    );
  }
}
