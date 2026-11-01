import { Inject, Injectable } from "@nestjs/common";
import { sql } from "drizzle-orm";
import { DB, type Database, type Tx } from "../database/database.types";
import { isUuid } from "../database/uuid";

/** A transaction bound to one business: `app.tenant_id` is set for its lifetime. */
export interface TenantTx {
  readonly tenantId: string;
  readonly tx: Tx;
}

export function assertTenantId(tenantId: unknown): asserts tenantId is string {
  if (!isUuid(tenantId)) throw new Error("tenantId is required");
}

/**
 * Opens transactions for tenant-owned data. Each one starts with
 * `set_config('app.tenant_id', <id>, true)` (the parameterised form of
 * `SET LOCAL app.tenant_id`), which the row-level-security policy
 * `tenant_isolation` compares every row against. Being transaction-local, the
 * setting can never leak to the next request that reuses the pooled connection.
 */
@Injectable()
export class TenantDb {
  constructor(@Inject(DB) private readonly db: Database) {}

  async transaction<R>(tenantId: string, work: (t: TenantTx) => Promise<R>): Promise<R> {
    assertTenantId(tenantId);
    return this.db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantId}, true)`);
      return work(Object.freeze({ tenantId, tx }));
    });
  }
}
