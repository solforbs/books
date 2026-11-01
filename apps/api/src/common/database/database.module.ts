import { Global, Inject, Logger, Module, OnApplicationShutdown } from "@nestjs/common";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { APP_CONFIG, type AppConfig } from "../../config/app-config";
import { assertRestrictedAppRole } from "./app-role-check";
import { DB, PG_POOL } from "./database.types";
import { runMigrations } from "./migrator";
import { TenantDb } from "../tenancy/tenant-db";

/** Connection settings for request traffic (the restricted app role). */
export function createPool(url: string): Pool {
  const pool = new Pool({
    connectionString: url,
    max: 10,
    // Fail requests when the database is unreachable instead of hanging (generous enough
    // for a burst of new SCRAM-authenticated connections on a busy machine).
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
    statement_timeout: 15_000,
    application_name: "books-api",
  });
  // An idle connection dropped by the server (restart, network) must not crash the API.
  pool.on("error", (err) => new Logger("Database").error(`idle client error: ${err.message}`));
  return pool;
}

/**
 * PostgreSQL via Drizzle. Before the pool is handed out, pending migrations are
 * applied as the table owner (DATABASE_MIGRATION_URL), then requests use the
 * restricted app role (DATABASE_URL), which must not bypass row-level security.
 */
@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [APP_CONFIG],
      useFactory: async (config: AppConfig): Promise<Pool> => {
        await runMigrations(config.DATABASE_MIGRATION_URL ?? config.DATABASE_URL, {
          // In development and production the database may still be starting.
          attempts: config.NODE_ENV === "test" ? 1 : 30,
        });
        const pool = createPool(config.DATABASE_URL);
        try {
          await assertRestrictedAppRole(pool, config.NODE_ENV === "production");
        } catch (err) {
          await pool.end();
          throw err;
        }
        return pool;
      },
    },
    { provide: DB, inject: [PG_POOL], useFactory: (pool: Pool) => drizzle(pool) },
    TenantDb,
  ],
  exports: [DB, PG_POOL, TenantDb],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
