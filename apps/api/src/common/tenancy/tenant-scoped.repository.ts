import {
  and,
  count,
  eq,
  sql,
  type InferInsertModel,
  type InferSelectModel,
  type SQL,
} from "drizzle-orm";
import type { AnyPgColumn, PgTable } from "drizzle-orm/pg-core";
import type { Tx } from "../database/database.types";
import { isUuid } from "../database/uuid";
import { assertTenantId, type TenantDb, type TenantTx } from "./tenant-db";

/** Every tenant-owned table has a uuid `id` and the business it belongs to. */
export type TenantTable = PgTable & { id: AnyPgColumn; tenantId: AnyPgColumn };
/** Insert shape without `tenantId`: the repository stamps it. */
export type TenantInsert<T extends TenantTable> = Omit<InferInsertModel<T>, "tenantId">;
/** Update shape: neither `id` nor `tenantId` can be set. */
export type TenantUpdate<T extends TenantTable> = Partial<
  Omit<InferInsertModel<T>, "tenantId" | "id">
>;

export interface FindOptions {
  orderBy?: SQL[];
  limit?: number;
  offset?: number;
}

/**
 * Base class for every repository of tenant-owned data (ARCH-01 §6 rule 4).
 *
 * Every method takes `tenantId` first. The query runs inside a TenantDb
 * transaction (so PostgreSQL row-level security sees the same business) and its
 * WHERE is always `tenant_id = <tenantId> AND (<caller's filter>)`: a caller's
 * filter can narrow but never widen the result, and an update can never move a
 * row to another business. There is deliberately no delete method (G4).
 */
export abstract class TenantScopedRepository<T extends TenantTable> {
  protected constructor(
    protected readonly tenantDb: TenantDb,
    protected readonly table: T,
  ) {}

  /** The table as Drizzle's query builders want it (generics stop at PgTable). */
  private get pgTable(): PgTable {
    return this.table;
  }

  /**
   * Runs `work` in the caller's tenant transaction (`within`), or in a new one.
   * A transaction opened for another business is refused.
   */
  protected async run<R>(
    tenantId: string,
    work: (tx: Tx) => Promise<R>,
    within?: TenantTx,
  ): Promise<R> {
    assertTenantId(tenantId);
    if (!within) return this.tenantDb.transaction(tenantId, (t) => work(t.tx));
    if (within.tenantId !== tenantId) throw new Error("transaction belongs to another tenant");
    return work(within.tx);
  }

  /** `tenant_id = $1 AND (filter)`. The parentheses keep a raw `x OR y` filter inside. */
  protected scope(tenantId: string, where?: SQL): SQL {
    const own = eq(this.table.tenantId, tenantId);
    return where ? and(own, sql`(${where})`)! : own;
  }

  async findById(tenantId: string, id: string, within?: TenantTx) {
    assertTenantId(tenantId);
    if (!isUuid(id)) return null;
    return this.findOne(tenantId, eq(this.table.id, id), within);
  }

  async findOne(
    tenantId: string,
    where?: SQL,
    within?: TenantTx,
  ): Promise<InferSelectModel<T> | null> {
    const rows = await this.find(tenantId, where, { limit: 1 }, within);
    return rows[0] ?? null;
  }

  find(
    tenantId: string,
    where?: SQL,
    opts: FindOptions = {},
    within?: TenantTx,
  ): Promise<InferSelectModel<T>[]> {
    return this.run(
      tenantId,
      async (tx) => {
        let query = tx.select().from(this.pgTable).where(this.scope(tenantId, where)).$dynamic();
        if (opts.orderBy?.length) query = query.orderBy(...opts.orderBy);
        if (opts.limit !== undefined) query = query.limit(opts.limit);
        if (opts.offset !== undefined) query = query.offset(opts.offset);
        return (await query) as InferSelectModel<T>[];
      },
      within,
    );
  }

  count(tenantId: string, where?: SQL, within?: TenantTx): Promise<number> {
    return this.run(
      tenantId,
      async (tx) => {
        const [row] = await tx
          .select({ n: count() })
          .from(this.pgTable)
          .where(this.scope(tenantId, where));
        return row?.n ?? 0;
      },
      within,
    );
  }

  create(
    tenantId: string,
    values: TenantInsert<T>,
    within?: TenantTx,
  ): Promise<InferSelectModel<T>> {
    return this.run(
      tenantId,
      async (tx) => {
        // Spread last: a tenantId smuggled into `values` is overwritten.
        const row = { ...values, tenantId } as InferInsertModel<T>;
        const [created] = await tx.insert(this.pgTable).values(row).returning();
        return created as InferSelectModel<T>;
      },
      within,
    );
  }

  /** Returns the number of rows changed. Throws if `set` would touch `id` or `tenantId`. */
  async update(
    tenantId: string,
    where: SQL,
    set: TenantUpdate<T>,
    within?: TenantTx,
  ): Promise<number> {
    assertTenantIdUntouched(this.table, set);
    return this.run(
      tenantId,
      async (tx) => {
        const changed = await tx
          .update(this.pgTable)
          .set(set as Record<string, unknown>)
          .where(this.scope(tenantId, where))
          .returning({ id: this.table.id });
        return changed.length;
      },
      within,
    );
  }
}

/**
 * Refuses (rather than silently drops) an update that names `tenantId` or `id`,
 * or any property mapped to the `tenant_id` column, even when the types were
 * bypassed with a cast.
 */
export function assertTenantIdUntouched(table: TenantTable, set: object): void {
  for (const key of Object.keys(set)) {
    const column = (table as unknown as Record<string, { name?: unknown } | undefined>)[key];
    if (key === "tenantId" || column?.name === "tenant_id") {
      throw new Error("tenantId cannot be changed");
    }
    if (key === "id") throw new Error("id cannot be changed");
  }
}
