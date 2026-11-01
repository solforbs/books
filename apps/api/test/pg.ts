import { randomBytes } from "node:crypto";
import { Client } from "pg";
import { inject } from "vitest";
import { APP_ROLE, OWNER_ROLE, createDatabase } from "../scripts/pg-provision.mjs";
import { runMigrations } from "../src/common/database/migrator";

export type PgRole = "admin" | "owner" | "app";

/** Connection URL for one of the three roles of the test server. */
export function pgUrl(role: PgRole, database: string): string {
  const s = inject("pg");
  const [user, password] = {
    admin: ["postgres", s.adminPassword],
    owner: [OWNER_ROLE, s.ownerPassword],
    app: [APP_ROLE, s.appPassword],
  }[role];
  return `postgres://${user}:${password}@${s.host}:${s.port}/${database}`;
}

/** A fresh database with every migration applied, as the API would leave it. */
export async function createMigratedTestDatabase(prefix = "books_test"): Promise<string> {
  const name = await createTestDatabase(prefix);
  await runMigrations(pgUrl("owner", name));
  return name;
}

/** A brand-new, empty database owned by books_owner (no migrations applied yet). */
export async function createTestDatabase(prefix = "books_test"): Promise<string> {
  const name = `${prefix}_${randomBytes(6).toString("hex")}`;
  const admin = new Client({ connectionString: pgUrl("admin", "postgres") });
  await admin.connect();
  try {
    await createDatabase(admin, name);
  } finally {
    await admin.end();
  }
  return name;
}
