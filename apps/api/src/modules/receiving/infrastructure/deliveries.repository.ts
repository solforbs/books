import { Injectable } from "@nestjs/common";
import { and, desc, eq, inArray, lt, sql, type SQL } from "drizzle-orm";
import { TenantDb, type TenantTx } from "../../../common/tenancy/tenant-db";
import { TenantScopedRepository } from "../../../common/tenancy/tenant-scoped.repository";
import { deliveries, type DeliveryRow } from "./tables/deliveries.table";

export interface DeliverySearch {
  /** null = every location (owner); a list = only these (empty = none). */
  locationIds: string[] | null;
  supplierId?: string;
  locationId?: string;
  /** Calendar dates in Kenya time, inclusive. */
  from?: string;
  to?: string;
  limit: number;
  /** The delivery number of the last row of the previous page. */
  before?: number;
}

const KENYA_DAY = sql`(${deliveries.createdAt} at time zone 'Africa/Nairobi')::date`;

@Injectable()
export class DeliveriesRepository extends TenantScopedRepository<typeof deliveries> {
  constructor(tenantDb: TenantDb) {
    super(tenantDb, deliveries);
  }

  /**
   * The next running number of the business. Takes a per-business advisory lock until the
   * transaction ends, so two deliveries saved at once cannot get the same number.
   */
  async nextNumber(tenantId: string, within: TenantTx): Promise<number> {
    return this.run(
      tenantId,
      async (tx) => {
        await tx.execute(
          sql`select pg_advisory_xact_lock(hashtextextended(${`delivery-number:${tenantId}`}, 0))`,
        );
        const [row] = await tx
          .select({ max: sql<number>`coalesce(max(${deliveries.number}), 0)` })
          .from(deliveries)
          .where(eq(deliveries.tenantId, tenantId));
        return Number(row?.max ?? 0) + 1;
      },
      within,
    );
  }

  /** One page, newest first (highest number first). Fetches `limit + 1` to detect a next page. */
  search(tenantId: string, query: DeliverySearch, within?: TenantTx): Promise<DeliveryRow[]> {
    const filters: SQL[] = [];
    if (query.locationIds) {
      if (query.locationIds.length === 0) return Promise.resolve([]);
      filters.push(inArray(deliveries.locationId, query.locationIds));
    }
    if (query.supplierId) filters.push(eq(deliveries.supplierId, query.supplierId));
    if (query.locationId) filters.push(eq(deliveries.locationId, query.locationId));
    if (query.from) filters.push(sql`${KENYA_DAY} >= ${query.from}::date`);
    if (query.to) filters.push(sql`${KENYA_DAY} <= ${query.to}::date`);
    if (query.before !== undefined) filters.push(lt(deliveries.number, query.before));
    return this.find(
      tenantId,
      filters.length ? and(...filters) : undefined,
      { orderBy: [desc(deliveries.number)], limit: query.limit + 1 },
      within,
    );
  }
}
