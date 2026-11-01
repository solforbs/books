import type { NodePgDatabase } from "drizzle-orm/node-postgres";

/** Injection token for the Drizzle database (connected as the restricted app role). */
export const DB = Symbol("DB");
/** Injection token for the underlying `pg` connection pool. */
export const PG_POOL = Symbol("PG_POOL");

export type Database = NodePgDatabase;
/** The handle Drizzle passes to a `db.transaction(async (tx) => ...)` callback. */
export type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
/** Repositories accept either, so callers can enlist them in a transaction. */
export type Executor = Database | Tx;
