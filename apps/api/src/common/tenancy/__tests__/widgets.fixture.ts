import { bigint, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { Pool } from "pg";
import type { Cents } from "@books/shared";
import { createMigratedTestDatabase, pgUrl, type PgRole } from "../../../../test/pg";

/**
 * A demo tenant-owned table, created in tests only (no real business table
 * exists yet). `widgets` gets row-level security exactly the way a production
 * migration would (`enable_tenant_rls`); `widgets_no_rls` is identical without
 * it, to prove the repository guard works on its own as well.
 */
const columns = () => ({
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  name: text("name").notNull(),
  priceCents: bigint("price_cents", { mode: "number" }).$type<Cents>().notNull(),
});
export const widgets = pgTable("widgets", columns());
export const widgetsNoRls = pgTable("widgets_no_rls", columns());
export type WidgetTable = typeof widgets | typeof widgetsNoRls;

const SETUP_SQL = `
  create table widgets (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null,
    name text not null,
    price_cents bigint not null
  );
  create table widgets_no_rls (like widgets including all);
  select enable_tenant_rls('widgets');
  grant select, insert, update on widgets, widgets_no_rls to books_app;
`;

export interface WidgetsDb {
  database: string;
  pool: (role: PgRole, max?: number) => Pool;
  close: () => Promise<void>;
}

/** A migrated database with the demo tables, created by the table owner. */
export async function createWidgetsDb(): Promise<WidgetsDb> {
  const database = await createMigratedTestDatabase("books_tenancy");
  const pools: Pool[] = [];
  const pool = (role: PgRole, max = 4) => {
    const p = new Pool({ connectionString: pgUrl(role, database), max });
    pools.push(p);
    return p;
  };
  await pool("owner", 1).query(SETUP_SQL);
  return { database, pool, close: async () => void (await Promise.all(pools.map((p) => p.end()))) };
}
