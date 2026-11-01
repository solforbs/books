import { resolve } from "node:path";
import { Logger } from "@nestjs/common";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";

/** `apps/api/drizzle`, from both `src/common/database` and `dist/common/database`. */
export const MIGRATIONS_FOLDER = resolve(__dirname, "../../../drizzle");

/** Any constant works; it only has to be the same for every API instance. */
const MIGRATION_LOCK_KEY = 4_242_001;

export interface MigrateOptions {
  /** Connection attempts before giving up (the database may still be starting). */
  attempts?: number;
  delayMs?: number;
  migrationsFolder?: string;
}

const logger = new Logger("Migrations");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function connect(url: string, attempts: number, delayMs: number): Promise<Client> {
  for (let attempt = 1; ; attempt++) {
    const client = new Client({ connectionString: url, connectionTimeoutMillis: 5_000 });
    try {
      await client.connect();
      return client;
    } catch (err) {
      await client.end().catch(() => undefined);
      if (attempt >= attempts) throw err;
      logger.warn(`database not reachable yet (attempt ${attempt}/${attempts}), retrying`);
      await sleep(delayMs);
    }
  }
}

/**
 * Applies pending migrations from `apps/api/drizzle` as the table owner. A
 * session-level advisory lock makes concurrent API instances wait for each
 * other instead of migrating at the same time; Drizzle runs all pending
 * migrations in one transaction and records them in `drizzle.__drizzle_migrations`.
 */
export async function runMigrations(url: string, opts: MigrateOptions = {}): Promise<void> {
  const client = await connect(url, opts.attempts ?? 1, opts.delayMs ?? 2_000);
  try {
    await client.query("select pg_advisory_lock($1)", [MIGRATION_LOCK_KEY]);
    try {
      await migrate(drizzle(client), {
        migrationsFolder: opts.migrationsFolder ?? MIGRATIONS_FOLDER,
      });
    } finally {
      await client.query("select pg_advisory_unlock($1)", [MIGRATION_LOCK_KEY]);
    }
  } finally {
    await client.end();
  }
}
