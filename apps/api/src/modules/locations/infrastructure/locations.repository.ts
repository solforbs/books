import { Injectable } from "@nestjs/common";
import { and, asc, eq, inArray } from "drizzle-orm";
import { isUuid } from "../../../common/database/uuid";
import { TenantDb, type TenantTx } from "../../../common/tenancy/tenant-db";
import { TenantScopedRepository } from "../../../common/tenancy/tenant-scoped.repository";
import { locations } from "./tables/locations.table";

@Injectable()
export class LocationsRepository extends TenantScopedRepository<typeof locations> {
  constructor(tenantDb: TenantDb) {
    super(tenantDb, locations);
  }

  /** Every location of the business, oldest first. */
  all(tenantId: string, within?: TenantTx) {
    return this.find(tenantId, undefined, { orderBy: [asc(locations.createdAt)] }, within);
  }

  /** The open locations among `ids` (unknown or malformed ids are simply absent). */
  async findOpenByIds(tenantId: string, ids: string[], within?: TenantTx) {
    const valid = ids.filter(isUuid);
    if (valid.length === 0) return [];
    return this.find(
      tenantId,
      and(inArray(locations.id, valid), eq(locations.status, "open")),
      {},
      within,
    );
  }

  /**
   * Locks the business's open locations until the transaction ends and returns
   * their ids, so two closes at the same moment cannot leave none open.
   */
  lockOpen(tenantId: string, within: TenantTx): Promise<string[]> {
    return this.run(
      tenantId,
      async (tx) => {
        const rows = await tx
          .select({ id: locations.id })
          .from(locations)
          .where(this.scope(tenantId, eq(locations.status, "open")))
          .orderBy(asc(locations.id)) // one lock order for everyone: no deadlocks
          .for("update");
        return rows.map((r) => r.id);
      },
      within,
    );
  }

  /** Locks one location row for a read-check-write sequence. */
  async lockById(tenantId: string, id: string, within: TenantTx) {
    if (!isUuid(id)) return null;
    return this.run(
      tenantId,
      async (tx) => {
        const [row] = await tx
          .select()
          .from(locations)
          .where(this.scope(tenantId, eq(locations.id, id)))
          .for("update");
        return row ?? null;
      },
      within,
    );
  }
}
